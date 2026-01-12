/**
 * microCMS Integration
 *
 * Exports microCMS client functions for use by the CMS module.
 */

export { microCMS } from './client';

import { microCMS } from './client';
import { Article, ArticleCategory } from '@/types';

export function isAvailable(): boolean {
  return microCMS.isAvailable();
}

export async function getArticles(): Promise<Article[]> {
  return microCMS.getArticles();
}

export async function getCategories(): Promise<ArticleCategory[]> {
  return microCMS.getCategories();
}

export async function getArticleBySlug(slug: string): Promise<Article | null> {
  return microCMS.getArticleBySlug(slug);
}

export async function searchArticles(query: string): Promise<Article[]> {
  return microCMS.searchArticles(query);
}

export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  return microCMS.getArticlesByCategory(categorySlug);
}
