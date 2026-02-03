/**
 * Unified CMS Module
 *
 * Provides a single entry point for fetching articles and services from CMS.
 * Supports multi-tenant: uses tenant's Hygraph when available, falls back to env vars.
 *
 * Priority:
 * 1. Tenant's Hygraph config (if tenant has hygraphConfig in database)
 * 2. Environment variable Hygraph (HYGRAPH_ENDPOINT, HYGRAPH_TOKEN)
 * 3. Local fallback data
 *
 * See: docs/CLIENT_HYGRAPH_SETUP.md
 */

import { Article, ArticleCategory, ContactChannel, ResponseTimeItem, ContactPageSettings, ContactPageData } from '@/types';

// Import providers
import * as localData from '@/lib/data/articles';
import * as hygraph from '@/lib/hygraph';
import { HygraphClient, createHygraphClient } from '@/lib/hygraph';
import { getTenantFromRequest } from '@/lib/tenant';
import { prisma } from '@/lib/db/client';
import { decryptFromString } from '@/lib/security/crypto';

// Re-export types from central types file
export type { ContactChannel, ResponseTimeItem, ContactPageSettings, ContactPageData } from '@/types';

// Re-export service types from Hygraph
export type { Service, ServiceTier, SLAHighlight, HelpfulResource, ServicesPageContent, FooterSettings, FooterLink, HeaderSettings, NavLink, TicketCategory, LandingFeature, LandingPageContent, PricingFeature, PricingPageContent } from '@/lib/hygraph';

type CMSProvider = 'hygraph' | 'local';

/**
 * Check if the current request is from a tenant subdomain.
 * Used to decide whether to return empty data or hardcoded defaults
 * when no Hygraph client is available.
 */
async function isTenantContext(): Promise<boolean> {
  try {
    const tenant = await getTenantFromRequest();
    return !!tenant;
  } catch {
    return false;
  }
}

/**
 * Get the Hygraph client for the current request
 * Returns tenant's client if configured, otherwise default client (main domain only)
 * Tenants without their own Hygraph config get null (empty/fallback content)
 */
async function getHygraphClient(): Promise<HygraphClient | null> {
  try {
    const tenant = await getTenantFromRequest();

    // If tenant has Hygraph config, use their client
    if (tenant?.hygraph?.endpoint && tenant?.hygraph?.token) {
      console.log(`[CMS] Using tenant Hygraph config for: ${tenant.slug}`);
      return createHygraphClient(tenant.hygraph.endpoint, tenant.hygraph.token);
    }

    // Tenant exists but no Hygraph config - return null (don't use main domain credentials)
    if (tenant) {
      console.log(`[CMS] Tenant ${tenant.slug} has no Hygraph config, returning null`);
      return null;
    }
  } catch {
    // Not in a request context (e.g., build time), fall through to default
  }

  // Main domain - use default client (env vars)
  if (hygraph.isAvailable()) {
    console.log('[CMS] Using default Hygraph client (env vars)');
    return hygraph.hygraph;
  }

  console.log('[CMS] No Hygraph client available');
  return null;
}

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
  const client = await getHygraphClient();
  console.log('[CMS] getArticles - client available:', !!client);

  if (client) {
    const articles = await client.getArticles();
    console.log('[CMS] getArticles - got', articles.length, 'articles from Hygraph');
    return articles;
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) return [];

  console.log('[CMS] getArticles - using local fallback');
  return localData.articles;
}

/**
 * Get all categories from the configured CMS
 */
export async function getCategories(): Promise<ArticleCategory[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getCategories();
  }

  if (await isTenantContext()) return [];

  return localData.categories;
}

/**
 * Get an article by slug from the configured CMS
 */
export async function getArticleBySlug(slug: string): Promise<Article | null> {
  const client = await getHygraphClient();

  if (client) {
    return client.getArticleBySlug(slug);
  }

  if (await isTenantContext()) return null;

  return localData.getArticleBySlug(slug) || null;
}

/**
 * Search articles from the configured CMS
 */
export async function searchArticles(query: string): Promise<Article[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.searchArticles(query);
  }

  if (await isTenantContext()) return [];

  return localData.searchArticles(query);
}

/**
 * Get articles by category from the configured CMS
 */
export async function getArticlesByCategory(categorySlug: string): Promise<Article[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getArticlesByCategory(categorySlug);
  }

  if (await isTenantContext()) return [];

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
  const client = await getHygraphClient();

  if (client) {
    return client.hasServices();
  }

  return false;
}

