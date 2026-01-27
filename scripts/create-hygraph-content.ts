/**
 * Hygraph Content Creation Script
 *
 * Creates documentation content for HelpPortal CMS.
 * This content serves as documentation for tenants who clone the schema.
 *
 * Usage:
 * 1. Set HYGRAPH_CONTENT_TOKEN in .env.local (with write permissions)
 * 2. Run: npx tsx scripts/create-hygraph-content.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Configuration
const CONTENT_TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';
const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || '';

// Extract project ID from management token
function extractProjectIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
    const match = audience.match(/\/v2\/([^/]+)\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const PROJECT_ID = extractProjectIdFromToken(MANAGEMENT_TOKEN) || '';
const REGION = 'us-west-2';
const ENDPOINT = `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`;

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string; extensions?: unknown }>;
}

/**
 * Convert markdown to Slate.js AST for Hygraph RichText fields
 * This is a simplified converter that handles basic markdown
 */
function markdownToSlate(markdown: string): { children: unknown[] } {
  const lines = markdown.split('\n');
  const children: unknown[] = [];

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];

    // Skip empty lines
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    if (line.startsWith('# ')) {
      children.push({
        type: 'heading-one',
        children: [{ text: line.slice(2) }],
      });
      i++;
      continue;
    }

    if (line.startsWith('## ')) {
      children.push({
        type: 'heading-two',
        children: [{ text: line.slice(3) }],
      });
      i++;
      continue;
    }

    if (line.startsWith('### ')) {
      children.push({
        type: 'heading-three',
        children: [{ text: line.slice(4) }],
      });
      i++;
      continue;
    }

    // Bulleted list
    if (line.startsWith('- ')) {
      const items: unknown[] = [];
      while (i < lines.length && lines[i].startsWith('- ')) {
        items.push({
          type: 'list-item',
          children: [{ text: lines[i].slice(2) }],
        });
        i++;
      }
      children.push({
        type: 'bulleted-list',
        children: items,
      });
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line)) {
      const items: unknown[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i])) {
        items.push({
          type: 'list-item',
          children: [{ text: lines[i].replace(/^\d+\.\s/, '') }],
        });
        i++;
      }
      children.push({
        type: 'numbered-list',
        children: items,
      });
      continue;
    }

    // Code block
    if (line.startsWith('```')) {
      const codeLines: string[] = [];
      i++; // Skip opening ```
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```
      children.push({
        type: 'code-block',
        children: [{ text: codeLines.join('\n') }],
      });
      continue;
    }

    // Table - convert to simple paragraphs for now
    if (line.startsWith('|')) {
      // Skip table rows, convert to simple text
      while (i < lines.length && lines[i].startsWith('|')) {
        const cells = lines[i].split('|').filter(c => c.trim() && !c.match(/^[-:]+$/));
        if (cells.length > 0) {
          children.push({
            type: 'paragraph',
            children: [{ text: cells.join(' | ') }],
          });
        }
        i++;
      }
      continue;
    }

    // Regular paragraph
    children.push({
      type: 'paragraph',
      children: [{ text: line }],
    });
    i++;
  }

  // Ensure we have at least one paragraph
  if (children.length === 0) {
    children.push({
      type: 'paragraph',
      children: [{ text: '' }],
    });
  }

  return { children };
}

/**
 * Execute a GraphQL mutation
 */
async function mutate<T>(
  mutation: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONTENT_TOKEN}`,
      },
      body: JSON.stringify({
        query: mutation,
        variables,
      }),
    });

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      console.error('GraphQL errors:', JSON.stringify(result.errors, null, 2));
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.error('Mutation error:', error);
    return null;
  }
}

/**
 * Publish a content entry
 */
async function publish(modelName: string, id: string): Promise<boolean> {
  const mutation = `
    mutation Publish($id: ID!) {
      publish${modelName}(where: { id: $id }, to: PUBLISHED) {
        id
      }
    }
  `;

  const result = await mutate(mutation, { id });
  return result !== null;
}

// ==========================================
// CONTENT DEFINITIONS
// ==========================================

