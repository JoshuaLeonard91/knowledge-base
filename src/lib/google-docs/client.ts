/**
 * Google Docs API Client
 *
 * Fetches documents from Google Docs API and converts them to articles.
 * Uses API key for public documents or service account for private docs.
 *
 * Required environment variables:
 * - GOOGLE_API_KEY: API key for accessing public Google Docs
 * - GOOGLE_DOCS_INDEX_SHEET_ID: Google Sheet ID containing article index
 *
 * Optional (for private documents):
 * - GOOGLE_SERVICE_ACCOUNT_EMAIL: Service account email
 * - GOOGLE_SERVICE_ACCOUNT_KEY: Service account private key (base64 encoded)
 */

import {
  GoogleDoc,
  StructuralElement,
  Paragraph,
  ParagraphElement,
  TextRun,
  ArticleIndexEntry,
} from './types';

const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || '';
const GOOGLE_DOCS_INDEX_SHEET_ID = process.env.GOOGLE_DOCS_INDEX_SHEET_ID || '';
const DOCS_API_BASE = 'https://docs.googleapis.com/v1/documents';
const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

class GoogleDocsClient {
  private apiKey: string;
  private indexSheetId: string;
  private isConfigured: boolean;

  constructor() {
    this.apiKey = GOOGLE_API_KEY;
    this.indexSheetId = GOOGLE_DOCS_INDEX_SHEET_ID;
    this.isConfigured = Boolean(GOOGLE_API_KEY);
  }