/**
 * Get all services from the CMS
 */
export async function getServices(): Promise<Service[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getServices();
  }

  return [];
}

/**
 * Get a service by slug
 */
export async function getServiceBySlug(slug: string): Promise<Service | null> {
  const client = await getHygraphClient();

  if (client) {
    return client.getServiceBySlug(slug);
  }

  return null;
}

/**
 * Get all service tiers from the CMS
 */
export async function getServiceTiers(): Promise<ServiceTier[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getServiceTiers();
  }

  return [];
}

/**
 * Check if pricing page should be shown (has service tiers configured)
 */
export async function hasPricingPage(): Promise<boolean> {
  const tiers = await getServiceTiers();
  return tiers.length > 0;
}

/**
 * Get SLA highlights from the CMS
 */
export async function getSLAHighlights(): Promise<SLAHighlight[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getSLAHighlights();
  }

  return [];
}

/**
 * Get helpful resources from the CMS (CMS-driven links section)
 * Returns empty array if none configured - section won't render
 */
export async function getHelpfulResources(): Promise<HelpfulResource[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getHelpfulResources();
  }

  return [];
}

import type { ServicesPageContent } from '@/lib/hygraph';

/**
 * Get services page content (section titles and descriptions)
 * Returns defaults if not configured in CMS
 */
export async function getServicesPageContent(): Promise<ServicesPageContent> {
  const client = await getHygraphClient();

  if (client) {
    return client.getServicesPageContent();
  }

  // Tenants without Hygraph get empty defaults
  if (await isTenantContext()) {
    return {
      heroTitle: '', heroSubtitle: '', servicesTitle: '', servicesSubtitle: '',
      slaTitle: '', slaSubtitle: '', resourcesTitle: '', resourcesSubtitle: '',
      ctaTitle: '', ctaSubtitle: '',
    };
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

/**
 * Get contact page settings (for /support/contact page)
 * Returns defaults if not configured in CMS
 */
export async function getContactPageSettings(): Promise<ContactPageSettings> {
  const client = await getHygraphClient();

  if (client) {
    return client.getContactPageSettings();
  }

  // Tenants without Hygraph get empty defaults
  if (await isTenantContext()) {
    return {
      pageTitle: '', pageSubtitle: '', discordUrl: undefined, emailAddress: undefined,
      responseSectionTitle: '', responseSectionNote: '', showResponseTimes: false,
    };
  }

  // Return defaults for local provider
  return {
    pageTitle: 'Contact Us',
    pageSubtitle: 'Have questions or need assistance? We\'re here to help.',
    discordUrl: undefined,
    emailAddress: undefined,
    responseSectionTitle: 'Response Time Expectations',
    responseSectionNote: 'Response times may vary based on complexity and current volume.',
    showResponseTimes: true,
  };
}

/**
 * Check if contact page settings exist in CMS
 * Returns true if ContactPageSettings entry exists (contact page is configured)
 */
export async function hasContactPageSettings(): Promise<boolean> {
  const client = await getHygraphClient();

  if (client) {
    return client.hasContactPageSettings();
  }

  return false;
}

/**
 * Get contact channels for contact page
 * Returns enabled channels sorted by order
 */
export async function getContactChannels(): Promise<ContactChannel[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getContactChannels();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) return [];

  // Return defaults for local provider
  return [
    {
      id: 'default-ticket',
      name: 'Submit a Ticket',
      slug: 'ticket',
      description: 'Create a support ticket for detailed technical issues, billing questions, or requests that need formal tracking.',
      icon: 'Ticket',
      color: '#f97316',
      url: '/support/ticket',
      external: false,
      responseTime: '24-48 hours',
      bestFor: ['Detailed technical problems', 'Billing or account issues', 'Feature requests'],
      features: ['Tracked responses', 'File attachments', 'Priority queue'],
      order: 1,
      enabled: true,
    },
    {
      id: 'default-discord',
      name: 'Join Discord',
      slug: 'discord',
      description: 'Connect with our community and support team in real-time. Great for quick questions and community discussions.',
      icon: 'DiscordLogo',
      color: '#5865F2',
      url: '#',
      external: true,
      responseTime: 'Usually within hours',
      bestFor: ['Quick questions', 'Community discussions', 'Real-time support'],
      features: ['Real-time chat', 'Community help', 'Announcements'],
      order: 2,
      enabled: true,
    },
    {
      id: 'default-email',
      name: 'Email Us',
      slug: 'email',
      description: 'Send us an email directly for business inquiries, partnerships, or if you prefer traditional communication.',
      icon: 'Envelope',
      color: '#10B981',
      url: 'mailto:support@example.com',
      external: true,
      responseTime: '1-2 business days',
      bestFor: ['Business inquiries', 'Partnership requests', 'Formal documentation'],
      features: ['Formal communication', 'Document sharing', 'Record keeping'],
      order: 3,
      enabled: true,
    },
  ];
}

/**
 * Get response time items for contact page
 * Returns items sorted by order
 */
export async function getResponseTimeItems(): Promise<ResponseTimeItem[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getResponseTimeItems();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) return [];

  // Return defaults for local provider
  return [
    { id: 'default-discord', label: 'Discord', time: 'Usually within hours', color: '#5865F2', order: 1 },
    { id: 'default-tickets', label: 'Tickets', time: '24-48 hours', color: '#f97316', order: 2 },
    { id: 'default-email', label: 'Email', time: '1-2 business days', color: '#10B981', order: 3 },
  ];
}

