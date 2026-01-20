/**
 * Hygraph CMS Integration
 *
 * GraphQL-based headless CMS for article and service management.
 * See: docs/CLIENT_HYGRAPH_SETUP.md
 *
 * Multi-tenant support:
 * - Use default exports for main site (uses env vars)
 * - Use createHygraphClient() or getOrCreateTenantClient() for tenant-specific clients
 */

// Default singleton client (main site / fallback)
export { hygraph } from './client';

// Multi-tenant client factories
export {
  HygraphClient,
  createHygraphClient,
  getOrCreateTenantClient,
  clearTenantClientCache,
} from './client';

// Types
export type { Service, ServiceTier, SLAHighlight, HelpfulResource, ServicesPageContent, ContactSettings, ContactPageSettings, InquiryType, FooterSettings, FooterLink, HeaderSettings, NavLink, TicketCategory } from './client';

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
export const getServicesPageContent = () => hygraph.getServicesPageContent();

// Contact (services page modal)
export const getContactSettings = () => hygraph.getContactSettings();
export const getInquiryTypes = () => hygraph.getInquiryTypes();

// Contact Page (/support/contact)
export const getContactPageSettings = () => hygraph.getContactPageSettings();

// Combined (single query - reduces API calls)
export const getServicesPageData = () => hygraph.getServicesPageData();

// Footer
export const getFooterData = () => hygraph.getFooterData();

// Header/Navbar
export const getHeaderData = () => hygraph.getHeaderData();

// Ticket Form
export const getTicketCategories = () => hygraph.getTicketCategories();
