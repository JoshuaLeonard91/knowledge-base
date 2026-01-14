/**
 * Unified CMS Module
 *
 * Provides a single entry point for fetching articles and services from CMS.
 * Uses Hygraph CMS when configured, falls back to local data.
 *
 * Supported Providers:
 * - hygraph: Hygraph GraphQL CMS (CMS_SOURCE=hygraph)
 * - local: Local fallback data (default)
 *
 * See: docs/CLIENT_HYGRAPH_SETUP.md
 */

import { Article, ArticleCategory } from '@/types';

// Import providers
import * as localData from '@/lib/data/articles';
import * as hygraph from '@/lib/hygraph';

// Re-export service types from Hygraph
export type { Service, ServiceTier, SLAHighlight } from '@/lib/hygraph';

type CMSProvider = 'hygraph' | 'local';

/**
 * Detect which CMS provider to use
 */
function detectProvider(): CMSProvider {
  const cmsSource = process.env.CMS_SOURCE;

  if (cmsSource === 'hygraph' && hygraph.isAvailable()) {
    return 'hygraph';
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

  if (provider === 'hygraph') {
    return hygraph.getArticles();
  }

  return localData.articles;
}

/**
 * Get all categories from the configured CMS
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getCategories();
  }

  return localData.categories;
}

/**
 * Get an article by slug from the configured CMS
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getArticleBySlug(slug);
  }

  return localData.getArticleBySlug(slug) || null;
}

/**
 * Search articles from the configured CMS
 */
export async function searchArticles(query: string): Promise<Article[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.searchArticles(query);
  }

  return localData.searchArticles(query);
}

/**
 * Get articles by category from the configured CMS
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getArticlesByCategory(categorySlug);
  }

  return localData.articles.filter(a => a.category === categorySlug);
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

// ==========================================
// SERVICES (Hygraph only)
// ==========================================

import type { Service, ServiceTier, SLAHighlight } from '@/lib/hygraph';

/**
 * Check if services are enabled (any services exist in CMS)
 */
export async function hasServices(): Promise<boolean> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.hasServices();
  }

  return false;
}

/**
 * Get all services from the CMS
 */
export async function getServices(): Promise<Service[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getServices();
  }

  return [];
}

/**
 * Get a service by slug
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getServiceBySlug(slug);
  }

  return null;
}

/**
 * Get all service tiers from the CMS
 */
export async function getServiceTiers(): Promise<ServiceTier[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getServiceTiers();
  }

  return [];
}

/**
 * Get SLA highlights from the CMS
 */
export async function getSLAHighlights(): Promise<SLAHighlight[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getSLAHighlights();
  }

  return [];
}