/**
 * Get all contact page data in a single combined query
 * Reduces API calls from 3 to 1
 */
export async function getContactPageData(): Promise<ContactPageData> {
  const client = await getHygraphClient();

  if (client) {
    return client.getContactPageData();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      settings: { pageTitle: '', pageSubtitle: '', discordUrl: undefined, emailAddress: undefined, responseSectionTitle: '', responseSectionNote: '', showResponseTimes: false },
      channels: [],
      responseTimes: [],
    };
  }

  // Return defaults for local provider
  const [settings, channels, responseTimes] = await Promise.all([
    getContactPageSettings(),
    getContactChannels(),
    getResponseTimeItems(),
  ]);

  return { settings, channels, responseTimes };
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
}> {
  const client = await getHygraphClient();

  if (client) {
    return client.getServicesPageData();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      services: [], serviceTiers: [], slaHighlights: [], helpfulResources: [],
      pageContent: { heroTitle: '', heroSubtitle: '', servicesTitle: '', servicesSubtitle: '', slaTitle: '', slaSubtitle: '', resourcesTitle: '', resourcesSubtitle: '', ctaTitle: '', ctaSubtitle: '' },
    };
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
  const client = await getHygraphClient();

  if (client) {
    return client.getFooterData();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      settings: {
        siteName: '', subtitle: '', tagline: '', logoIcon: undefined,
        quickLinksTitle: '', resourcesTitle: '', communityTitle: '',
        copyrightText: '', privacyPolicyUrl: '', termsOfServiceUrl: '',
      },
      links: [],
    };
  }

  // Return defaults for local provider
  return {
    settings: {
      siteName: 'Support Portal',
      subtitle: 'Help Center',
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
      { id: 'default-1', title: 'Support Hub', url: '/support', section: 'quickLinks', location: 'footerQuickLinks' as const, external: false, order: 1 },
      { id: 'default-2', title: 'Knowledge Base', url: '/support/articles', section: 'quickLinks', location: 'footerQuickLinks' as const, external: false, order: 2 },
      { id: 'default-3', title: 'Submit Ticket', url: '/support/ticket', section: 'quickLinks', location: 'footerQuickLinks' as const, external: false, order: 3 },
      { id: 'default-4', title: 'Documentation', url: '#', icon: 'ArrowSquareOut', section: 'resources', location: 'footerResources' as const, external: true, order: 1 },
      { id: 'default-5', title: 'Discord Server', url: '#', icon: 'ArrowSquareOut', section: 'community', location: 'footerCommunity' as const, external: true, order: 1 },
      { id: 'default-6', title: 'Twitter', url: '#', icon: 'ArrowSquareOut', section: 'community', location: 'footerCommunity' as const, external: true, order: 2 },
      { id: 'default-7', title: 'GitHub', url: '#', icon: 'ArrowSquareOut', section: 'community', location: 'footerCommunity' as const, external: true, order: 3 },
    ],
  };
}

// ==========================================
// HEADER/NAVBAR DATA
// ==========================================

import type { HeaderSettings, NavLink } from '@/lib/hygraph';

/**
 * Get header/navbar data (settings + nav links + page availability flags)
 * Returns defaults if not configured in CMS
 */
