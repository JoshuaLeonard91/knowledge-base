/**
 * Unified CMS Module
 *
 * Provides a single entry point for fetching articles from CMS providers.
 * Automatically selects the configured provider based on environment variables.
 *
 * Supported Providers:
 * - google: Google Sheets (CMS_SOURCE=google)
 * - microcms: microCMS headless CMS (CMS_SOURCE=microcms)
 * - local: Local fallback data (default)
 *
 * See: docs/CLIENT_GOOGLE_SHEETS_SETUP.md
 * See: docs/CLIENT_MICROCMS_SETUP.md
 */

import { Article, ArticleCategory } from '@/types';

// Import providers
import * as localData from '@/lib/data/articles';
import * as googleSheets from '@/lib/google-docs/articles';
import * as microCMS from '@/lib/microcms';

type CMSProvider = 'google' | 'microcms' | 'local';

/**
 * Detect which CMS provider to use
 */
function detectProvider(): CMSProvider {
  const cmsSource = process.env.CMS_SOURCE as CMSProvider | undefined;

  // Check configured providers
  if (cmsSource === 'google' && googleSheets.isAvailable()) {
    return 'google';
  }

  if (cmsSource === 'microcms' && microCMS.isAvailable()) {
    return 'microcms';
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
    case 'google':
      return googleSheets.getArticles();
    case 'microcms':
      return microCMS.getArticles();
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
    case 'google':
      return googleSheets.getCategories();
    case 'microcms':
      return microCMS.getCategories();
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
    case 'google':
      return googleSheets.getArticleBySlug(slug);
    case 'microcms':
      return microCMS.getArticleBySlug(slug);
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
    case 'google':
      return googleSheets.searchArticles(query);
    case 'microcms':
      return microCMS.searchArticles(query);
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
    case 'google':
      return googleSheets.getArticlesByCategory(categorySlug);
    case 'microcms':
      return microCMS.getArticlesByCategory(categorySlug);
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
