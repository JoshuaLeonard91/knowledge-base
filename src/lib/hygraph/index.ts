/**
 * Hygraph CMS Integration
 *
 * GraphQL-based headless CMS for article and service management.
 * See: docs/CLIENT_HYGRAPH_SETUP.md
 */

export { hygraph } from './client';
export type { Service, ServiceTier, SLAHighlight, HelpfulResource } from './client';

import { hygraph } from './client';

// Articles
export const isAvailable = () => hygraph.isAvailable();
export const getArticles = () => hygraph.getArticles();
export const getCategories = () => hygraph.getCategories();
export const getArticleBySlug = (slug: string) => hygraph.getArticleBySlug(slug);
export const searchArticles = (query: string) => hygraph.searchArticles(query);
export const getArticlesByCategory = (slug: string) => hygraph.getArticlesByCategory(slug);

// Services
export const getServices = () => hygraph.getServices();
export const getServiceBySlug = (slug: string) => hygraph.getServiceBySlug(slug);
export const getServiceTiers = () => hygraph.getServiceTiers();
export const getSLAHighlights = () => hygraph.getSLAHighlights();
export const hasServices = () => hygraph.hasServices();
export const getHelpfulResources = () => hygraph.getHelpfulResources();
