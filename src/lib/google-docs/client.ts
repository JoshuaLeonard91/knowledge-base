/**
 * Google Sheets CMS Client
 *
 * Fetches articles and categories from Google Sheets using Service Account authentication.
 * This is secure for private sheets - each client uses their own credentials.
 *
 * Required environment variables:
 * - GOOGLE_SERVICE_ACCOUNT_KEY: Full JSON service account key
 * - CMS_SPREADSHEET_ID: Google Sheet ID containing articles and categories
 *
 * Optional:
 * - CMS_SOURCE: Set to 'google' to enable (defaults to 'local' if not set)
 */

import { Article, ArticleCategory } from '@/types';

const SHEETS_API_BASE = 'https://sheets.googleapis.com/v4/spreadsheets';

interface ServiceAccountKey {
  type: string;
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

interface TokenCache {
  token: string;
  expiry: number;
}

class GoogleSheetsClient {
  private serviceAccountKey: ServiceAccountKey | null = null;
  private spreadsheetId: string;
  private isConfigured: boolean;
  private tokenCache: TokenCache | null = null;

  constructor() {
    this.spreadsheetId = process.env.CMS_SPREADSHEET_ID || '';
    const cmsSource = process.env.CMS_SOURCE || 'local';

    // Parse service account key from environment
    const keyJson = process.env.GOOGLE_SERVICE_ACCOUNT_KEY;
    if (keyJson) {
      try {
        this.serviceAccountKey = JSON.parse(keyJson);
      } catch (e) {
        console.error('[GoogleSheets] Failed to parse service account key:', e);
      }
    }

    this.isConfigured = Boolean(
      cmsSource === 'google' &&
      this.serviceAccountKey &&
      this.spreadsheetId
    );

    if (this.isConfigured) {
      console.log('[GoogleSheets] Configured with spreadsheet:', this.spreadsheetId);
    }
  }

  /**
   * Check if Google Sheets is configured
   */
  isAvailable(): boolean {
    return this.isConfigured;
  }