  /**
   * Check if Google Docs is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Fetch a Google Doc by ID
   */
  async getDocument(documentId: string): Promise<GoogleDoc | null> {
    if (!this.isConfigured) {
      console.log('[GoogleDocs] Not configured, using local fallback');
      return null;
    }

    try {
      const url = `${DOCS_API_BASE}/${documentId}?key=${this.apiKey}`;
      const response = await fetch(url, {
        next: { revalidate: 60 }, // Cache for 60 seconds
      });

      if (!response.ok) {
        console.error(`[GoogleDocs] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[GoogleDocs] Fetch error:', error);
      return null;
    }
  }

  /**
   * Fetch article index from Google Sheets
   * Sheet format: documentId | slug | title | category | excerpt | icon | keywords | published
   */
  async getArticleIndex(): Promise<ArticleIndexEntry[]> {
    if (!this.isConfigured || !this.indexSheetId) {
      console.log('[GoogleDocs] Index sheet not configured');
      return [];
    }

    try {
      const range = 'Articles!A2:H'; // Skip header row
      const url = `${SHEETS_API_BASE}/${this.indexSheetId}/values/${encodeURIComponent(range)}?key=${this.apiKey}`;

      const response = await fetch(url, {
        next: { revalidate: 60 },
      });

      if (!response.ok) {
        console.error(`[GoogleDocs] Sheets API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      const rows = data.values || [];

      return rows
        .map((row: string[]): ArticleIndexEntry | null => {
          const [documentId, slug, title, category, excerpt, icon, keywords, published] = row;

          if (!documentId || !slug || published?.toLowerCase() === 'false') {
            return null;
          }

          return {
            documentId,
            slug,
            title: title || 'Untitled',
            category: category || 'faq',
            excerpt: excerpt || '',
            icon: icon || 'Article',
            keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
            published: published?.toLowerCase() !== 'false',
          };
        })
        .filter((entry: ArticleIndexEntry | null): entry is ArticleIndexEntry => entry !== null);
    } catch (error) {
      console.error('[GoogleDocs] Error fetching index:', error);
      return [];
    }
  }

  /**
   * Convert Google Doc content to plain text
   */
  extractText(doc: GoogleDoc): string {
    const content = doc.body.content;
    return content.map(element => this.extractElementText(element)).join('');
  }

  /**
   * Convert Google Doc content to markdown
   * Images are converted to proxy URLs that cache the images server-side
   */
  toMarkdown(doc: GoogleDoc): string {
    const content = doc.body.content;
    const lines: string[] = [];
    let inList = false;

    for (const element of content) {
      if (element.paragraph) {
        const paragraph = element.paragraph;
        const formattedContent = this.formatParagraphMarkdown(paragraph, doc);

        // Check if paragraph only contains an image
        const isImageOnly = paragraph.elements.length === 1 &&
          paragraph.elements[0].inlineObjectElement &&
          !paragraph.elements[0].textRun;

        if (isImageOnly) {
          if (inList) {
            lines.push('');
            inList = false;
          }
          lines.push(formattedContent);
          lines.push('');
          continue;
        }

        const text = this.extractParagraphText(paragraph);

        if (!text.trim() && !formattedContent.includes('![')) {
          if (inList) {
            inList = false;
          }
          lines.push('');
          continue;
        }

        // Check for headings
        const styleType = paragraph.paragraphStyle?.namedStyleType;

        if (styleType?.startsWith('HEADING_')) {
          const level = parseInt(styleType.replace('HEADING_', ''));
          const prefix = '#'.repeat(level);
          lines.push(`${prefix} ${text}`);
          lines.push('');
          continue;
        }

        if (styleType === 'TITLE') {
          lines.push(`# ${text}`);
          lines.push('');
          continue;
        }

        if (styleType === 'SUBTITLE') {
          lines.push(`## ${text}`);
          lines.push('');
          continue;
        }

        // Check for bullet/numbered lists
        if (paragraph.bullet) {
          const level = paragraph.bullet.nestingLevel || 0;
          const indent = '  '.repeat(level);
          lines.push(`${indent}- ${formattedContent}`);
          inList = true;
          continue;
        }

        // Regular paragraph
        if (inList) {
          lines.push('');
          inList = false;
        }

        lines.push(formattedContent);
        lines.push('');
      }

      // Handle tables
      if (element.table) {
        lines.push('');
        const table = element.table;

        for (let rowIndex = 0; rowIndex < table.tableRows.length; rowIndex++) {
          const row = table.tableRows[rowIndex];
          const cells = row.tableCells.map(cell => {
            const cellText = cell.content
              .map(el => this.extractElementText(el))
              .join('')
              .trim();
            return cellText;
          });

          lines.push(`| ${cells.join(' | ')} |`);

          // Add header separator after first row
          if (rowIndex === 0) {
            lines.push(`| ${cells.map(() => '---').join(' | ')} |`);
          }
        }
        lines.push('');
      }
    }

    return lines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
  }

  /**
   * Extract text from a structural element
   */
  private extractElementText(element: StructuralElement): string {
    if (element.paragraph) {
      return this.extractParagraphText(element.paragraph);
    }
    return '';
  }

  /**
   * Extract text from a paragraph
   */
  private extractParagraphText(paragraph: Paragraph): string {
    return paragraph.elements
      .map(el => this.extractParagraphElementText(el))
      .join('');
  }

  /**
   * Extract text from a paragraph element
   */
  private extractParagraphElementText(element: ParagraphElement): string {
    if (element.textRun) {
      return element.textRun.content.replace(/\n$/, '');
    }
    return '';
  }

  /**
   * Format paragraph with markdown styling
   */
  private formatParagraphMarkdown(paragraph: Paragraph, doc: GoogleDoc): string {
    return paragraph.elements
      .map(el => this.formatElementMarkdown(el, doc))
      .join('');
  }

  /**
   * Format element with markdown styling
   */
  private formatElementMarkdown(element: ParagraphElement, doc: GoogleDoc): string {
    // Handle inline images
    if (element.inlineObjectElement) {
      const objectId = element.inlineObjectElement.inlineObjectId;
      const inlineObject = doc.inlineObjects?.[objectId];

      if (inlineObject) {
        const embeddedObject = inlineObject.inlineObjectProperties?.embeddedObject;
        const altText = embeddedObject?.description || embeddedObject?.title || 'Image';

        // Create proxy URL for the image
        const proxyUrl = `/api/cms/image/${doc.documentId}_${objectId}`;

        return `![${altText}](${proxyUrl})`;
      }

      return '';
    }

    if (!element.textRun) return '';

    const textRun = element.textRun;
    let text = textRun.content.replace(/\n$/, '');

    if (!text.trim()) return text;

    const style = textRun.textStyle;

    if (style) {
      // Handle links
      if (style.link?.url) {
        text = `[${text}](${style.link.url})`;
      }

      // Handle code (monospace font)
      if (style.weightedFontFamily?.fontFamily?.toLowerCase().includes('mono') ||
          style.weightedFontFamily?.fontFamily?.toLowerCase().includes('courier')) {
        text = `\`${text}\``;
      }

      // Handle bold and italic
      if (style.bold && style.italic) {
        text = `***${text}***`;
      } else if (style.bold) {
        text = `**${text}**`;
      } else if (style.italic) {
        text = `*${text}*`;
      }

      // Handle strikethrough
      if (style.strikethrough) {
        text = `~~${text}~~`;
      }
    }

    return text;
  }

  /**
   * Calculate read time based on content
   */
  calculateReadTime(doc: GoogleDoc): number {
    const text = this.extractText(doc);
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }
}

// Export singleton instance
export const googleDocs = new GoogleDocsClient();