export async function getHeaderData(): Promise<{
  settings: HeaderSettings;
  navLinks: NavLink[];
  hasContactPage: boolean;
  hasLandingPage: boolean;
  hasPricingPage: boolean;
}> {
  const client = await getHygraphClient();

  if (client) {
    const [headerData, hasContact, landingContent, pricingTiers] = await Promise.all([
      client.getHeaderData(),
      client.hasContactPageSettings(),
      client.getLandingPageContentOrNull(),
      client.getServiceTiers(),
    ]);
    return {
      ...headerData,
      hasContactPage: hasContact,
      hasLandingPage: landingContent !== null,
      hasPricingPage: pricingTiers.length > 0,
    };
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      settings: { siteName: '', subtitle: '', logoIcon: undefined },
      navLinks: [],
      hasContactPage: false,
      hasLandingPage: false,
      hasPricingPage: false,
    };
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
      { id: 'default-5', title: 'Contact', url: '/support/contact', icon: 'Envelope', order: 5 },
    ],
    hasContactPage: true,
    hasLandingPage: false,
    hasPricingPage: false,
  };
}

// ==========================================
// TICKET FORM DATA
// ==========================================

import type { TicketCategory } from '@/lib/hygraph';

/**
 * Get ticket categories for the ticket form
 * Returns defaults if not configured in CMS
 */
export async function getTicketCategories(): Promise<TicketCategory[]> {
  const client = await getHygraphClient();

  if (client) {
    return client.getTicketCategories();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) return [];

  // Return defaults for local provider
  return [
    { id: 'technical', name: 'Technical Problem', icon: 'Wrench', order: 1 },
    { id: 'setup', name: 'Setup & Configuration', icon: 'Gear', order: 2 },
    { id: 'not-working', name: 'Feature Not Working', icon: 'WarningCircle', order: 3 },
    { id: 'permissions', name: 'Permission Issue', icon: 'Lock', order: 4 },
    { id: 'billing', name: 'Billing & Account', icon: 'CreditCard', order: 5 },
    { id: 'feedback', name: 'Feedback & Suggestions', icon: 'ChatCircle', order: 6 },
    { id: 'other', name: 'Other', icon: 'Question', order: 7 },
  ];
}

/**
 * Get ticket categories for a specific tenant by ID.
 * Used by the Discord bot where there is no HTTP request context.
 * Looks up the tenant's Hygraph config from DB, decrypts, and queries.
 * Falls back to default categories if tenant has no Hygraph config.
 */
export async function getTicketCategoriesForTenant(tenantId: string): Promise<TicketCategory[]> {
  try {
    const config = await prisma.tenantHygraphConfig.findUnique({
      where: { tenantId },
    });

    if (config) {
      const endpoint = decryptFromString(config.endpoint);
      const token = decryptFromString(config.token);
      const client = createHygraphClient(endpoint, token);
      return client.getTicketCategories();
    }
  } catch (error) {
    console.error(`[CMS] Failed to get ticket categories for tenant ${tenantId}:`, error);
  }

  // No tenant Hygraph config — try default client (env vars)
  if (hygraph.isAvailable()) {
    return hygraph.hygraph.getTicketCategories();
  }

  // Absolute fallback
  return [
    { id: 'technical', name: 'Technical Problem', icon: 'Wrench', order: 1 },
    { id: 'setup', name: 'Setup & Configuration', icon: 'Gear', order: 2 },
    { id: 'not-working', name: 'Feature Not Working', icon: 'WarningCircle', order: 3 },
    { id: 'permissions', name: 'Permission Issue', icon: 'Lock', order: 4 },
    { id: 'billing', name: 'Billing & Account', icon: 'CreditCard', order: 5 },
    { id: 'feedback', name: 'Feedback & Suggestions', icon: 'ChatCircle', order: 6 },
    { id: 'other', name: 'Other', icon: 'Question', order: 7 },
  ];
}

// ==========================================
// LANDING PAGE DATA
// ==========================================

import type { LandingPageContent, LandingFeature } from '@/lib/hygraph';

/**
 * Get landing page content
 * Returns defaults if not configured in CMS
 */