const articleCategories = [
  {
    name: 'Getting Started',
    slug: 'getting-started',
    description: 'Essential guides to set up and customize your HelpPortal',
    icon: 'Rocket',
  },
  {
    name: 'Content Management',
    slug: 'content-management',
    description: 'Learn how to create and manage articles, services, and pages',
    icon: 'PencilSimple',
  },
  {
    name: 'Customization',
    slug: 'customization',
    description: 'Personalize your portal with branding, navigation, and themes',
    icon: 'Palette',
  },
];

const articles = [
  // Getting Started
  {
    title: 'Welcome to HelpPortal',
    slug: 'welcome-to-helpportal',
    categorySlug: 'getting-started',
    excerpt: 'Get started with your HelpPortal CMS. Learn the basics of managing your support portal content.',
    icon: 'HandWaving',
    readTime: 3,
    keywords: 'welcome, getting started, introduction, overview',
    content: `# Welcome to HelpPortal

Congratulations on setting up your HelpPortal! This guide will help you understand how to manage your support portal content using Hygraph CMS.

## What is Hygraph?

Hygraph is a headless Content Management System (CMS) that powers your HelpPortal. It allows you to:

- Create and edit articles without touching code
- Customize your portal's branding and navigation
- Manage services, pricing, and contact information
- Update content in real-time

## How Content Works

Your HelpPortal pulls content from Hygraph automatically. When you create or update content in Hygraph:

1. Make your changes in the Hygraph editor
2. Click **Publish** to make changes live
3. Your portal updates within a few minutes

## Next Steps

1. **[Set Up Your Branding](/support/articles/customizing-site-settings)** - Add your logo and site name
2. **[Create Your First Article](/support/articles/creating-articles)** - Write helpful content for your users
3. **[Configure Navigation](/support/articles/managing-navigation)** - Set up your menu links

## Need Help?

If you get stuck, check the other articles in this knowledge base or contact HelpPortal support.`,
  },
  {
    title: 'Understanding the Content Models',
    slug: 'understanding-content-models',
    categorySlug: 'getting-started',
    excerpt: 'Learn about the different content types in your HelpPortal CMS and how they work together.',
    icon: 'TreeStructure',
    readTime: 5,
    keywords: 'models, schema, content types, structure',
    content: `# Understanding the Content Models

Your HelpPortal CMS has several content models that work together to create your portal. Here's what each one does.

## Singleton Models (One Entry Only)

These models should only have **one entry** each:

| Model | Purpose |
|-------|---------|
| **SiteSettings** | Your site name, logo, tagline, and footer settings |
| **ServicesPageContent** | Text for your services page sections |
| **LandingPageContent** | Text for your landing page (main domain only) |
| **PricingPageContent** | Text for your pricing page (main domain only) |
| **ContactSettings** | Contact form configuration |
| **ContactPageSettings** | Contact page text and channels |

## Collection Models (Multiple Entries)

These models can have multiple entries:

| Model | Typical Count |
|-------|---------------|
| **NavigationLink** | 5-15 links (header + footer) |
| **ArticleCategory** | 3-7 categories |
| **Article** | 10-100+ articles |
| **Service** | 3-6 services |
| **ServiceTier** | 2-4 tiers |
| **SLAHighlight** | 4-6 highlights |
| **InquiryType** | 3-5 options |
| **TicketCategory** | 5-10 categories |

## How They Connect

- **Articles** belong to **ArticleCategories**
- **NavigationLinks** use a **location** field to determine where they appear
- **Page Content** models can include **Component** fields for repeatable items

## Best Practices

1. Always publish content after editing
2. Keep category counts manageable (3-7 is ideal)
3. Write clear, helpful article titles
4. Use consistent icon names (Phosphor Icons)`,
  },
  {
    title: 'Customizing Site Settings',
    slug: 'customizing-site-settings',
    categorySlug: 'customization',
    excerpt: 'Configure your portal\'s branding including site name, logo, tagline, and footer information.',
    icon: 'Gear',
    readTime: 4,
    keywords: 'branding, logo, site name, settings, footer, customization',
    content: `# Customizing Site Settings

The **SiteSettings** model controls your portal's branding and footer configuration. You should only have one entry.

## Accessing Site Settings

1. Go to **Content** in Hygraph
2. Click on **Site Settings**
3. Edit the existing entry (or create one if none exists)

## Header Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Site Name** | Your portal name (shown in header) | "Acme Support" |
| **Subtitle** | Tagline below site name | "Help Center" |
| **Logo Icon** | Upload your logo image | PNG or SVG recommended |

## Footer Fields

| Field | Description | Example |
|-------|-------------|---------|
| **Tagline** | Footer description text | "Get help with your Acme products" |
| **Quick Links Title** | First column header | "Quick Links" |
| **Resources Title** | Second column header | "Resources" |
| **Community Title** | Third column header | "Community" |
| **Copyright Text** | Footer copyright | "Acme Inc" |
| **Privacy Policy URL** | Link to privacy page | "/privacy" or full URL |
| **Terms of Service URL** | Link to terms page | "/terms" or full URL |

## Logo Guidelines

- **Format**: PNG or SVG (SVG preferred for quality)
- **Size**: 200x200px minimum
- **Background**: Transparent works best
- **Style**: Simple icons work better than complex images

## After Editing

1. Click **Save** to save your draft
2. Click **Publish** to make changes live
3. Wait 1-5 minutes for your portal to update`,
  },
  {
    title: 'Managing Navigation Links',
    slug: 'managing-navigation',
    categorySlug: 'customization',
    excerpt: 'Set up header and footer navigation links to help users find their way around your portal.',
    icon: 'List',
    readTime: 4,
    keywords: 'navigation, menu, links, header, footer, nav',
    content: `# Managing Navigation Links

Navigation links appear in your header menu and footer columns. All links use the **NavigationLink** model with a **location** field.

## Link Locations

| Location | Where It Appears |
|----------|------------------|
| **header** | Top navigation bar |
| **footerQuickLinks** | Footer first column |
| **footerResources** | Footer second column |
| **footerCommunity** | Footer third column |

## Creating a Navigation Link

1. Go to **Content > Navigation Links**
2. Click **Create entry**
3. Fill in the fields:

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | Link text | "Knowledge Base" |
| **URL** | Destination path | "/support/articles" |
| **Icon** | Phosphor icon name | "BookOpenText" |
| **Location** | Where to show link | "header" |
| **External** | Opens in new tab? | false |
| **Order** | Sort position | 1, 2, 3... |

## Recommended Header Links

| Title | URL | Icon | Order |
|-------|-----|------|-------|
| Support Hub | /support | House | 1 |
| Articles | /support/articles | BookOpenText | 2 |
| Services | /support/services | Briefcase | 3 |
| Submit Ticket | /support/ticket | PaperPlaneTilt | 4 |
| Contact | /support/contact | Envelope | 5 |

## Icon Names

Icons use [Phosphor Icons](https://phosphoricons.com/). Common choices:

- **House** - Home/main page
- **BookOpenText** - Articles/docs
- **Briefcase** - Services
- **Envelope** - Contact
- **Question** - FAQ
- **Gear** - Settings

## Tips

- Keep header links to 5-6 maximum
- Use clear, short titles
- Lower order numbers appear first
- External links should have \`external: true\``,
  },
  // Content Management
  {
    title: 'Creating Articles',
    slug: 'creating-articles',
    categorySlug: 'content-management',
    excerpt: 'Write knowledge base articles to help your users find answers to their questions.',
    icon: 'Article',
    readTime: 5,
    keywords: 'articles, writing, content, knowledge base, docs',
    content: `# Creating Articles

Articles are the core of your knowledge base. They help users find answers without contacting support.

## Creating a New Article

1. Go to **Content > Articles**
2. Click **Create entry**
3. Fill in the required fields
4. Click **Save**, then **Publish**

## Article Fields

| Field | Required | Description |
|-------|----------|-------------|
| **Title** | Yes | Clear, descriptive headline |
| **Slug** | Yes | URL path (auto-generated from title) |
| **Excerpt** | No | Short summary for search results |
| **Content** | Yes | Full article body (Rich Text) |
| **Category** | No | Link to an ArticleCategory |
| **Icon** | No | Phosphor icon name |
| **Read Time** | No | Estimated minutes to read |
| **Keywords** | No | Comma-separated search terms |
| **Search Text** | No | Hidden searchable text |

## Writing Good Content

### Use Clear Structure

\`\`\`markdown
# Main Title

Brief introduction explaining what this article covers.

## Section 1

Content with bullet points:
- Point one
- Point two

## Section 2

More detailed information...

## Need More Help?

Link to contact or related articles.
\`\`\`

### Best Practices

1. **Start with the problem** - What is the user trying to do?
2. **Provide clear steps** - Numbered lists for procedures
3. **Include examples** - Show, don't just tell
4. **Keep it scannable** - Use headings, lists, bold text
5. **End with next steps** - Where should they go next?

## Keywords and Search

The **Keywords** field helps with search. Include:
- Common terms users might search for
- Alternate phrasings
- Related concepts

Example: \`"password, reset, forgot, login, access, account"\`

## Publishing

1. **Save** - Saves as draft (not visible on portal)
2. **Publish** - Makes content live
3. Changes appear on portal within 1-5 minutes`,
  },
  {
    title: 'Managing Article Categories',
    slug: 'managing-categories',
    categorySlug: 'content-management',
    excerpt: 'Organize your articles into categories to help users browse and find content easily.',
    icon: 'FolderOpen',
    readTime: 3,
    keywords: 'categories, organization, folders, structure',
    content: `# Managing Article Categories

Categories help organize your articles into logical groups. Users can browse by category to find related content.

## Creating a Category

1. Go to **Content > Article Categories**
2. Click **Create entry**
3. Fill in the fields:

| Field | Required | Description |
|-------|----------|-------------|
| **Name** | Yes | Category display name |
| **Slug** | Yes | URL path (lowercase, hyphens) |
| **Description** | No | Brief category description |
| **Icon** | No | Phosphor icon name |

## Recommended Categories

| Name | Slug | Icon | Description |
|------|------|------|-------------|
| Getting Started | getting-started | Rocket | New user guides |
| Account & Billing | account-billing | CreditCard | Account management |
| Troubleshooting | troubleshooting | Wrench | Problem solving |
| Features | features | Lightning | Feature guides |
| FAQ | faq | Question | Common questions |

## Best Practices

1. **3-7 categories** is ideal - not too few, not too many
2. **Each category should have 3+ articles** - avoid empty categories
3. **Use clear names** - users should know what to expect
4. **Avoid overlap** - articles should fit clearly in one category

## Assigning Articles to Categories

When creating or editing an article:
1. Find the **Category** field
2. Click to select from existing categories
3. Save and publish the article

## Category Icons

Choose icons that represent the category content:
- **Rocket** - Getting started
- **Wrench** - Troubleshooting
- **CreditCard** - Billing
- **Gear** - Settings
- **Shield** - Security
- **Question** - FAQ`,
  },
  {
    title: 'Setting Up Services',
    slug: 'setting-up-services',
    categorySlug: 'content-management',
    excerpt: 'Configure your services page with offerings, pricing tiers, and SLA highlights.',
    icon: 'Briefcase',
    readTime: 6,
    keywords: 'services, pricing, tiers, offerings, catalog',
    content: `# Setting Up Services

The Services page showcases what you offer. It includes service cards, pricing tiers, and SLA highlights.

## Service Cards

Create entries in **Content > Services**:

| Field | Description | Example |
|-------|-------------|---------|
| **Name** | Service name | "Custom Bot Development" |
| **Slug** | URL identifier | "custom-bot-development" |
| **Tagline** | Short catchy text | "Bots built for your community" |
| **Description** | Full description | "We build custom Discord bots..." |
| **Icon** | Phosphor icon | "Robot" |
| **Color** | Accent color (hex) | "#7C3AED" |
| **Features** | Feature list (multiline) | "24/7 uptime\\nCustom commands" |
| **Order** | Display position | 1, 2, 3... |
| **Price Label** | Optional pricing text | "Starting at $199" |
| **Button Text** | CTA button text | "Get Started" |

## Service Tiers (Pricing)

Create entries in **Content > Service Tiers**:

| Field | Description |
|-------|-------------|
| **Name** | Tier name (e.g., "Free", "Pro", "Enterprise") |
| **Description** | Who this tier is for |
| **Price** | Display price (e.g., "Free", "$49/mo", "Custom") |
| **Features** | Included features (multiline) |
| **Response Time** | Support response time |
| **Availability** | Support hours |
| **Highlighted** | Show as "Recommended" |
| **Order** | Display position |

## SLA Highlights

Create trust badges in **Content > SLA Highlights**:

| Field | Description | Example |
|-------|-------------|---------|
| **Title** | Metric name | "Guaranteed Uptime" |
| **Description** | Explanation | "Our bots are always online" |
| **Icon** | Phosphor icon | "Check" |
| **Stat Value** | Large stat text | "99.9%" |
| **Order** | Display position | 1, 2, 3... |

Popular SLA highlights:
- 99.9% Uptime
- 24/7 Support
- <4hr Response Time
- 30-Day Money Back

## Services Page Content

Edit **Content > Services Page Content** for section text:

- Hero title and subtitle
- Services section title
- SLA section title
- Resources section title
- CTA section title

## Tips

- 3-6 services is ideal for the grid layout
- Use consistent icons across services
- Keep taglines under 10 words
- List 4-6 features per service`,
  },
];

