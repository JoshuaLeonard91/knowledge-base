/**
 * Hygraph CMS Client
 *
 * GraphQL-based headless CMS integration.
 * Uses native fetch for GraphQL queries - no Apollo dependency needed.
 */

import { Article, ArticleCategory } from '@/types';

// Service types for CMS
export interface Service {
  id: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  icon: string;
  color: string;
  features: string[];
  relatedArticles: string[]; // Article slugs
  order: number;
  // Optional pricing and button customization
  priceLabel?: string; // e.g., "Starting at $99/mo" - empty = no badge
  buttonText?: string; // e.g., "View Plans" - empty = "Get Started"
}

export interface ServiceTier {
  id: string;
  name: string;
  slug: string;
  description: string;
  features: string[];
  responseTime: string;
  availability: string;
  supportChannels: string;
  highlighted: boolean;
  order: number;
  // Optional visual customization
  accentColor?: string; // Hex color for tier differentiation
  price?: string; // e.g., "Free", "$49/mo", "Custom"
  buttonText?: string; // e.g., "Get Started Free" - empty = "Contact Sales"
}

export interface SLAHighlight {
  id: string;
  title: string;
  description: string;
  icon: string;
  order: number;
  // Optional: display as large stat instead of icon
  statValue?: string; // e.g., "99.9%", "24/7", "<4hrs" - if set, shows as big text
}

// Helpful resource links (CMS-driven, replaces hardcoded section)
export interface HelpfulResource {
  id: string;
  title: string;
  description: string;
  icon: string;
  url: string; // Internal path like "/support/articles" or external URL
  color?: string; // Accent color for hover effect
  order: number;
}

// Services page content (section titles and descriptions)
export interface ServicesPageContent {
  heroTitle: string;
  heroSubtitle: string;
  servicesTitle: string;
  servicesSubtitle: string;
  slaTitle: string;
  slaSubtitle: string;
  resourcesTitle?: string;
  resourcesSubtitle?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
}

// Contact form settings (CMS-configurable) - for services page modal
export interface ContactSettings {
  // Form header
  formTitle: string;
  formSubtitle: string;
  // Field configuration
  companyFieldLabel: string; // "Company", "Discord Server", "Organization"
  companyFieldPlaceholder: string; // Auto-generated or custom
  // Messages
  successTitle: string;
  successMessage: string;
  // Button text
  submitButtonText: string;
}

// Contact page settings (CMS-configurable) - for /support/contact page
export interface ContactPageSettings {
  pageTitle?: string;
  pageSubtitle?: string;
  discordUrl?: string;
  emailAddress?: string;
}

// Inquiry type options for contact form dropdown
export interface InquiryType {
  id: string;
  label: string;
  order: number;
}

// Footer settings (CMS-configurable)
export interface FooterSettings {
  siteName: string;
  tagline: string;
  logoIcon?: string; // URL to custom logo image
  quickLinksTitle: string;
  resourcesTitle: string;
  communityTitle: string;
  copyrightText: string;
  privacyPolicyUrl: string;
  termsOfServiceUrl: string;
}

// Footer link for dynamic footer sections
export interface FooterLink {
  id: string;
  title: string;
  url: string;
  icon?: string; // Phosphor icon name
  external: boolean;
  section: 'quickLinks' | 'resources' | 'community';
  order: number;
}

// Header/Navbar settings (CMS-configurable)
export interface HeaderSettings {
  siteName: string;
  subtitle: string;
  logoIcon?: string; // URL to custom logo image
}

// Navigation link for navbar
export interface NavLink {
  id: string;
  title: string;
  url: string;
  icon: string; // Phosphor icon name (e.g., "House", "BookOpenText")
  order: number;
}

// Ticket form category (CMS-configurable) - single simplified model
export interface TicketCategory {
  id: string;
  name: string;
  icon: string; // Phosphor icon name
  order: number;
}

// Hygraph response types
interface HygraphService {
  id: string;
  name: string;
  slug: string;
  tagline?: string;
  description: string;
  icon?: string;
  color?: string;
  features: string[];
  relatedArticles?: Array<{ slug: string }>;
  order?: number;
  priceLabel?: string;
  buttonText?: string;
}

interface HygraphServiceTier {
  id: string;
  name: string;
  slug: string;
  description?: string;
  features: string[];
  responseTime?: string;
  availability?: string;
  supportChannels?: string;
  highlighted?: boolean;
  order?: number;
  accentColor?: { hex: string };
  price?: string;
  buttonText?: string;
}

interface HygraphSLAHighlight {
  id: string;
  title: string;
  description: string;
  icon?: string;
  order?: number;
  statValue?: string;
}

interface HygraphHelpfulResource {
  id: string;
  title: string;
  description: string;
  icon?: string;
  url: string;
  color?: { hex: string };
  order?: number;
}

