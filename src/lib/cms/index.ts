/**
 * Unified CMS Module
 *
 * Provides a single entry point for fetching articles from CMS providers.
 * Automatically selects the configured provider based on environment variables.
 *
 * Provider Priority:
 * 1. Google Docs (if GOOGLE_API_KEY is set)
 * 2. Local data (fallback)
 *
 * Override with CMS_PROVIDER env var: 'google-docs' | 'local'
 */

import { Article, ArticleCategory } from '@/types';

// Import providers
import * as localData from '@/lib/data/articles';
import * as googleDocs from '@/lib/google-docs/articles';

type CMSProvider = 'google-docs' | 'local';

/**
 * Detect which CMS provider to use
 */
function detectProvider(): CMSProvider {
  // Allow explicit override
  const override = process.env.CMS_PROVIDER as CMSProvider | undefined;
  if (override && ['google-docs', 'local'].includes(override)) {
    return override;
  }

  // Auto-detect based on configured env vars
  if (process.env.GOOGLE_API_KEY) {
    return 'google-docs';
  }

  return 'local';
}

/**
 * Get the current CMS provider name
 */
export function getCMSProvider(): CMSProvider {
  return detectProvider();
}

/**
 * Get all articles from the configured CMS
 */
export async function getArticles(): Promise<Article[]> {
  const provider = detectProvider();

  switch (provider) {
    case 'google-docs':
      return googleDocs.getArticles();
    case 'local':
    default:
      return localData.articles;
  }
}

/**
 * Get all categories from the configured CMS
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  const provider = detectProvider();

  switch (provider) {
    case 'google-docs':
      return googleDocs.getCategories();
    case 'local':
    default:
      return localData.categories;
  }
}

/**
 * Get an article by slug from the configured CMS
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const provider = detectProvider();

  switch (provider) {
    case 'google-docs':
      return googleDocs.getArticleBySlug(slug);
    case 'local':
    default:
      return localData.getArticleBySlug(slug) || null;
  }
}

/**
 * Search articles from the configured CMS
 */
export async function searchArticles(query: string): Promise<Article[]> {
  const provider = detectProvider();

  switch (provider) {
    case 'google-docs':
      return googleDocs.searchArticles(query);
    case 'local':
    default:
      return localData.searchArticles(query);
  }
}

/**
 * Get articles by category from the configured CMS
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const provider = detectProvider();

  switch (provider) {
    case 'google-docs':
      return googleDocs.getArticlesByCategory(categorySlug);
    case 'local':
    default:
      return localData.articles.filter(a => a.category === categorySlug);
  }
}

/**
 * Get related articles (by slug list or same category)
 */
export async function getRelatedArticles(
  article: Article,
  limit: number = 3
): Promise<Article[]> {
  const allArticles = await getArticles();

  // First try related slugs
  if (article.relatedSlugs && article.relatedSlugs.length > 0) {
    const related = allArticles.filter(a =>
      article.relatedSlugs.includes(a.slug) && a.slug !== article.slug
    );
    if (related.length >= limit) {
      return related.slice(0, limit);
    }
  }

  // Fall back to same category
  const sameCategory = allArticles.filter(
    a => a.category === article.category && a.slug !== article.slug
  );

  return sameCategory.slice(0, limit);
}
