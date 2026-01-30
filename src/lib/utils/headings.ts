import type { RichTextContent, Node, ElementNode, Text } from '@graphcms/rich-text-types';

export interface TocHeading {
  id: string;
  text: string;
  level: number;
}

/** Generate a URL-safe slug from heading text */
export function generateHeaderId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim();
}

/** Recursively extract plain text from a Rich Text AST node */
function extractText(node: Node): string {
  if ('text' in node && typeof (node as Text).text === 'string') {
    return (node as Text).text;
  }
  if ('children' in node && Array.isArray(node.children)) {
    return node.children.map(extractText).join('');
  }
  return '';
}

const HEADING_TYPES: Record<string, number> = {
  'heading-one': 1,
  'heading-two': 2,
  'heading-three': 3,
  'heading-four': 4,
  'heading-five': 5,
  'heading-six': 6,
};

/** Extract TOC headings from Hygraph Rich Text AST */
export function extractHeadingsFromRichText(content: RichTextContent): TocHeading[] {
  const headings: TocHeading[] = [];
  const nodes: ElementNode[] = Array.isArray(content) ? content : content.children;

  for (const node of nodes) {
    const level = HEADING_TYPES[node.type];
    if (level) {
      const text = extractText(node);
      if (text.trim()) {
        headings.push({ id: generateHeaderId(text), text: text.trim(), level });
      }
    }
  }

  return headings;
}

/** Extract TOC headings from markdown string */
export function extractHeadingsFromMarkdown(content: string): TocHeading[] {
  const headings: TocHeading[] = [];
  const lines = content.split('\n');

  for (const line of lines) {
    const match = line.match(/^(#{1,6})\s+(.+)$/);
    if (match) {
      const level = match[1].length;
      const text = match[2].replace(/[*_`\[\]()]/g, '').trim();
      if (text) {
        headings.push({ id: generateHeaderId(text), text, level });
      }
    }
  }

  return headings;
}