// ==========================================
// MAIN SCRIPT
// ==========================================

async function createContent() {
  console.log('🚀 Starting Hygraph content creation...\n');

  // Validate config
  if (!CONTENT_TOKEN) {
    console.error('❌ HYGRAPH_CONTENT_TOKEN not set in .env.local');
    process.exit(1);
  }
  if (!PROJECT_ID) {
    console.error('❌ Could not extract project ID from HYGRAPH_MANAGEMENT_TOKEN');
    process.exit(1);
  }

  console.log(`📦 Project ID: ${PROJECT_ID.substring(0, 10)}...`);
  console.log(`🔗 Endpoint: ${ENDPOINT}\n`);

  // Track category IDs for relationships
  const categoryIds: Record<string, string> = {};

  // ========================================
  // FETCH EXISTING ARTICLE CATEGORIES
  // ========================================
  console.log('📁 Fetching existing article categories...');

  // Query existing categories first
  const existingCategoriesQuery = `
    query GetCategories {
      articleCategories(first: 100) {
        id
        slug
      }
    }
  `;

  const existingCategoriesResult = await mutate<{ articleCategories: Array<{ id: string; slug: string }> }>(existingCategoriesQuery, {});

  if (existingCategoriesResult?.articleCategories) {
    for (const cat of existingCategoriesResult.articleCategories) {
      categoryIds[cat.slug] = cat.id;
      console.log(`  ✅ Found existing category: ${cat.slug}`);
    }
  }

  // Create any missing categories
  for (const category of articleCategories) {
    if (categoryIds[category.slug]) {
      continue; // Already exists
    }

    const mutation = `
      mutation CreateArticleCategory($data: ArticleCategoryCreateInput!) {
        createArticleCategory(data: $data) {
          id
          slug
        }
      }
    `;

    const result = await mutate<{ createArticleCategory: { id: string; slug: string } }>(mutation, {
      data: {
        name: category.name,
        slug: category.slug,
        description: category.description,
        icon: category.icon,
      },
    });

    if (result?.createArticleCategory) {
      categoryIds[category.slug] = result.createArticleCategory.id;
      console.log(`  ✅ Created category: ${category.name}`);
      await publish('ArticleCategory', result.createArticleCategory.id);
    }
  }

  // ========================================
  // CREATE ARTICLES
  // ========================================
  console.log('\n📝 Creating articles...');

  for (const article of articles) {
    const categoryId = categoryIds[article.categorySlug];

    const mutation = `
      mutation CreateArticle($data: ArticleCreateInput!) {
        createArticle(data: $data) {
          id
          slug
        }
      }
    `;

    const data: Record<string, unknown> = {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      // RichText fields require Slate.js AST format
      content: markdownToSlate(article.content),
      icon: article.icon,
      readTime: article.readTime,
      keywords: article.keywords,
    };

    // Connect to category if exists
    if (categoryId) {
      data.category = { connect: { id: categoryId } };
    }

    const result = await mutate<{ createArticle: { id: string; slug: string } }>(mutation, { data });

    if (result?.createArticle) {
      console.log(`  ✅ Created article: ${article.title}`);

      // Publish the article
      await publish('Article', result.createArticle.id);
    } else {
      console.log(`  ⚠️  Failed to create article: ${article.title}`);
    }
  }

  // ========================================
  // CREATE SITE SETTINGS
  // ========================================
  console.log('\n⚙️  Creating site settings...');

  const siteSettingsMutation = `
    mutation CreateSiteSettings($data: SiteSettingsCreateInput!) {
      createSiteSettings(data: $data) {
        id
      }
    }
  `;

  const siteSettingsResult = await mutate<{ createSiteSettings: { id: string } }>(siteSettingsMutation, {
    data: {
      siteName: 'HelpPortal',
      siteSubtitle: 'Documentation',
      footerTagline: 'Learn how to set up and customize your HelpPortal support center.',
      quickLinksTitle: 'Quick Links',
      resourcesTitle: 'Resources',
      communityTitle: 'Community',
      copyrightText: 'HelpPortal',
      privacyPolicyUrl: '/privacy',
      termsOfServiceUrl: '/terms',
    },
  });

  if (siteSettingsResult?.createSiteSettings) {
    console.log('  ✅ Created site settings');
    await publish('SiteSettings', siteSettingsResult.createSiteSettings.id);
  }

  // ========================================
  // CREATE NAVIGATION LINKS
  // ========================================
  console.log('\n🔗 Creating navigation links...');

  const navLinks = [
    // Header links
    { title: 'Support Hub', url: '/support', icon: 'House', location: 'header', external: false, order: 1 },
    { title: 'Articles', url: '/support/articles', icon: 'BookOpenText', location: 'header', external: false, order: 2 },
    { title: 'Services', url: '/support/services', icon: 'Briefcase', location: 'header', external: false, order: 3 },
    { title: 'Submit Ticket', url: '/support/ticket', icon: 'PaperPlaneTilt', location: 'header', external: false, order: 4 },
    { title: 'Contact', url: '/support/contact', icon: 'Envelope', location: 'header', external: false, order: 5 },
    // Footer Quick Links
    { title: 'Support Hub', url: '/support', icon: 'House', location: 'footerQuickLinks', external: false, order: 1 },
    { title: 'Knowledge Base', url: '/support/articles', icon: 'BookOpenText', location: 'footerQuickLinks', external: false, order: 2 },
    { title: 'Submit Ticket', url: '/support/ticket', icon: 'PaperPlaneTilt', location: 'footerQuickLinks', external: false, order: 3 },
    // Footer Resources
    { title: 'Documentation', url: 'https://hygraph.com/docs', icon: 'BookOpen', location: 'footerResources', external: true, order: 1 },
    { title: 'Phosphor Icons', url: 'https://phosphoricons.com', icon: 'Palette', location: 'footerResources', external: true, order: 2 },
    // Footer Community
    { title: 'Discord', url: 'https://discord.gg/helpportal', icon: 'DiscordLogo', location: 'footerCommunity', external: true, order: 1 },
    { title: 'Twitter', url: 'https://twitter.com/helpportal', icon: 'TwitterLogo', location: 'footerCommunity', external: true, order: 2 },
  ];

  for (const link of navLinks) {
    const mutation = `
      mutation CreateNavigationLink($data: NavigationLinkCreateInput!) {
        createNavigationLink(data: $data) {
          id
        }
      }
    `;

    const result = await mutate<{ createNavigationLink: { id: string } }>(mutation, {
      data: link,
    });

    if (result?.createNavigationLink) {
      console.log(`  ✅ Created nav link: ${link.title} (${link.location})`);
      await publish('NavigationLink', result.createNavigationLink.id);
    }
  }

  // ========================================
  // CREATE CONTACT SETTINGS
  // ========================================
  console.log('\n📧 Creating contact settings...');

  const contactSettingsMutation = `
    mutation CreateContactSettings($data: ContactSettingsCreateInput!) {
      createContactSettings(data: $data) {
        id
      }
    }
  `;

  const contactSettingsResult = await mutate<{ createContactSettings: { id: string } }>(contactSettingsMutation, {
    data: {
      formTitle: 'Get in Touch',
      formSubtitle: 'Have a question or need help? Fill out the form below and we\'ll get back to you.',
      companyFieldLabel: 'Company / Server Name',
      companyFieldPlaceholder: 'Enter your company or server name',
      successTitle: 'Message Sent!',
      successMessage: 'Thank you for reaching out. We\'ll respond within 1-2 business days.',
      submitButtonText: 'Send Message',
    },
  });

  if (contactSettingsResult?.createContactSettings) {
    console.log('  ✅ Created contact settings');
    await publish('ContactSettings', contactSettingsResult.createContactSettings.id);
  }

  // ========================================
  // CREATE INQUIRY TYPES
  // ========================================
  console.log('\n📋 Creating inquiry types...');

  const inquiryTypes = [
    { typeId: 'general', label: 'General Inquiry', order: 1 },
    { typeId: 'support', label: 'Technical Support', order: 2 },
    { typeId: 'billing', label: 'Billing Question', order: 3 },
    { typeId: 'feedback', label: 'Feedback', order: 4 },
  ];

  for (const type of inquiryTypes) {
    const mutation = `
      mutation CreateInquiryType($data: InquiryTypeCreateInput!) {
        createInquiryType(data: $data) {
          id
        }
      }
    `;

    const result = await mutate<{ createInquiryType: { id: string } }>(mutation, {
      data: type,
    });

    if (result?.createInquiryType) {
      console.log(`  ✅ Created inquiry type: ${type.label}`);
      await publish('InquiryType', result.createInquiryType.id);
    }
  }

  // ========================================
  // CREATE TICKET CATEGORIES
  // ========================================
  console.log('\n🎫 Creating ticket categories...');

  const ticketCategories = [
    { categoryId: 'technical', name: 'Technical Problem', icon: 'Wrench', order: 1 },
    { categoryId: 'setup', name: 'Setup & Configuration', icon: 'Gear', order: 2 },
    { categoryId: 'feature', name: 'Feature Request', icon: 'Lightbulb', order: 3 },
    { categoryId: 'billing', name: 'Billing & Account', icon: 'CreditCard', order: 4 },
    { categoryId: 'other', name: 'Other', icon: 'Question', order: 5 },
  ];

  for (const category of ticketCategories) {
    const mutation = `
      mutation CreateTicketCategory($data: TicketCategoryCreateInput!) {
        createTicketCategory(data: $data) {
          id
        }
      }
    `;

    const result = await mutate<{ createTicketCategory: { id: string } }>(mutation, {
      data: category,
    });

    if (result?.createTicketCategory) {
      console.log(`  ✅ Created ticket category: ${category.name}`);
      await publish('TicketCategory', result.createTicketCategory.id);
    }
  }

  // ========================================
  // DONE
  // ========================================
  console.log('\n✅ Content creation complete!');
  console.log('\n📋 Summary:');
  console.log(`  - ${articleCategories.length} article categories`);
  console.log(`  - ${articles.length} documentation articles`);
  console.log(`  - 1 site settings entry`);
  console.log(`  - ${navLinks.length} navigation links`);
  console.log(`  - 1 contact settings entry`);
  console.log(`  - ${inquiryTypes.length} inquiry types`);
  console.log(`  - ${ticketCategories.length} ticket categories`);
  console.log('\n🌐 Visit your portal to see the content!');
}

// Run the script
createContent().catch(console.error);
