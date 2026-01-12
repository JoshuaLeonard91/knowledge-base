/**
 * microCMS Client
 *
 * Fetches articles and categories from microCMS headless CMS.
 * https://microcms.io/
 *
 * Required environment variables:
 * - MICROCMS_SERVICE_ID: Your microCMS service ID (subdomain)
 * - MICROCMS_API_KEY: Your microCMS API key
 *
 * Optional:
 * - CMS_SOURCE: Set to 'microcms' to enable
 */

import { Article, ArticleCategory } from '@/types';

const MICROCMS_SERVICE_ID = process.env.MICROCMS_SERVICE_ID || '';
const MICROCMS_API_KEY = process.env.MICROCMS_API_KEY || '';

interface MicroCMSArticle {
  id: string;
  slug?: string;
  title: string;
  excerpt?: string;
  content: string;
  category?: {
    id: string;
    name: string;
  };
  keywords?: string | string[];
  icon?: string;
  readTime?: number;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface MicroCMSCategory {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
}

interface MicroCMSListResponse<T> {
  contents: T[];
  totalCount: number;
  offset: number;
  limit: number;
}

class MicroCMSClient {
  private serviceId: string;
  private apiKey: string;
  private isConfigured: boolean;
  private baseUrl: string;

  constructor() {
    this.serviceId = MICROCMS_SERVICE_ID;
    this.apiKey = MICROCMS_API_KEY;
    this.baseUrl = `https://${this.serviceId}.microcms.io/api/v1`;

    const cmsSource = process.env.CMS_SOURCE || 'local';

    this.isConfigured = Boolean(
      cmsSource === 'microcms' &&
      this.serviceId &&
      this.apiKey
    );

    if (this.isConfigured) {
      console.log('[microCMS] Configured with service:', this.serviceId);
    }
  }