  /**
   * Generate JWT for service account authentication
   */
  private async getAccessToken(): Promise<string | null> {
    if (!this.serviceAccountKey) return null;

    // Check cache
    if (this.tokenCache && Date.now() < this.tokenCache.expiry) {
      return this.tokenCache.token;
    }

    try {
      const now = Math.floor(Date.now() / 1000);
      const expiry = now + 3600; // 1 hour

      // Create JWT header
      const header = {
        alg: 'RS256',
        typ: 'JWT',
      };

      // Create JWT claim set
      const claimSet = {
        iss: this.serviceAccountKey.client_email,
        scope: 'https://www.googleapis.com/auth/spreadsheets.readonly',
        aud: 'https://oauth2.googleapis.com/token',
        exp: expiry,
        iat: now,
      };

      // Encode header and claim set
      const encodedHeader = this.base64UrlEncode(JSON.stringify(header));
      const encodedClaimSet = this.base64UrlEncode(JSON.stringify(claimSet));
      const signatureInput = `${encodedHeader}.${encodedClaimSet}`;

      // Sign with private key
      const signature = await this.signJwt(signatureInput, this.serviceAccountKey.private_key);
      const jwt = `${signatureInput}.${signature}`;

      // Exchange JWT for access token
      const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
          assertion: jwt,
        }),
      });

      if (!tokenResponse.ok) {
        const error = await tokenResponse.text();
        console.error('[GoogleSheets] Token exchange failed:', error);
        return null;
      }

      const tokenData = await tokenResponse.json();

      // Cache the token
      this.tokenCache = {
        token: tokenData.access_token,
        expiry: Date.now() + (tokenData.expires_in - 60) * 1000, // Refresh 1 min early
      };

      return tokenData.access_token;
    } catch (error) {
      console.error('[GoogleSheets] Error getting access token:', error);
      return null;
    }
  }

  /**
   * Base64 URL encode
   */
  private base64UrlEncode(str: string): string {
    const base64 = Buffer.from(str).toString('base64');
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Sign JWT with RS256
   */
  private async signJwt(input: string, privateKey: string): Promise<string> {
    const crypto = await import('crypto');
    const sign = crypto.createSign('RSA-SHA256');
    sign.update(input);
    const signature = sign.sign(privateKey, 'base64');
    return signature.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  }

  /**
   * Fetch data from a sheet range
   */
  private async fetchSheetData(range: string): Promise<string[][] | null> {
    const token = await this.getAccessToken();
    if (!token) {
      console.error('[GoogleSheets] No access token available');
      return null;
    }

    try {
      const url = `${SHEETS_API_BASE}/${this.spreadsheetId}/values/${encodeURIComponent(range)}`;
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        next: { revalidate: 300 }, // Cache for 5 minutes
      });

      if (!response.ok) {
        const error = await response.text();
        console.error(`[GoogleSheets] API error: ${response.status}`, error);
        return null;
      }

      const data = await response.json();
      return data.values || [];
    } catch (error) {
      console.error('[GoogleSheets] Fetch error:', error);
      return null;
    }
  }

  /**
   * Get all articles from the Articles sheet
   * Expected columns: slug, title, excerpt, category, content, keywords, icon, readTime
   */
  async getArticles(): Promise<Article[]> {
    if (!this.isConfigured) {
      console.log('[GoogleSheets] Not configured');
      return [];
    }

    const rows = await this.fetchSheetData('Articles!A2:H');
    if (!rows || rows.length === 0) {
      console.log('[GoogleSheets] No articles found');
      return [];
    }

    return rows
      .map((row, index) => {
        const [slug, title, excerpt, category, content, keywords, icon, readTime] = row;

        if (!slug || !title) {
          console.warn(`[GoogleSheets] Skipping row ${index + 2}: missing slug or title`);
          return null;
        }

        return {
          slug: slug.trim(),
          title: title.trim(),
          excerpt: excerpt?.trim() || '',
          category: category?.trim() || 'general',
          content: content?.trim() || '',
          keywords: keywords ? keywords.split(',').map((k: string) => k.trim()) : [],
          icon: icon?.trim() || 'Article',
          readTime: parseInt(readTime) || 5,
          topic: 'general',
          relatedSlugs: [],
        } as Article;
      })
      .filter((a): a is Article => a !== null);
  }

  /**
   * Get all categories from the Categories sheet
   * Expected columns: id, name, description, icon, color
   */
  async getCategories(): Promise<ArticleCategory[]> {
    if (!this.isConfigured) {
      return [];
    }

    const rows = await this.fetchSheetData('Categories!A2:E');
    if (!rows || rows.length === 0) {
      // Auto-generate categories from articles
      const articles = await this.getArticles();
      const categorySet = new Set(articles.map(a => a.category));

      return Array.from(categorySet).map(cat => ({
        id: cat,
        name: this.slugToDisplayName(cat),
        description: `Articles about ${this.slugToDisplayName(cat).toLowerCase()}`,
        icon: this.getCategoryIcon(cat),
      }));
    }

    return rows
      .map((row) => {
        const [id, name, description, icon] = row;

        if (!id) return null;

        return {
          id: id.trim(),
          name: name?.trim() || this.slugToDisplayName(id),
          description: description?.trim() || '',
          icon: icon?.trim() || this.getCategoryIcon(id),
        } as ArticleCategory;
      })
      .filter((c): c is ArticleCategory => c !== null);
  }

  /**
   * Get article by slug
   */
  async getArticleBySlug(slug: string): Promise<Article | null> {
    const articles = await this.getArticles();
    return articles.find(a => a.slug === slug) || null;
  }

  /**
   * Search articles
   */
  async searchArticles(query: string): Promise<Article[]> {
    const articles = await this.getArticles();
    const lowerQuery = query.toLowerCase();

    return articles.filter(article =>
      article.title.toLowerCase().includes(lowerQuery) ||
      article.excerpt.toLowerCase().includes(lowerQuery) ||
      article.content.toLowerCase().includes(lowerQuery) ||
      article.keywords.some(k => k.toLowerCase().includes(lowerQuery))
    );
  }

  /**
   * Get articles by category
   */
  async getArticlesByCategory(categorySlug: string): Promise<Article[]> {
    const articles = await this.getArticles();
    return articles.filter(a => a.category === categorySlug);
  }

  /**
   * Convert slug to display name
   */
  private slugToDisplayName(slug: string): string {
    return slug
      .split('-')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
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
      'reference': 'FileText',
      'announcements': 'Megaphone',
      'updates': 'Bell',
      'security': 'Shield',
      'billing': 'CreditCard',
      'account': 'User',
      'integrations': 'Plug',
    };
    return iconMap[slug] || 'Article';
  }
}

// Export singleton instance
export const googleSheets = new GoogleSheetsClient();