export async function getLandingPageContent(): Promise<LandingPageContent> {
  const client = await getHygraphClient();

  if (client) {
    return client.getLandingPageContent();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      heroTitle: '', heroHighlight: '', heroSubtitle: '', heroButtonText: '', heroButtonUrl: '',
      heroSecondaryButtonText: '', heroSecondaryButtonUrl: '',
      featuresTitle: '', featuresSubtitle: '', features: [],
      ctaTitle: '', ctaSubtitle: '', ctaButtonText: '', ctaButtonLink: '',
    };
  }

  // Return defaults for local provider
  return {
    heroTitle: 'Your Own',
    heroHighlight: 'Support Portal',
    heroSubtitle: 'Create a professional support portal for your Discord community. Knowledge base, service catalog, and Jira integration — all under your brand.',
    heroButtonText: 'Get Started — $5/mo',
    heroButtonUrl: '/signup',
    heroSecondaryButtonText: 'View Pricing',
    heroSecondaryButtonUrl: '/pricing',
    featuresTitle: 'Everything You Need',
    featuresSubtitle: 'Launch a fully-featured support portal in minutes, not months.',
    features: [
      { title: 'Knowledge Base', description: 'Create and organize help articles. Let your users find answers themselves with powerful search.', icon: 'BookOpenText' },
      { title: 'Custom Branding', description: 'Your subdomain, your logo, your colors. Make the portal feel like part of your brand.', icon: 'Palette' },
      { title: 'Discord Login', description: 'Users sign in with Discord. No passwords, no friction. Perfect for Discord communities.', icon: 'Discord' },
      { title: 'Service Catalog', description: 'Showcase your services and pricing tiers. Let customers know exactly what you offer.', icon: 'Briefcase' },
      { title: 'Ticket System', description: 'Users can submit support tickets. Integrates with Jira Service Desk for powerful workflows.', icon: 'Ticket' },
      { title: 'CMS Powered', description: 'Manage content with Hygraph CMS. Update articles and settings without touching code.', icon: 'Lightning' },
    ],
    ctaTitle: 'Ready to Get Started?',
    ctaSubtitle: 'Create your support portal today. $15 to start ($10 setup + $5 first month), then just $5/month. Cancel anytime.',
    ctaButtonText: 'Create Your Portal',
    ctaButtonLink: '/signup',
  };
}

/**
 * Get landing page content if it exists in CMS
 * Returns null if no landing page is configured
 * Used for optional tenant landing pages
 */
export async function getLandingPageContentOrNull(): Promise<LandingPageContent | null> {
  const client = await getHygraphClient();

  if (client) {
    const content = await client.getLandingPageContentOrNull();
    console.log('[CMS] getLandingPageContentOrNull:', content ? 'found' : 'null');
    return content;
  }

  // Local provider has no landing page by default
  console.log('[CMS] getLandingPageContentOrNull: no client, returning null');
  return null;
}

// ==========================================
// PRICING PAGE DATA
// ==========================================

import type { PricingPageContent, PricingFeature } from '@/lib/hygraph';

/**
 * Get pricing page content
 * Returns defaults if not configured in CMS
 */
export async function getPricingPageContent(): Promise<PricingPageContent> {
  const client = await getHygraphClient();

  if (client) {
    return client.getPricingPageContent();
  }

  // Tenants without Hygraph get empty data
  if (await isTenantContext()) {
    return {
      pageTitle: '', pageSubtitle: '', planName: '', planDescription: '',
      monthlyPrice: '0', setupFee: '0', features: [],
      ctaText: '', ctaLink: '', footerNote: '',
    };
  }

  // Return defaults for local provider
  return {
    pageTitle: 'Simple, Transparent Pricing',
    pageSubtitle: 'One plan, everything included. No hidden fees, no surprises.',
    planName: 'Pro',
    planDescription: 'Everything you need to run a professional support portal',
    monthlyPrice: '5',
    setupFee: '10',
    features: [
      { text: 'Custom branded support portal', included: true },
      { text: 'Discord authentication for your users', included: true },
      { text: 'Knowledge base with articles', included: true },
      { text: 'Service catalog', included: true },
      { text: 'Jira Service Desk integration', included: true },
      { text: 'Custom subdomain (yourname.helpportal.app)', included: true },
      { text: 'Custom logo and colors', included: true },
      { text: 'Unlimited articles', included: true },
      { text: 'Priority support', included: true },
    ],
    ctaText: 'Get Started',
    ctaLink: '/signup',
    footerNote: 'Cancel anytime. No long-term contracts.',
  };
}

// ==========================================
// SIGNUP & ONBOARDING (Context-aware)
// ==========================================

/**
 * Signup configuration (CMS-driven)
 */
export interface SignupConfig {
  signupEnabled: boolean;
  requirePayment: boolean;
  allowFreeSignup: boolean;
  welcomeTitle: string;
  welcomeSubtitle?: string;
  loginButtonText: string;
  successRedirect: string;
}

/**
 * Onboarding step field (CMS-driven)
 */