interface HygraphServicesPageContent {
  heroTitle?: string;
  heroSubtitle?: string;
  servicesTitle?: string;
  servicesSubtitle?: string;
  slaTitle?: string;
  slaSubtitle?: string;
  resourcesTitle?: string;
  resourcesSubtitle?: string;
  ctaTitle?: string;
  ctaSubtitle?: string;
}

interface HygraphContactSettings {
  formTitle?: string;
  formSubtitle?: string;
  companyFieldLabel?: string;
  companyFieldPlaceholder?: string;
  successTitle?: string;
  successMessage?: string;
  submitButtonText?: string;
}

interface HygraphContactPageSettings {
  pageTitle?: string;
  pageSubtitle?: string;
  discordUrl?: string;
  emailAddress?: string;
}

interface HygraphInquiryType {
  id: string;
  typeId?: string; // Custom field since 'id' is reserved in Hygraph
  label: string;
  order?: number;
}

interface HygraphFooterSettings {
  siteName?: string;
  tagline?: string;
  logoIcon?: { url: string };
  quickLinksTitle?: string;
  resourcesTitle?: string;
  communityTitle?: string;
  copyrightText?: string;
  privacyPolicyUrl?: string;
  termsOfServiceUrl?: string;
}

interface HygraphFooterLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  external?: boolean;
  section: string;
  order?: number;
}

interface HygraphHeaderSettings {
  siteName?: string;
  subtitle?: string;
  logoIcon?: { url: string };
}

interface HygraphNavLink {
  id: string;
  title: string;
  url: string;
  icon?: string;
  order?: number;
}

interface HygraphTicketCategory {
  id: string;
  categoryId?: string; // Custom field since 'id' is reserved in Hygraph
  name: string;
  icon?: string;
  order?: number;
}

interface HygraphArticle {
  slug: string;
  title: string;
  excerpt: string;
  content: {
    markdown?: string;
    html?: string;
    text?: string;
  };
  category?: {
    name: string;
    description?: string;
    icon?: string;
  };
  keywords: string[];
  icon?: string;
  readTime?: number;
}

interface HygraphCategory {
  slug: string;
  name: string;
  description?: string;
  icon?: string;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

class HygraphClient {
  private endpoint: string | null;
  private token: string | null;
  private isConfigured: boolean;
  private cache: Map<string, { data: unknown; timestamp: number }> = new Map();
  private cacheDuration = 300000; // 5 minutes

  constructor() {
    this.endpoint = process.env.HYGRAPH_ENDPOINT || null;
    this.token = process.env.HYGRAPH_TOKEN || null;
    this.isConfigured = !!(this.endpoint && this.token);

    if (this.isConfigured) {
      console.log('[Hygraph] Configured with endpoint:', this.endpoint?.split('/').slice(0, 3).join('/'));
    }
  }

  /**
   * Check if Hygraph is properly configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Execute a GraphQL query
   */
  private async query<T>(
    queryString: string,
    variables?: Record<string, unknown>
  ): Promise<T | null> {
    if (!this.isConfigured || !this.endpoint) {
      return null;
    }

    // Check cache
    const cacheKey = JSON.stringify({ queryString, variables });
    const cached = this.cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < this.cacheDuration) {
      return cached.data as T;
    }

    try {
      const response = await fetch(this.endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(this.token && { Authorization: `Bearer ${this.token}` }),
        },
        body: JSON.stringify({
          query: queryString,
          variables,
        }),
        next: { revalidate: 300 },
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('[Hygraph] HTTP error:', response.status, errorText);
        return null;
      }

      const result: GraphQLResponse<T> = await response.json();

      if (result.errors) {
        // Extract query name for better debugging
        const queryMatch = queryString.match(/query\s+(\w+)/);
        const queryName = queryMatch ? queryMatch[1] : 'Unknown';
        console.error(`[Hygraph] GraphQL errors in ${queryName}:`, JSON.stringify(result.errors, null, 2));
        return null;
      }

      // Cache the result
      if (result.data) {
        this.cache.set(cacheKey, { data: result.data, timestamp: Date.now() });
      }

