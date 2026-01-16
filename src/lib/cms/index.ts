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
export type { Service, ServiceTier, SLAHighlight, HelpfulResource, ServicesPageContent, ContactSettings, InquiryType, FooterSettings, FooterLink, HeaderSettings, NavLink } from '@/lib/hygraph';

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

import type { Service, ServiceTier, SLAHighlight, HelpfulResource } from '@/lib/hygraph';

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

/**
 * Get helpful resources from the CMS (CMS-driven links section)
 * Returns empty array if none configured - section won't render
 */
export async function getHelpfulResources(): Promise<HelpfulResource[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getHelpfulResources();
  }

  return [];
}

import type { ServicesPageContent } from '@/lib/hygraph';

/**
 * Get services page content (section titles and descriptions)
 * Returns defaults if not configured in CMS
 */
export async function getServicesPageContent(): Promise<ServicesPageContent> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getServicesPageContent();
  }

  // Return defaults for local provider
  return {
    heroTitle: 'Discord Solutions That Scale',
    heroSubtitle: 'From managed bot services to custom development, we provide comprehensive solutions to help your Discord community thrive.',
    servicesTitle: 'What We Offer',
    servicesSubtitle: 'Choose from our range of professional services designed to meet the needs of Discord communities of all sizes.',
    slaTitle: 'Service Level Agreements',
    slaSubtitle: 'We stand behind our services with clear, transparent SLAs that give you peace of mind.',
    resourcesTitle: 'Helpful Resources',
    resourcesSubtitle: 'Explore our knowledge base to learn more about what we offer.',
    ctaTitle: 'Ready to get started?',
    ctaSubtitle: "Let's discuss how we can help your Discord community succeed.",
  };
}

import type { ContactSettings, InquiryType } from '@/lib/hygraph';

/**
 * Get contact form settings
 * Returns defaults if not configured in CMS
 */
export async function getContactSettings(): Promise<ContactSettings> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getContactSettings();
  }

  // Return defaults for local provider
  return {
    formTitle: 'Contact Us',
    formSubtitle: "Tell us about your needs and we'll get back to you shortly.",
    companyFieldLabel: 'Company / Server Name',
    companyFieldPlaceholder: 'Enter your company / server name',
    successTitle: 'Message Sent!',
    successMessage: 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
    submitButtonText: 'Send Message',
  };
}

/**
 * Get inquiry type options for contact form
 * Returns defaults if not configured in CMS
 */
export async function getInquiryTypes(): Promise<InquiryType[]> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getInquiryTypes();
  }

  // Return defaults for local provider
  return [
    { id: 'general', label: 'General Inquiry', order: 1 },
    { id: 'pricing', label: 'Pricing Information', order: 2 },
    { id: 'demo', label: 'Request a Demo', order: 3 },
    { id: 'support', label: 'Support Question', order: 4 },
  ];
}

/**
 * Get all services page data in a single query (reduces API calls)
 * For Hygraph: single GraphQL query fetching all data
 * For local: returns defaults
 */
export async function getServicesPageData(): Promise<{
  services: Service[];
  serviceTiers: ServiceTier[];
  slaHighlights: SLAHighlight[];
  helpfulResources: HelpfulResource[];
  pageContent: ServicesPageContent;
  contactSettings: ContactSettings;
  inquiryTypes: InquiryType[];
}> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getServicesPageData();
  }

  // Return defaults for local provider
  return {
    services: [],
    serviceTiers: [],
    slaHighlights: [],
    helpfulResources: [],
    pageContent: {
      heroTitle: 'Discord Solutions That Scale',
      heroSubtitle: 'From managed bot services to custom development, we provide comprehensive solutions to help your Discord community thrive.',
      servicesTitle: 'What We Offer',
      servicesSubtitle: 'Choose from our range of professional services designed to meet the needs of Discord communities of all sizes.',
      slaTitle: 'Service Level Agreements',
      slaSubtitle: 'We stand behind our services with clear, transparent SLAs that give you peace of mind.',
      resourcesTitle: 'Helpful Resources',
      resourcesSubtitle: 'Explore our knowledge base to learn more about what we offer.',
      ctaTitle: 'Ready to get started?',
      ctaSubtitle: "Let's discuss how we can help your Discord community succeed.",
    },
    contactSettings: {
      formTitle: 'Contact Us',
      formSubtitle: "Tell us about your needs and we'll get back to you shortly.",
      companyFieldLabel: 'Company / Server Name',
      companyFieldPlaceholder: 'Enter your company / server name',
      successTitle: 'Message Sent!',
      successMessage: 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
      submitButtonText: 'Send Message',
    },
    inquiryTypes: [
      { id: 'general', label: 'General Inquiry', order: 1 },
      { id: 'pricing', label: 'Pricing Information', order: 2 },
      { id: 'demo', label: 'Request a Demo', order: 3 },
      { id: 'support', label: 'Support Question', order: 4 },
    ],
  };
}

// ==========================================
// FOOTER DATA
// ==========================================

import type { FooterSettings, FooterLink } from '@/lib/hygraph';

/**
 * Get footer data (settings + links)
 * Returns defaults if not configured in CMS
 */
export async function getFooterData(): Promise<{
  settings: FooterSettings;
  links: FooterLink[];
}> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getFooterData();
  }

  // Return defaults for local provider
  return {
    settings: {
      siteName: 'Support Portal',
      tagline: 'Get help with your Discord integrations and server management.',
      logoIcon: undefined,
      quickLinksTitle: 'Quick Links',
      resourcesTitle: 'Resources',
      communityTitle: 'Community',
      copyrightText: 'Support Portal',
      privacyPolicyUrl: '#',
      termsOfServiceUrl: '#',
    },
    links: [
      { id: 'default-1', title: 'Support Hub', url: '/support', section: 'quickLinks', external: false, order: 1 },
      { id: 'default-2', title: 'Knowledge Base', url: '/support/articles', section: 'quickLinks', external: false, order: 2 },
      { id: 'default-3', title: 'Submit Ticket', url: '/support/ticket', section: 'quickLinks', external: false, order: 3 },
      { id: 'default-4', title: 'Documentation', url: '#', icon: 'ArrowSquareOut', section: 'resources', external: true, order: 1 },
      { id: 'default-5', title: 'Discord Server', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 1 },
      { id: 'default-6', title: 'Twitter', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 2 },
      { id: 'default-7', title: 'GitHub', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 3 },
    ],
  };
}

// ==========================================
// HEADER/NAVBAR DATA
// ==========================================

import type { HeaderSettings, NavLink } from '@/lib/hygraph';

/**
 * Get header/navbar data (settings + nav links)
 * Returns defaults if not configured in CMS
 */
export async function getHeaderData(): Promise<{
  settings: HeaderSettings;
  navLinks: NavLink[];
}> {
  const provider = detectProvider();

  if (provider === 'hygraph') {
    return hygraph.getHeaderData();
  }

  // Return defaults for local provider
  return {
    settings: {
      siteName: 'Support Portal',
      subtitle: 'Help Center',
      logoIcon: undefined,
    },
    navLinks: [
      { id: 'default-1', title: 'Support Hub', url: '/support', icon: 'House', order: 1 },
      { id: 'default-2', title: 'Articles', url: '/support/articles', icon: 'BookOpenText', order: 2 },
      { id: 'default-3', title: 'Services', url: '/support/services', icon: 'Briefcase', order: 3 },
      { id: 'default-4', title: 'Submit Ticket', url: '/support/ticket', icon: 'PaperPlaneTilt', order: 4 },
    ],
  };
}
