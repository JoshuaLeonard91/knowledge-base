/**
 * Google Sheets Articles Integration
 *
 * Wrapper around Google Sheets client for article operations.
 * Falls back to local data if Google Sheets is not configured.
 */

import { googleSheets } from './client';
import {
  articles as localArticles,
  categories as localCategories,
  getArticleBySlug as getLocalArticleBySlug,
  searchArticles as searchLocalArticles,
} from '@/lib/data/articles';
import { Article, ArticleCategory } from '@/types';

/**
 * Check if Google Sheets is available
 */
export function isAvailable(): boolean {
  return googleSheets.isAvailable();
}

/**
 * Get all articles
 */
export async function getArticles(): Promise<Article[]> {
  if (!googleSheets.isAvailable()) {
    return localArticles;
  }

  const articles = await googleSheets.getArticles();
  return articles.length > 0 ? articles : localArticles;
}

/**
 * Get all categories
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  if (!googleSheets.isAvailable()) {
    return localCategories;
  }

  const categories = await googleSheets.getCategories();
  return categories.length > 0 ? categories : localCategories;
}

/**
 * Get article by slug
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  if (!googleSheets.isAvailable()) {
    return getLocalArticleBySlug(slug) || null;
  }

  const article = await googleSheets.getArticleBySlug(slug);
  return article || getLocalArticleBySlug(slug) || null;
}

/**
 * Search articles
 */
export async function searchArticles(query: string): Promise<Article[]> {
  if (!googleSheets.isAvailable()) {
    return searchLocalArticles(query);
  }

  const results = await googleSheets.searchArticles(query);
  return results.length > 0 ? results : searchLocalArticles(query);
}

/**
 * Get articles by category
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  if (!googleSheets.isAvailable()) {
    return localArticles.filter(a => a.category === categorySlug);
  }

  const articles = await googleSheets.getArticlesByCategory(categorySlug);
  return articles.length > 0 ? articles : localArticles.filter(a => a.category === categorySlug);
}
