/**
 * Google Docs Articles Integration
 *
 * Fetches articles from Google Docs and transforms them to match our local Article type.
 * Uses Google Sheets as an index to manage article metadata.
 * Falls back to local data if Google Docs is not configured or unavailable.
 */

import { googleDocs } from './client';
import { GoogleDoc, ArticleIndexEntry } from './types';
import {
  articles as localArticles,
  categories as localCategories,
  getArticleBySlug as getLocalArticleBySlug,
  searchArticles as searchLocalArticles,
} from '@/lib/data/articles';
import { Article, ArticleCategory as Category } from '@/types';

// Cache for article index to reduce API calls
let indexCache: ArticleIndexEntry[] | null = null;
let indexCacheTime = 0;
const INDEX_CACHE_TTL = 60 * 1000; // 1 minute

/**
 * Get article index with caching
 */
async function getArticleIndexCached(): Promise<ArticleIndexEntry[]> {
  const now = Date.now();

  if (indexCache && now - indexCacheTime < INDEX_CACHE_TTL) {
    return indexCache;
  }

  indexCache = await googleDocs.getArticleIndex();
  indexCacheTime = now;

  return indexCache;
}

/**
 * Transform Google Doc to our Article format
 */
function transformDoc(
  doc: GoogleDoc,
  indexEntry: ArticleIndexEntry
): Article {
  const content = googleDocs.toMarkdown(doc);
  const readTime = googleDocs.calculateReadTime(doc);

  // Ensure category is a valid type
  const validCategories = ['getting-started', 'faq', 'troubleshooting'] as const;
  const category = validCategories.includes(indexEntry.category as typeof validCategories[number])
    ? (indexEntry.category as Article['category'])
    : 'faq';

  return {
    slug: indexEntry.slug,
    title: indexEntry.title || doc.title,
    excerpt: indexEntry.excerpt || extractExcerpt(content),
    content,
    category,
    topic: 'general',
    icon: indexEntry.icon || 'Article',
    keywords: indexEntry.keywords || extractKeywords(content),
    readTime,
    relatedSlugs: [],
  };
}

/**
 * Extract excerpt from content (first paragraph)
 */
function extractExcerpt(content: string): string {
  const paragraphs = content.split('\n\n').filter(p => {
    const trimmed = p.trim();
    return trimmed && !trimmed.startsWith('#') && !trimmed.startsWith('-');
  });

  if (paragraphs.length === 0) return '';

  const excerpt = paragraphs[0].replace(/\*\*/g, '').replace(/\*/g, '').trim();
  return excerpt.length > 200 ? excerpt.substring(0, 197) + '...' : excerpt;
}

/**
 * Extract keywords from content
 */
