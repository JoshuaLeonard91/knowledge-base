/**
 * HTML/CSS Sanitization Utility
 *
 * Uses DOMPurify with a strict CSS property whitelist to safely render
 * CMS content while preserving styling like colors, fonts, etc.
 */

import DOMPurify from 'isomorphic-dompurify';

// Whitelist of safe CSS properties
const ALLOWED_CSS_PROPERTIES = new Set([
  // Colors
  'color',
  'background-color',
  'background',
  // Text styling
  'font-weight',
  'font-style',
  'font-size',
  'font-family',
  'text-decoration',
  'text-align',
  'line-height',
  'letter-spacing',
  // Spacing (limited)
  'padding',
  'padding-top',
  'padding-right',
  'padding-bottom',
  'padding-left',
  'margin',
  'margin-top',
  'margin-right',
  'margin-bottom',
  'margin-left',
  // Borders
  'border',
  'border-color',
  'border-width',
  'border-style',
  'border-radius',
  // Display
  'display',
  'opacity',
  // Size (limited)
  'width',
  'max-width',
  'height',
  'max-height',
]);

// Dangerous patterns to always block
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /expression\s*\(/gi,
  /url\s*\(/gi,  // Block url() to prevent data exfiltration
  /@import/gi,
  /behavior\s*:/gi,
  /-moz-binding/gi,
];

/**
 * Sanitize a CSS value to remove dangerous content
 */
function sanitizeCSSValue(value: string): string | null {
  const trimmed = value.trim();

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(trimmed)) {
      return null;
    }
  }

  return trimmed;
}

/**
 * Parse and filter inline style string
 */
function filterInlineStyles(styleString: string): string {
  if (!styleString) return '';

  const filtered: string[] = [];
  const declarations = styleString.split(';');

  for (const declaration of declarations) {
    const colonIndex = declaration.indexOf(':');
    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim().toLowerCase();
    const value = declaration.slice(colonIndex + 1).trim();

    // Check if property is allowed
    if (!ALLOWED_CSS_PROPERTIES.has(property)) {
      continue;
    }

    // Sanitize the value
    const sanitizedValue = sanitizeCSSValue(value);
    if (sanitizedValue) {
      filtered.push(`${property}: ${sanitizedValue}`);
    }
  }

  return filtered.join('; ');
}

// Configure DOMPurify
if (typeof window !== 'undefined' || typeof global !== 'undefined') {
  // Add hook to sanitize inline styles
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.hasAttribute('style')) {
      const originalStyle = node.getAttribute('style') || '';
      const filteredStyle = filterInlineStyles(originalStyle);

      if (filteredStyle) {
        node.setAttribute('style', filteredStyle);
      } else {
        node.removeAttribute('style');
      }
    }
  });
}

/**
 * Sanitize HTML content from CMS
 * Allows safe HTML tags and filtered inline CSS
 */
export function sanitizeHTML(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'p', 'br', 'hr',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike',
      'a', 'img',
      'blockquote', 'pre', 'code',
      'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'div', 'span',
      'figure', 'figcaption',
    ],
    ALLOWED_ATTR: [
      'href', 'src', 'alt', 'title', 'target', 'rel',
      'class', 'id',
      'style',  // We filter this with our hook
      'width', 'height',
      'colspan', 'rowspan',
    ],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
  });
}

/**
 * Check if HTML contains any styling
 */
export function hasInlineStyles(html: string): boolean {
  return /style\s*=\s*["'][^"']+["']/i.test(html);
}

export default {
  sanitizeHTML,
  hasInlineStyles,
  filterInlineStyles,
};