export interface OnboardingField {
  name: string;
  label: string;
  type: 'TEXT' | 'EMAIL' | 'SELECT' | 'COLOR' | 'THEME' | 'IMAGE_URL' | 'TEXTAREA';
  required: boolean;
  placeholder?: string;
  options?: string[];
}

/**
 * Onboarding step (CMS-driven)
 */
export interface OnboardingStep {
  id: string;
  title: string;
  description?: string;
  type: 'SUBDOMAIN' | 'BRANDING' | 'CUSTOM_FIELDS' | 'WELCOME';
  required: boolean;
  fields?: OnboardingField[];
}

/**
 * Onboarding configuration (CMS-driven)
 */
export interface OnboardingConfig {
  steps: OnboardingStep[];
  completionTitle: string;
  completionMessage?: string;
  completionCtaText: string;
  completionCtaLink: string;
}

/**
 * Get signup configuration by context
 */
export async function getSignupConfig(context: string): Promise<SignupConfig> {
  const client = await getHygraphClient() as HygraphClient & {
    getSignupConfig?: (context: string) => Promise<SignupConfig>;
  };

  if (client && typeof client.getSignupConfig === 'function') {
    return client.getSignupConfig(context);
  }

  // Tenants without Hygraph get empty defaults
  if (await isTenantContext()) {
    return {
      signupEnabled: true,
      requirePayment: false,
      allowFreeSignup: true,
      welcomeTitle: 'Welcome',
      welcomeSubtitle: '',
      loginButtonText: 'Sign in with Discord',
      successRedirect: '/dashboard',
    };
  }

  // Return defaults
  return {
    signupEnabled: true,
    requirePayment: context === 'main', // Main domain requires payment
    allowFreeSignup: context !== 'main', // Subdomains allow free signup by default
    welcomeTitle: context === 'main' ? 'Create Your Support Portal' : 'Join Our Community',
    welcomeSubtitle: context === 'main'
      ? 'Sign in with Discord to get started'
      : 'Sign in to access exclusive features',
    loginButtonText: 'Sign in with Discord',
    successRedirect: context === 'main' ? '/onboarding' : '/dashboard',
  };
}

/**
 * Get onboarding configuration by context
 */
export async function getOnboardingConfig(context: string): Promise<OnboardingConfig> {
  const client = await getHygraphClient() as HygraphClient & {
    getOnboardingConfig?: (context: string) => Promise<OnboardingConfig>;
  };

  if (client && typeof client.getOnboardingConfig === 'function') {
    return client.getOnboardingConfig(context);
  }

  // Tenants without Hygraph get minimal onboarding
  if (await isTenantContext()) {
    return {
      steps: [
        { id: 'welcome', title: 'Welcome!', description: 'Your account has been created.', type: 'WELCOME' as const, required: true },
      ],
      completionTitle: 'Welcome!',
      completionMessage: 'Your account is ready.',
      completionCtaText: 'Continue',
      completionCtaLink: '/dashboard',
    };
  }

  // Return defaults for main domain (full portal setup)
  if (context === 'main') {
    return {
      steps: [
        {
          id: 'subdomain',
          title: 'Choose Your Subdomain',
          description: 'Pick a unique subdomain for your support portal',
          type: 'SUBDOMAIN',
          required: true,
        },
        {
          id: 'branding',
          title: 'Customize Your Portal',
          description: 'Choose a theme and optionally add your logo',
          type: 'BRANDING',
          required: false,
          fields: [
            { name: 'portalName', label: 'Portal Name', type: 'TEXT', required: false, placeholder: 'My Support Portal' },
            { name: 'theme', label: 'Choose Your Theme', type: 'THEME', required: false },
            { name: 'logoUrl', label: 'Logo URL (optional)', type: 'IMAGE_URL', required: false, placeholder: 'https://...' },
          ],
        },
      ],
      completionTitle: 'Your Portal is Ready!',
      completionMessage: 'Your support portal has been created successfully.',
      completionCtaText: 'Go to Dashboard',
      completionCtaLink: '/dashboard',
    };
  }

  // Return minimal onboarding for tenant subdomains
  return {
    steps: [
      {
        id: 'welcome',
        title: 'Welcome!',
        description: 'Your account has been created.',
        type: 'WELCOME',
        required: true,
      },
    ],
    completionTitle: 'Welcome!',
    completionMessage: 'Your account is ready.',
    completionCtaText: 'Go to Dashboard',
    completionCtaLink: '/dashboard',
  };
}