function extractKeywords(content: string): string[] {
  // Extract words from headings
  const headingMatches = content.match(/^#+\s+(.+)$/gm) || [];
  const headingWords = headingMatches
    .flatMap(h => h.replace(/^#+\s+/, '').toLowerCase().split(/\s+/))
    .filter(w => w.length > 3);

  // Get unique keywords
  const unique = [...new Set(headingWords)].slice(0, 10);
  return unique.length > 0 ? unique : ['support', 'help'];
}

/**
 * Get all articles - fetches from Google Docs with local fallback
 */
export async function getArticles(): Promise<Article[]> {
  if (!googleDocs.isAvailable()) {
    return localArticles;
  }

  try {
    const index = await getArticleIndexCached();

    if (index.length === 0) {
      console.log('[GoogleDocs] No articles in index, using local fallback');
      return localArticles;
    }

    // Fetch all documents in parallel
    const articles = await Promise.all(
      index.map(async (entry) => {
        try {
          const doc = await googleDocs.getDocument(entry.documentId);
          if (!doc) {
            console.warn(`[GoogleDocs] Failed to fetch doc: ${entry.documentId}`);
            return null;
          }
          return transformDoc(doc, entry);
        } catch (error) {
          console.error(`[GoogleDocs] Error fetching doc ${entry.documentId}:`, error);
          return null;
        }
      })
    );

    const validArticles = articles.filter((a): a is Article => a !== null);

    if (validArticles.length === 0) {
      console.log('[GoogleDocs] No valid articles fetched, using local fallback');
      return localArticles;
    }

    return validArticles;
  } catch (error) {
    console.error('[GoogleDocs] Error fetching articles:', error);
    return localArticles;
  }
}

/**
 * Get all categories - derived from article index or local fallback
 */
export async function getCategories(): Promise<Category[]> {
  if (!googleDocs.isAvailable()) {
    return localCategories;
  }

  try {
    const index = await getArticleIndexCached();

    if (index.length === 0) {
      return localCategories;
    }

    // Get unique categories from index
    const categorySet = new Set(index.map(e => e.category));
    const validCategories = ['getting-started', 'faq', 'troubleshooting'] as const;

    const categories: Category[] = [];

    for (const catId of categorySet) {
      if (validCategories.includes(catId as typeof validCategories[number])) {
        const localCat = localCategories.find(c => c.id === catId);
        if (localCat) {
          categories.push(localCat);
        }
      }
    }

    return categories.length > 0 ? categories : localCategories;
  } catch (error) {
    console.error('[GoogleDocs] Error getting categories:', error);
    return localCategories;
  }
}

/**
 * Get article by slug - fetches from Google Docs with local fallback
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!googleDocs.isAvailable()) {
    return getLocalArticleBySlug(slug) || null;
  }

  try {
    const index = await getArticleIndexCached();
    const entry = index.find(e => e.slug === slug);

    if (!entry) {
      // Try local fallback
      return getLocalArticleBySlug(slug) || null;
    }

    const doc = await googleDocs.getDocument(entry.documentId);
    if (!doc) {
      return getLocalArticleBySlug(slug) || null;
    }

    return transformDoc(doc, entry);
  } catch (error) {
    console.error('[GoogleDocs] Error fetching article:', error);
    return getLocalArticleBySlug(slug) || null;
  }
}

/**
 * Search articles - searches Google Docs content with local fallback
 */
export async function searchArticles(query: string): Promise<Article[]> {
  if (!googleDocs.isAvailable()) {
    return searchLocalArticles(query);
  }

  try {
    // Get all articles and filter by query
    const articles = await getArticles();
    const lowerQuery = query.toLowerCase();

    const results = articles.filter(article => {
      return (
        article.title.toLowerCase().includes(lowerQuery) ||
        article.excerpt.toLowerCase().includes(lowerQuery) ||
        article.content.toLowerCase().includes(lowerQuery) ||
        article.keywords.some(k => k.toLowerCase().includes(lowerQuery))
      );
    });

    if (results.length === 0) {
      // Try local fallback
      return searchLocalArticles(query);
    }

    return results;
  } catch (error) {
    console.error('[GoogleDocs] Error searching articles:', error);
    return searchLocalArticles(query);
  }
}

/**
 * Get articles by category - fetches from Google Docs with local fallback
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  if (!googleDocs.isAvailable()) {
    return localArticles.filter(a => a.category === categorySlug);
  }

  try {
    const index = await getArticleIndexCached();
    const categoryEntries = index.filter(e => e.category === categorySlug);

    if (categoryEntries.length === 0) {
      return localArticles.filter(a => a.category === categorySlug);
    }

    const articles = await Promise.all(
      categoryEntries.map(async (entry) => {
        try {
          const doc = await googleDocs.getDocument(entry.documentId);
          if (!doc) return null;
          return transformDoc(doc, entry);
        } catch {
          return null;
        }
      })
    );

    const validArticles = articles.filter((a): a is Article => a !== null);

    if (validArticles.length === 0) {
      return localArticles.filter(a => a.category === categorySlug);
    }

    return validArticles;
  } catch (error) {
    console.error('[GoogleDocs] Error fetching articles by category:', error);
    return localArticles.filter(a => a.category === categorySlug);
  }
}

/**
 * Clear the article index cache
 */
export function clearArticleCache(): void {
  indexCache = null;
  indexCacheTime = 0;
}
