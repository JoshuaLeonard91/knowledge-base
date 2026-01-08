/**
 * Fallback Article Data
 *
 * This data is used when Google Docs CMS is not configured.
 * Configure Google Docs/Sheets integration to add your articles.
 */

import { Article, ArticleCategory } from '@/types';

export const categories: ArticleCategory[] = [];

export const articles: Article[] = [];

export function getArticlesByCategory(category: Article['category']): Article[] {
  return articles.filter(a => a.category === category);
}

export function getArticleBySlug(slug: string): Article | undefined {
  return articles.find(a => a.slug === slug);
}

export function searchArticles(query: string): Article[] {
  const lowerQuery = query.toLowerCase();
  return articles
    .map(article => {
      let score = 0;
      if (article.title.toLowerCase().includes(lowerQuery)) score += 10;
      if (article.excerpt.toLowerCase().includes(lowerQuery)) score += 5;
      if (article.keywords.some(k => k.toLowerCase().includes(lowerQuery))) score += 8;
      return { article, score };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score)
    .map(({ article }) => article);
}

export function getRelatedArticles(slug: string): Article[] {
  const article = getArticleBySlug(slug);
  if (!article) return [];
  return article.relatedSlugs
    .map(s => getArticleBySlug(s))
    .filter((a): a is Article => a !== undefined);
}
