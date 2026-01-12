/**
 * Google Docs CMS Integration
 *
 * Provides article fetching from Google Docs with automatic markdown conversion.
 * Uses Google Sheets as an article index for metadata management.
 */

export { googleSheets } from './client';
export * from './types';
export {
  getArticles,
  getCategories,
  getArticleBySlug,
  searchArticles,
  getArticlesByCategory,
} from './articles';
