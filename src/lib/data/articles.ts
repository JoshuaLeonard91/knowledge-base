/**
 * Fallback Article Data
 *
 * This file provides empty fallback data when Hygraph CMS is not configured.
 * To add articles, configure your Hygraph integration.
 * See: docs/CLIENT_HYGRAPH_SETUP.md
 */

import { Article, ArticleCategory } from '@/types';

// Empty categories - configure Hygraph CMS to add your own
export const categories: ArticleCategory[] = [];

// Empty articles - configure Hygraph CMS to add your own
export const articles: Article[] = [];

/**
 * Get article by slug from local data
 */
export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug);
}

/**
 * Search articles in local data
 */
export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return articles.filter(
    a =>
      a.title.toLowerCase().includes(lowerQuery) ||
      a.excerpt.toLowerCase().includes(lowerQuery) ||
      a.keywords.some(k => k.toLowerCase().includes(lowerQuery))
  );
}

/**
 * Get articles by category from local data
 */
export function getArticlesByCategory(category: Article['category']): Article[] {
  return articles.filter(a => a.category === category);
}