  /**
   * Check if microCMS is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Fetch data from microCMS API
   */
  private async fetchAPI<T>(
    endpoint: string,
    params: Record<string, string> = {}
  ): Promise<T | null> {
    if (!this.isConfigured) {
      return null;
    }

    try {
      const queryString = new URLSearchParams(params).toString();
      const url = `${this.baseUrl}/${endpoint}${queryString ? `?${queryString}` : ''}`;

      const response = await fetch(url, {
        headers: {
          'X-MICROCMS-API-KEY': this.apiKey,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) {
        console.error(`[microCMS] API error: ${response.status} ${response.statusText}`);
        return null;
      }

      return await response.json();
    } catch (error) {
      console.error('[microCMS] Fetch error:', error);
      return null;
    }
  }

  /**
   * Get all articles
   */
  async getArticles(): Promise<Article[]> {
    const data = await this.fetchAPI<MicroCMSListResponse<MicroCMSArticle>>('articles', {
      limit: '100',
      orders: '-publishedAt',
    });

    if (!data || !data.contents) {
      return [];
    }

    return data.contents.map((item) => this.transformArticle(item));
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<ArticleCategory[]> {
    const data = await this.fetchAPI<MicroCMSListResponse<MicroCMSCategory>>('categories', {
      limit: '50',
    });

    if (!data || !data.contents) {
      // Auto-generate from articles if no categories endpoint
      const articles = await this.getArticles();
      const categoryMap = new Map<string, string>();

      articles.forEach((a) => {
        if (!categoryMap.has(a.category)) {
          categoryMap.set(a.category, this.slugToDisplayName(a.category));
        }
      });

      return Array.from(categoryMap.entries()).map(([id, name]) => ({
        id,
        name,
        description: `Articles about ${name.toLowerCase()}`,
        icon: this.getCategoryIcon(id),
      }));
    }

    return data.contents.map((item) => {
      const slug = this.nameToSlug(item.name);
      return {
        id: slug,
        name: item.name,
        description: item.description || '',
        icon: item.icon || this.getCategoryIcon(slug),
      };
    });
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<Article | null> {
    // Try to get by slug filter first
    const data = await this.fetchAPI<MicroCMSListResponse<MicroCMSArticle>>('articles', {
      filters: `slug[equals]${slug}`,
      limit: '1',
    });

    if (data && data.contents && data.contents.length > 0) {
      return this.transformArticle(data.contents[0]);
    }

    // Fallback: try using slug as ID
    const article = await this.fetchAPI<MicroCMSArticle>(`articles/${slug}`);
    if (article) {
      return this.transformArticle(article);
    }

    return null;
  }

  /**
   * Search articles
   */
  async searchArticles(query: string): Promise<Article[]> {
    const data = await this.fetchAPI<MicroCMSListResponse<MicroCMSArticle>>('articles', {
      q: query,
      limit: '20',
    });

    if (!data || !data.contents) {
      return [];
    }

    return data.contents.map((item) => this.transformArticle(item));
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(categoryId: string): Promise<Article[]> {
    const data = await this.fetchAPI<MicroCMSListResponse<MicroCMSArticle>>('articles', {
      filters: `category[equals]${categoryId}`,
      limit: '50',
    });

    if (!data || !data.contents) {
      return [];
    }

    return data.contents.map((item) => this.transformArticle(item));
  }

  /**
   * Transform microCMS article to our Article type
   */
  private transformArticle(item: MicroCMSArticle): Article {
    // Handle keywords - can be string or array
    let keywords: string[] = [];
    if (typeof item.keywords === 'string') {
      keywords = item.keywords.split(',').map(k => k.trim()).filter(k => k);
    } else if (Array.isArray(item.keywords)) {
      keywords = item.keywords;
    }

    // Convert HTML content to markdown-like format for rendering
    const content = this.htmlToMarkdown(item.content);

    // Use category name as slug (converted to slug format), not the microCMS ID
    const categorySlug = item.category?.name
      ? this.nameToSlug(item.category.name)
      : 'general';

    return {
      slug: item.slug || item.id,
      title: item.title,
      excerpt: item.excerpt || this.extractExcerpt(item.content),
      content,
      category: categorySlug,
      topic: 'general',
      keywords,
      icon: item.icon || 'Article',
      readTime: item.readTime || this.calculateReadTime(item.content),
      relatedSlugs: [],
    };
  }

  /**
   * Convert name to URL-friendly slug
   */
  private nameToSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Convert HTML content to markdown-like format
   * Preserves safe inline styles (colors) as HTML spans
   */
  private htmlToMarkdown(html: string): string {
    // First, preserve colored/styled spans by converting to a safe format
    // Extract only color styles and keep them as HTML
    let processed = html
      // Preserve spans with color styles (sanitize to only allow color)
      .replace(/<span[^>]*style="([^"]*)"[^>]*>(.*?)<\/span>/gi, (match, style, content) => {
        const colorMatch = style.match(/color\s*:\s*([^;]+)/i);
        const bgMatch = style.match(/background(?:-color)?\s*:\s*([^;]+)/i);

        if (colorMatch || bgMatch) {
          const safeStyles: string[] = [];
          if (colorMatch) safeStyles.push(`color: ${this.sanitizeColorValue(colorMatch[1])}`);
          if (bgMatch) safeStyles.push(`background-color: ${this.sanitizeColorValue(bgMatch[1])}`);

          if (safeStyles.length > 0) {
            return `<span style="${safeStyles.join('; ')}">${content}</span>`;
          }
        }
        return content; // Strip span if no safe styles
      });

    return processed
      // Headers
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<h4[^>]*>(.*?)<\/h4>/gi, '#### $1\n\n')
      // Bold and italic
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      // Code
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<pre>([^]*?)<\/pre>/gi, '```\n$1\n```\n\n')
      // Images - convert to markdown format
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)\n\n')
      .replace(/<img[^>]*alt="([^"]*)"[^>]*src="([^"]*)"[^>]*\/?>/gi, '![$1]($2)\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)\n\n')
      // Links
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      // Lists
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<ol[^>]*>/gi, '')
      .replace(/<\/ol>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      // Paragraphs and line breaks
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      // Remove remaining HTML tags EXCEPT preserved spans
      .replace(/<(?!span[^>]*style=)[^>]+>/g, '')
      .replace(/<\/(?!span)[^>]+>/g, '')
      // Fix entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Clean up extra whitespace
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Sanitize color value to prevent injection
   */
  private sanitizeColorValue(value: string): string {
    const trimmed = value.trim();

    // Allow only safe color formats:
    // - Named colors (red, blue, etc.)
    // - Hex colors (#fff, #ffffff)
    // - RGB/RGBA
    // - HSL/HSLA
    if (/^[a-z]+$/i.test(trimmed)) {
      return trimmed; // Named color
    }
    if (/^#[0-9a-f]{3,8}$/i.test(trimmed)) {
      return trimmed; // Hex color
    }
    if (/^rgba?\s*\(\s*[\d\s,.%]+\s*\)$/i.test(trimmed)) {
      return trimmed; // RGB/RGBA
    }
    if (/^hsla?\s*\(\s*[\d\s,.%deg]+\s*\)$/i.test(trimmed)) {
      return trimmed; // HSL/HSLA
    }

    return 'inherit'; // Default to inherit if not recognized
  }

  /**
   * Extract excerpt from content
   */
  private extractExcerpt(content: string): string {
    // Remove HTML tags if present
    const text = content.replace(/<[^>]*>/g, '');
    // Remove markdown formatting
    const cleaned = text
      .replace(/#{1,6}\s/g, '')
      .replace(/\*\*/g, '')
      .replace(/\*/g, '')
      .replace(/`/g, '')
      .trim();

    return cleaned.length > 150 ? cleaned.substring(0, 147) + '...' : cleaned;
  }

  /**
   * Calculate read time
   */
  private calculateReadTime(content: string): number {
    const text = content.replace(/<[^>]*>/g, '');
    const wordCount = text.split(/\s+/).length;
    return Math.max(1, Math.ceil(wordCount / 200));
  }

  /**
   * Convert slug to display name
   */
  private slugToDisplayName(slug: string): string {
    return slug
      .split('-')
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  }

  /**
   * Get default icon for category
   */
  private getCategoryIcon(slug: string): string {
    const iconMap: Record<string, string> = {
      'getting-started': 'Rocket',
      faq: 'Question',
      troubleshooting: 'Wrench',
      guides: 'BookOpen',
      tutorials: 'GraduationCap',
      api: 'Code',
      reference: 'FileText',
      announcements: 'Megaphone',
      updates: 'Bell',
      security: 'Shield',
      billing: 'CreditCard',
      account: 'User',
      integrations: 'Plug',
    };
    return iconMap[slug] || 'Article';
  }
}

// Export singleton instance
export const microCMS = new MicroCMSClient();
