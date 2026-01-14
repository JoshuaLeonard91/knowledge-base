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
}

export interface SLAHighlight {
  id: string;
  title: string;
  description: string;
  icon: string;
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
}

interface HygraphSLAHighlight {
  id: string;
  title: string;
  description: string;
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
    };
  }
}

// Export singleton instance
export const hygraph = new HygraphClient();