      return result.data || null;
    } catch (error) {
      console.error('[Hygraph] Query error:', error);
      return null;
    }
  }

  /**
   * Get all articles
   */
  async getArticles(): Promise<Article[]> {
    const data = await this.query<{ articles: HygraphArticle[] }>(`
      query GetArticles {
        articles(first: 100, orderBy: publishedAt_DESC) {
          slug
          title
          excerpt
          content {
            markdown
            html
            text
          }
          category {
            name
            description
            icon
          }
          keywords
          icon
          readTime
        }
      }
    `);

    if (!data?.articles) {
      return [];
    }

    return data.articles.map((article) => this.transformArticle(article));
  }

  /**
   * Get all categories
   */
  async getCategories(): Promise<ArticleCategory[]> {
    const data = await this.query<{ categories: HygraphCategory[] }>(`
      query GetCategories {
        categories(first: 50) {
          slug
          name
          description
          icon
        }
      }
    `);

    if (!data?.categories) {
      return [];
    }

    return data.categories.map((cat) => ({
      id: cat.slug,
      name: cat.name,
      description: cat.description || '',
      icon: cat.icon || this.getCategoryIcon(cat.slug),
    }));
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<Article | null> {
    const data = await this.query<{ article: HygraphArticle | null }>(
      `
      query GetArticle($slug: String!) {
        article(where: { slug: $slug }) {
          slug
          title
          excerpt
          content {
            markdown
            html
            text
          }
          category {
            name
            description
            icon
          }
          keywords
          icon
          readTime
        }
      }
    `,
      { slug }
    );

    if (!data?.article) {
      return null;
    }

    return this.transformArticle(data.article);
  }

  /**
   * Search articles
   * Searches title, excerpt, and searchText fields via GraphQL
   * Note: Rich Text content cannot be filtered in Hygraph WHERE clauses
   */
  async searchArticles(query: string): Promise<Article[]> {
    // GraphQL search on title, excerpt, and searchText (all support _contains)
    const data = await this.query<{ articles: HygraphArticle[] }>(
      `
      query SearchArticles($query: String!) {
        articles(
          where: {
            OR: [
              { title_contains: $query }
              { excerpt_contains: $query }
              { searchText_contains: $query }
            ]
          }
          first: 20
        ) {
          slug
          title
          excerpt
          content {
            markdown
            html
            text
          }
          category {
            name
            description
            icon
          }
          keywords
          icon
          readTime
        }
      }
    `,
      { query }
    );

    if (!data?.articles) {
      return [];
    }

    return data.articles.map((article) => this.transformArticle(article));
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(categorySlug: string): Promise<Article[]> {
    const data = await this.query<{ articles: HygraphArticle[] }>(
      `
      query GetArticlesByCategory($categorySlug: String!) {
        articles(
          where: { category: { slug: $categorySlug } }
          first: 100
          orderBy: publishedAt_DESC
        ) {
          slug
          title
          excerpt
          content {
            markdown
            html
            text
          }
          category {
            name
            description
            icon
          }
          keywords
          icon
          readTime
        }
      }
    `,
      { categorySlug }
    );

    if (!data?.articles) {
      return [];
    }

    return data.articles.map((article) => this.transformArticle(article));
  }

  /**
   * Get site theme configuration
   * Each tenant has their own Hygraph project with one SiteTheme entry
   */
  async getSiteTheme(): Promise<{ name?: string; accentPrimary: string } | null> {
    const data = await this.query<{
      siteThemes: Array<{ name?: string; accentPrimary: { hex: string } }>;
    }>(
      `
      query GetSiteTheme {
        siteThemes(first: 1) {
          name
          accentPrimary { hex }
        }
      }
      `
    );

    if (!data?.siteThemes?.[0]) {
      return null;
    }

    const theme = data.siteThemes[0];
    return {
      name: theme.name,
      accentPrimary: theme.accentPrimary.hex,
    };
  }

  /**
   * Transform Hygraph article to our Article type
   */
  private transformArticle(article: HygraphArticle): Article {
    const categorySlug = article.category?.name
      ? this.nameToSlug(article.category.name)
      : 'general';

    // Get content - prefer markdown, fallback to html or text
    let content = '';
    if (article.content?.markdown) {
      content = article.content.markdown;
    } else if (article.content?.html) {
      content = this.htmlToMarkdown(article.content.html);
    } else if (article.content?.text) {
      content = article.content.text;
    }

    return {
      slug: article.slug,
      title: article.title,
      excerpt: article.excerpt || this.extractExcerpt(content),
      category: categorySlug,
      content,
      keywords: article.keywords || [],
      icon: article.icon || 'Article',
      readTime: article.readTime || this.estimateReadTime(content),
      topic: 'general',
      relatedSlugs: [],
    };
  }

  /**
   * Convert name to URL-friendly slug
   */
  private nameToSlug(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
  }

  /**
   * Convert HTML to markdown
   */
  private htmlToMarkdown(html: string): string {
    return html
      .replace(/<h1[^>]*>(.*?)<\/h1>/gi, '# $1\n\n')
      .replace(/<h2[^>]*>(.*?)<\/h2>/gi, '## $1\n\n')
      .replace(/<h3[^>]*>(.*?)<\/h3>/gi, '### $1\n\n')
      .replace(/<strong>(.*?)<\/strong>/gi, '**$1**')
      .replace(/<b>(.*?)<\/b>/gi, '**$1**')
      .replace(/<em>(.*?)<\/em>/gi, '*$1*')
      .replace(/<i>(.*?)<\/i>/gi, '*$1*')
      .replace(/<code>(.*?)<\/code>/gi, '`$1`')
      .replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)')
      .replace(/<img[^>]*src="([^"]*)"[^>]*alt="([^"]*)"[^>]*\/?>/gi, '![$2]($1)\n\n')
      .replace(/<img[^>]*src="([^"]*)"[^>]*\/?>/gi, '![]($1)\n\n')
      .replace(/<ul[^>]*>/gi, '')
      .replace(/<\/ul>/gi, '\n')
      .replace(/<li[^>]*>(.*?)<\/li>/gi, '- $1\n')
      .replace(/<p[^>]*>(.*?)<\/p>/gi, '$1\n\n')
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<[^>]+>/g, '')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&nbsp;/g, ' ')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }

  /**
   * Extract excerpt from content
   */
  private extractExcerpt(content: string): string {
    const text = content.replace(/<[^>]*>/g, '').replace(/[#*`]/g, '').trim();
    return text.length > 150 ? text.slice(0, 150) + '...' : text;
  }

  /**
   * Estimate read time based on content length
   */
  private estimateReadTime(content: string): number {
    const words = content.split(/\s+/).length;
    return Math.max(1, Math.ceil(words / 200));
  }

  /**
   * Get default icon for category
   */
  private getCategoryIcon(slug: string): string {
    const iconMap: Record<string, string> = {
      'getting-started': 'Rocket',
      'faq': 'Question',
      'troubleshooting': 'Wrench',
      'guides': 'BookOpen',
      'tutorials': 'GraduationCap',
      'api': 'Code',
      'security': 'Shield',
      'billing': 'CreditCard',
      'account': 'User',
      'integrations': 'Plug',
      'general': 'FileText',
    };
    return iconMap[slug] || 'Article';
  }

  // ==========================================
  // SERVICES
  // ==========================================

  /**
   * Get all services
   * Grid: 1 col (mobile) → 2 cols (tablet) → 3 cols (desktop)
   * Recommended: 3-9 services | Max: 12 for good UX
   */
  async getServices(): Promise<Service[]> {
    const data = await this.query<{ services: HygraphService[] }>(`
      query GetServices {
        services(first: 12, orderBy: order_ASC) {
          id
          name
          slug
          tagline
          description
          icon
          color
          features
          relatedArticles {
            slug
          }
          order
          priceLabel
          buttonText
        }
      }
    `);

    if (!data?.services) {
      return [];
    }

    return data.services.map((service) => this.transformService(service));
  }

  /**
   * Get service by slug
   */
  async getServiceBySlug(slug: string): Promise<Service | null> {
    const data = await this.query<{ service: HygraphService | null }>(
      `
      query GetService($slug: String!) {
        service(where: { slug: $slug }) {
          id
          name
          slug
          tagline
          description
          icon
          color
          features
          relatedArticles {
            slug
          }
          order
        }
      }
    `,
      { slug }
    );

    if (!data?.service) {
      return null;
    }

    return this.transformService(data.service);
  }

  /**
   * Get all service tiers (pricing plans)
   * Grid: 1 col (mobile) → 2 cols (tablet) → 3-4 cols (desktop)
   * Recommended: 3 tiers (Free/Pro/Enterprise) | Max: 4 tiers
   */
  async getServiceTiers(): Promise<ServiceTier[]> {
    const data = await this.query<{ serviceTiers: HygraphServiceTier[] }>(`
      query GetServiceTiers {
        serviceTiers(first: 4, orderBy: order_ASC) {
          id
          name
          slug
          description
          features
          responseTime
          availability
          supportChannels
          highlighted
          order
          accentColor { hex }
          price
          buttonText
        }
      }
    `);

    if (!data?.serviceTiers) {
      return [];
    }

    return data.serviceTiers.map((tier) => this.transformServiceTier(tier));
  }

  /**
   * Get SLA highlights (trust badges/metrics)
   * Grid: 2 cols (mobile) → 3 cols (tablet) → 5-6 cols (desktop)
   * Recommended: 4-5 highlights | Max: 6 for single row
   */
  async getSLAHighlights(): Promise<SLAHighlight[]> {
    const data = await this.query<{ slaHighlights: HygraphSLAHighlight[] }>(`
      query GetSLAHighlights {
        slaHighlights(first: 6, orderBy: order_ASC) {
          id
          title
          description
          icon
          order
          statValue
        }
      }
    `);

    if (!data?.slaHighlights) {
      return [];
    }

    return data.slaHighlights.map((highlight) => this.transformSLAHighlight(highlight));
  }

  /**
   * Check if services are enabled (any services exist in CMS)
   */
  async hasServices(): Promise<boolean> {
    const data = await this.query<{ servicesConnection: { aggregate: { count: number } } }>(`
      query HasServices {
        servicesConnection {
          aggregate {
            count
          }
        }
      }
    `);

    return (data?.servicesConnection?.aggregate?.count ?? 0) > 0;
  }

  /**
   * Transform Hygraph service to our Service type
   */
  private transformService(service: HygraphService): Service {
    return {
      id: service.slug || service.id,
      name: service.name,
      slug: service.slug,
      tagline: service.tagline || '',
      description: service.description,
      icon: service.icon || 'Wrench',
      color: service.color || 'var(--accent-primary)',
      features: service.features || [],
      relatedArticles: service.relatedArticles?.map((a) => a.slug) || [],
      order: service.order ?? 0,
      priceLabel: service.priceLabel,
      buttonText: service.buttonText,
    };
  }

  /**
   * Transform Hygraph service tier
   */
  private transformServiceTier(tier: HygraphServiceTier): ServiceTier {
    return {
      id: tier.slug || tier.id,
      name: tier.name,
      slug: tier.slug,
      description: tier.description || '',
      features: tier.features || [],
      responseTime: tier.responseTime || 'Contact us',
      availability: tier.availability || 'Business hours',
      supportChannels: tier.supportChannels || 'Email',
      highlighted: tier.highlighted ?? false,
      order: tier.order ?? 0,
      accentColor: tier.accentColor?.hex,
      price: tier.price,
      buttonText: tier.buttonText,
    };
  }

  /**
   * Transform SLA highlight
   */
  private transformSLAHighlight(highlight: HygraphSLAHighlight): SLAHighlight {
    return {
      id: highlight.id,
      title: highlight.title,
      description: highlight.description,
      icon: highlight.icon || 'Check',
      order: highlight.order ?? 0,
      statValue: highlight.statValue,
    };
  }

  // ==========================================
  // HELPFUL RESOURCES
  // ==========================================

  /**
   * Get helpful resources (CMS-driven links section)
   * Grid: 1 col (mobile) → 3 cols (desktop)
   * If empty, section is hidden
   */
  async getHelpfulResources(): Promise<HelpfulResource[]> {
    const data = await this.query<{ helpfulResources: HygraphHelpfulResource[] }>(`
      query GetHelpfulResources {
        helpfulResources(first: 6, orderBy: order_ASC) {
          id
          title
          description
          icon
          url
          color { hex }
          order
        }
      }
    `);

    if (!data?.helpfulResources) {
      return [];
    }

    return data.helpfulResources.map((resource) => this.transformHelpfulResource(resource));
  }

  /**
   * Transform helpful resource
   */
  private transformHelpfulResource(resource: HygraphHelpfulResource): HelpfulResource {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      icon: resource.icon || 'BookOpenText',
      url: resource.url,
      color: resource.color?.hex,
      order: resource.order ?? 0,
    };
  }

  // ==========================================
  // SERVICES PAGE CONTENT
  // ==========================================

  /**
   * Get services page content (section titles and descriptions)
   * Returns defaults if not configured in CMS
   */
  async getServicesPageContent(): Promise<ServicesPageContent> {
    const data = await this.query<{ servicesPageContents: HygraphServicesPageContent[] }>(`
      query GetServicesPageContent {
        servicesPageContents(first: 1) {
          heroTitle
          heroSubtitle
          servicesTitle
          servicesSubtitle
          slaTitle
          slaSubtitle
          resourcesTitle
          resourcesSubtitle
          ctaTitle
          ctaSubtitle
        }
      }
    `);

    const content = data?.servicesPageContents?.[0];

    // Return with sensible defaults if no CMS content
    return {
      heroTitle: content?.heroTitle || 'Discord Solutions That Scale',
      heroSubtitle: content?.heroSubtitle || 'From managed bot services to custom development, we provide comprehensive solutions to help your Discord community thrive.',
      servicesTitle: content?.servicesTitle || 'What We Offer',
      servicesSubtitle: content?.servicesSubtitle || 'Choose from our range of professional services designed to meet the needs of Discord communities of all sizes.',
      slaTitle: content?.slaTitle || 'Service Level Agreements',
      slaSubtitle: content?.slaSubtitle || 'We stand behind our services with clear, transparent SLAs that give you peace of mind.',
      resourcesTitle: content?.resourcesTitle || 'Helpful Resources',
      resourcesSubtitle: content?.resourcesSubtitle || 'Explore our knowledge base to learn more about what we offer.',
      ctaTitle: content?.ctaTitle || 'Ready to get started?',
      ctaSubtitle: content?.ctaSubtitle || "Let's discuss how we can help your Discord community succeed.",
    };
  }

  // ==========================================
  // CONTACT SETTINGS
  // ==========================================

  /**
   * Get contact form settings (for services page modal)
   * Returns defaults if not configured in CMS
   */
  async getContactSettings(): Promise<ContactSettings> {
    const data = await this.query<{ contactSettings: HygraphContactSettings[] }>(`
      query GetContactSettings {
        contactSettings(first: 1) {
          formTitle
          formSubtitle
          companyFieldLabel
          companyFieldPlaceholder
          successTitle
          successMessage
          submitButtonText
        }
      }
    `);

    const settings = data?.contactSettings?.[0];
    const companyLabel = settings?.companyFieldLabel || 'Company / Server Name';

    return {
      formTitle: settings?.formTitle || 'Contact Us',
      formSubtitle: settings?.formSubtitle || "Tell us about your needs and we'll get back to you shortly.",
      companyFieldLabel: companyLabel,
      companyFieldPlaceholder: settings?.companyFieldPlaceholder || `Enter your ${companyLabel.toLowerCase()}`,
      successTitle: settings?.successTitle || 'Message Sent!',
      successMessage: settings?.successMessage || 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
      submitButtonText: settings?.submitButtonText || 'Send Message',
    };
  }

  /**
   * Get contact page settings (for /support/contact page)
   * Returns defaults if not configured in CMS
   */
  async getContactPageSettings(): Promise<ContactPageSettings> {
    const data = await this.query<{ contactPageSettings: HygraphContactPageSettings[] }>(`
      query GetContactPageSettings {
        contactPageSettings(first: 1) {
          pageTitle
          pageSubtitle
          discordUrl
          emailAddress
        }
      }
    `);

    const settings = data?.contactPageSettings?.[0];

    return {
      pageTitle: settings?.pageTitle,
      pageSubtitle: settings?.pageSubtitle,
      discordUrl: settings?.discordUrl,
      emailAddress: settings?.emailAddress,
    };
  }

  /**
   * Get inquiry type options for contact form
   * Returns defaults if not configured in CMS
   */
  async getInquiryTypes(): Promise<InquiryType[]> {
    const data = await this.query<{ inquiryTypes: HygraphInquiryType[] }>(`
      query GetInquiryTypes {
        inquiryTypes(first: 10, orderBy: order_ASC) {
          typeId
          label
          order
        }
      }
    `);

    if (data?.inquiryTypes && data.inquiryTypes.length > 0) {
      return data.inquiryTypes.map((type) => ({
        id: type.typeId || type.id,
        label: type.label,
        order: type.order ?? 0,
      }));
    }

    // Return defaults if no CMS content
    return [
      { id: 'general', label: 'General Inquiry', order: 1 },
      { id: 'pricing', label: 'Pricing Information', order: 2 },
      { id: 'demo', label: 'Request a Demo', order: 3 },
      { id: 'support', label: 'Support Question', order: 4 },
    ];
  }

  // ==========================================
  // COMBINED SERVICES PAGE DATA (Single Query)
  // ==========================================

  /**
   * Get all services page data in a single query
   * This reduces API calls from 7 to 1, avoiding rate limits
   */
  async getServicesPageData(): Promise<{
    services: Service[];
    serviceTiers: ServiceTier[];
    slaHighlights: SLAHighlight[];
    helpfulResources: HelpfulResource[];
    pageContent: ServicesPageContent;
    contactSettings: ContactSettings;
    inquiryTypes: InquiryType[];
  }> {
    const data = await this.query<{
      services: HygraphService[];
      serviceTiers: HygraphServiceTier[];
      slaHighlights: HygraphSLAHighlight[];
      helpfulResources: HygraphHelpfulResource[];
      servicesPageContents: HygraphServicesPageContent[];
      contactSettings: HygraphContactSettings[];
      inquiryTypes: HygraphInquiryType[];
    }>(`
      query GetServicesPageData {
        services(first: 12, orderBy: order_ASC) {
          id
          name
          slug
          tagline
          description
          icon
          color
          features
          relatedArticles { slug }
          order
          priceLabel
          buttonText
        }
        serviceTiers(first: 4, orderBy: order_ASC) {
          id
          name
          slug
          description
          features
          responseTime
          availability
          supportChannels
          highlighted
          order
          accentColor { hex }
          price
          buttonText
        }
        slaHighlights(first: 6, orderBy: order_ASC) {
          id
          title
          description
          icon
          order
          statValue
        }
        helpfulResources(first: 6, orderBy: order_ASC) {
          id
          title
          description
          icon
          url
          color { hex }
          order
        }
        servicesPageContents(first: 1) {
          heroTitle
          heroSubtitle
          servicesTitle
          servicesSubtitle
          slaTitle
          slaSubtitle
          resourcesTitle
          resourcesSubtitle
          ctaTitle
          ctaSubtitle
        }
        contactSettings(first: 1) {
          formTitle
          formSubtitle
          companyFieldLabel
          companyFieldPlaceholder
          successTitle
          successMessage
          submitButtonText
        }
        inquiryTypes(first: 10, orderBy: order_ASC) {
          typeId
          label
          order
        }
      }
    `);

    // Transform services
    const services = (data?.services || []).map((s) => this.transformService(s));

    // Transform service tiers
    const serviceTiers = (data?.serviceTiers || []).map((t) => this.transformServiceTier(t));

    // Transform SLA highlights
    const slaHighlights = (data?.slaHighlights || []).map((h) => this.transformSLAHighlight(h));

    // Transform helpful resources
    const helpfulResources = (data?.helpfulResources || []).map((r) => this.transformHelpfulResource(r));

    // Page content with defaults
    const content = data?.servicesPageContents?.[0];
    const pageContent: ServicesPageContent = {
      heroTitle: content?.heroTitle || 'Discord Solutions That Scale',
      heroSubtitle: content?.heroSubtitle || 'From managed bot services to custom development, we provide comprehensive solutions to help your Discord community thrive.',
      servicesTitle: content?.servicesTitle || 'What We Offer',
      servicesSubtitle: content?.servicesSubtitle || 'Choose from our range of professional services designed to meet the needs of Discord communities of all sizes.',
      slaTitle: content?.slaTitle || 'Service Level Agreements',
      slaSubtitle: content?.slaSubtitle || 'We stand behind our services with clear, transparent SLAs that give you peace of mind.',
      resourcesTitle: content?.resourcesTitle || 'Helpful Resources',
      resourcesSubtitle: content?.resourcesSubtitle || 'Explore our knowledge base to learn more about what we offer.',
      ctaTitle: content?.ctaTitle || 'Ready to get started?',
      ctaSubtitle: content?.ctaSubtitle || "Let's discuss how we can help your Discord community succeed.",
    };

    // Contact settings with defaults (form fields only - page fields fetched separately)
    const settings = data?.contactSettings?.[0];
    const companyLabel = settings?.companyFieldLabel || 'Company / Server Name';
    const contactSettings: ContactSettings = {
      formTitle: settings?.formTitle || 'Contact Us',
      formSubtitle: settings?.formSubtitle || "Tell us about your needs and we'll get back to you shortly.",
      companyFieldLabel: companyLabel,
      companyFieldPlaceholder: settings?.companyFieldPlaceholder || `Enter your ${companyLabel.toLowerCase()}`,
      successTitle: settings?.successTitle || 'Message Sent!',
      successMessage: settings?.successMessage || 'Thank you for your inquiry! Our team will contact you within 1-2 business days.',
      submitButtonText: settings?.submitButtonText || 'Send Message',
    };

    // Inquiry types with defaults
    let inquiryTypes: InquiryType[];
    if (data?.inquiryTypes && data.inquiryTypes.length > 0) {
      inquiryTypes = data.inquiryTypes.map((type) => ({
        id: type.typeId || type.id,
        label: type.label,
        order: type.order ?? 0,
      }));
    } else {
      inquiryTypes = [
        { id: 'general', label: 'General Inquiry', order: 1 },
        { id: 'pricing', label: 'Pricing Information', order: 2 },
        { id: 'demo', label: 'Request a Demo', order: 3 },
        { id: 'support', label: 'Support Question', order: 4 },
      ];
    }

    return {
      services,
      serviceTiers,
      slaHighlights,
      helpfulResources,
      pageContent,
      contactSettings,
      inquiryTypes,
    };
  }

  // ==========================================
  // FOOTER DATA
  // ==========================================

  /**
   * Get footer data (settings + links) in a single query
   * Used by LayoutContent to render CMS-driven footer
   */
  async getFooterData(): Promise<{
    settings: FooterSettings;
    links: FooterLink[];
  }> {
    const data = await this.query<{
      footerSettings: HygraphFooterSettings[];
      footerLinks: HygraphFooterLink[];
    }>(`
      query GetFooterData {
        footerSettings(first: 1) {
          siteName
          tagline
          quickLinksTitle
          resourcesTitle
          communityTitle
          copyrightText
          privacyPolicyUrl
          termsOfServiceUrl
        }
        footerLinks(first: 15, orderBy: order_ASC) {
          id
          title
          url
          icon
          external
          section
          order
        }
      }
    `);

    // Try to fetch logoIcon separately (optional - won't break if it fails)
    let logoIconUrl: string | undefined;
    try {
      const logoData = await this.query<{
        footerSettings: Array<{ logoIcon?: { url: string } }>;
      }>(`
        query GetFooterLogo {
          footerSettings(first: 1) {
            logoIcon { url }
          }
        }
      `);
      logoIconUrl = logoData?.footerSettings?.[0]?.logoIcon?.url;
    } catch {
      // Ignore logoIcon errors - use default icon
    }

    // Settings with defaults
    const s = data?.footerSettings?.[0];
    const settings: FooterSettings = {
      siteName: s?.siteName || 'Support Portal',
      tagline: s?.tagline || 'Get help with your Discord integrations and server management.',
      logoIcon: logoIconUrl,
      quickLinksTitle: s?.quickLinksTitle || 'Quick Links',
      resourcesTitle: s?.resourcesTitle || 'Resources',
      communityTitle: s?.communityTitle || 'Community',
      copyrightText: s?.copyrightText || 'Support Portal',
      privacyPolicyUrl: s?.privacyPolicyUrl || '#',
      termsOfServiceUrl: s?.termsOfServiceUrl || '#',
    };

    // Links with defaults if none exist
    let links: FooterLink[];
    if (data?.footerLinks && data.footerLinks.length > 0) {
      links = data.footerLinks.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        icon: link.icon,
        external: link.external ?? false,
        section: link.section as FooterLink['section'],
        order: link.order ?? 0,
      }));
    } else {
      // Default links when CMS is empty
      links = [
        { id: 'default-1', title: 'Support Hub', url: '/support', section: 'quickLinks', external: false, order: 1 },
        { id: 'default-2', title: 'Knowledge Base', url: '/support/articles', section: 'quickLinks', external: false, order: 2 },
        { id: 'default-3', title: 'Submit Ticket', url: '/support/ticket', section: 'quickLinks', external: false, order: 3 },
        { id: 'default-4', title: 'Documentation', url: '#', icon: 'ArrowSquareOut', section: 'resources', external: true, order: 1 },
        { id: 'default-5', title: 'Discord Server', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 1 },
        { id: 'default-6', title: 'Twitter', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 2 },
        { id: 'default-7', title: 'GitHub', url: '#', icon: 'ArrowSquareOut', section: 'community', external: true, order: 3 },
      ];
    }

    return { settings, links };
  }

  // ==========================================
  // HEADER/NAVBAR DATA
  // ==========================================

  /**
   * Get header data (settings + nav links) in a single query
   * Used by LayoutContent to render CMS-driven navbar
   */
  async getHeaderData(): Promise<{
    settings: HeaderSettings;
    navLinks: NavLink[];
  }> {
    // Query without logoIcon first (it can fail due to permission issues)
    const data = await this.query<{
      headerSettings: HygraphHeaderSettings[];
      navLinks: HygraphNavLink[];
    }>(`
      query GetHeaderData {
        headerSettings(first: 1) {
          siteName
          subtitle
        }
        navLinks(first: 10, orderBy: order_ASC) {
          id
          title
          url
          icon
          order
        }
      }
    `);

    // Try to fetch logoIcon separately (optional - won't break if it fails)
    let logoIconUrl: string | undefined;
    try {
      const logoData = await this.query<{
        headerSettings: Array<{ logoIcon?: { url: string } }>;
      }>(`
        query GetHeaderLogo {
          headerSettings(first: 1) {
            logoIcon { url }
          }
        }
      `);
      logoIconUrl = logoData?.headerSettings?.[0]?.logoIcon?.url;
    } catch {
      // Ignore logoIcon errors - use default icon
    }

    // Settings with defaults
    const s = data?.headerSettings?.[0];
    const settings: HeaderSettings = {
      siteName: s?.siteName || 'Support Portal',
      subtitle: s?.subtitle || 'Help Center',
      logoIcon: logoIconUrl,
    };

    // Nav links with defaults if none exist
    let navLinks: NavLink[];
    if (data?.navLinks && data.navLinks.length > 0) {
      navLinks = data.navLinks.map((link) => ({
        id: link.id,
        title: link.title,
        url: link.url,
        icon: link.icon || 'House',
        order: link.order ?? 0,
      }));
    } else {
      // Default nav links when CMS is empty
      navLinks = [
        { id: 'default-1', title: 'Support Hub', url: '/support', icon: 'House', order: 1 },
        { id: 'default-2', title: 'Articles', url: '/support/articles', icon: 'BookOpenText', order: 2 },
        { id: 'default-3', title: 'Services', url: '/support/services', icon: 'Briefcase', order: 3 },
        { id: 'default-4', title: 'Submit Ticket', url: '/support/ticket', icon: 'PaperPlaneTilt', order: 4 },
        { id: 'default-5', title: 'Contact', url: '/support/contact', icon: 'Envelope', order: 5 },
      ];
    }

    return { settings, navLinks };
  }

  // ==========================================
  // TICKET FORM DATA
  // ==========================================

  /**
   * Get ticket categories for the ticket form
   * Returns defaults if not configured in CMS
   */
  async getTicketCategories(): Promise<TicketCategory[]> {
    const data = await this.query<{ ticketCategories: HygraphTicketCategory[] }>(`
      query GetTicketCategories {
        ticketCategories(first: 20, orderBy: order_ASC) {
          categoryId
          name
          icon
          order
        }
      }
    `);

    if (data?.ticketCategories && data.ticketCategories.length > 0) {
      return data.ticketCategories.map((item) => ({
        id: item.categoryId || item.id,
        name: item.name,
        icon: item.icon || 'Question',
        order: item.order ?? 0,
      }));
    }

    // Return defaults if no CMS content
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
}

// Export singleton instance
export const hygraph = new HygraphClient();
