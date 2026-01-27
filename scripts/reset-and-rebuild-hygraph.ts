/**
 * Reset and Rebuild Hygraph Schema
 *
 * This script:
 * 1. Deletes all existing content entries
 * 2. Deletes all models, components, and enumerations
 * 3. Recreates everything with proper field ordering
 * 4. Creates sample content
 *
 * Usage:
 * npx tsx scripts/reset-and-rebuild-hygraph.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Client, SimpleFieldType, RelationalFieldType } from '@hygraph/management-sdk';

// Configuration
const CONTENT_TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';
const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || '';
const ENVIRONMENT = 'master';

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
const ENDPOINT = `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`;

// ==========================================
// CONTENT API HELPERS
// ==========================================

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphql<T>(query: string, variables?: Record<string, unknown>): Promise<T | null> {
  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONTENT_TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      // Don't log "not found" errors during deletion
      const realErrors = result.errors.filter(e => !e.message.includes('not found'));
      if (realErrors.length > 0) {
        console.error('  GraphQL errors:', realErrors.map(e => e.message).join(', '));
      }
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.error('  Request error:', error);
    return null;
  }
}

// ==========================================
// PHASE 1: DELETE ALL CONTENT
// ==========================================

async function deleteAllContent() {
  console.log('\n🗑️  PHASE 1: Deleting all content entries...\n');

  // Models to delete content from (order matters - delete children first)
  const modelsToDelete = [
    'Article',
    'ArticleCategory',
    'NavigationLink',
    'SiteSettings',
    'Service',
    'ServiceTier',
    'SlaHighlight',
    'HelpfulResource',
    'ServicesPageContent',
    'LandingPageContent',
    'PricingPageContent',
    'ContactSettings',
    'ContactPageSettings',
    'InquiryType',
    'TicketCategory',
  ];

  for (const model of modelsToDelete) {
    // First, get all entries
    const pluralName = model.endsWith('y')
      ? model.slice(0, -1) + 'ies'
      : model.endsWith('s')
        ? model + 'es'
        : model + 's';

    // Handle special cases
    const queryName = model === 'SlaHighlight' ? 'slaHighlights' : pluralName.charAt(0).toLowerCase() + pluralName.slice(1);

    const fetchQuery = `
      query {
        ${queryName}(first: 100, stage: DRAFT) {
          id
        }
      }
    `;

    const entries = await graphql<Record<string, Array<{ id: string }>>>(fetchQuery);

    if (entries && entries[queryName] && entries[queryName].length > 0) {
      console.log(`  Deleting ${entries[queryName].length} ${model} entries...`);

      for (const entry of entries[queryName]) {
        const deleteMutation = `
          mutation {
            delete${model}(where: { id: "${entry.id}" }) {
              id
            }
          }
        `;
        await graphql(deleteMutation);
      }
      console.log(`  ✅ Deleted ${model} entries`);
    } else {
      console.log(`  ⏭️  No ${model} entries to delete`);
    }
  }
}

// ==========================================
// PHASE 2: DELETE SCHEMA
// ==========================================

async function deleteSchema() {
  console.log('\n🗑️  PHASE 2: Deleting schema (models, components, enums)...\n');

  // Models to delete (order matters - delete models with relations first)
  const models = [
    'Article',           // Has relation to ArticleCategory
    'ArticleCategory',
    'NavigationLink',    // Has enum field
    'SiteSettings',
    'Service',
    'ServiceTier',
    'SlaHighlight',
    'HelpfulResource',
    'ServicesPageContent',
    'LandingPageContent',
    'PricingPageContent',
    'ContactSettings',
    'ContactPageSettings',
    'InquiryType',
    'TicketCategory',
  ];

  // Delete models one by one
  console.log('  Deleting models...');
  for (const model of models) {
    const client = new Client({
      authToken: MANAGEMENT_TOKEN,
      endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
    });
    try {
      client.deleteModel({ apiId: model });
      const result = await client.run(true);
      if (!result.errors) {
        console.log(`    ✅ Deleted: ${model}`);
      } else {
        console.log(`    ⏭️  ${model} (may not exist)`);
      }
    } catch (e) {
      console.log(`    ⏭️  ${model} (may not exist)`);
    }
  }

  // Delete components
  console.log('  Deleting components...');
  const components = ['LandingFeature', 'PricingFeature', 'ContactChannel'];
  for (const component of components) {
    const client = new Client({
      authToken: MANAGEMENT_TOKEN,
      endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
    });
    try {
      client.deleteComponent({ apiId: component });
      const result = await client.run(true);
      if (!result.errors) {
        console.log(`    ✅ Deleted: ${component}`);
      } else {
        console.log(`    ⏭️  ${component} (may not exist)`);
      }
    } catch (e) {
      console.log(`    ⏭️  ${component} (may not exist)`);
    }
  }

  // Delete enumerations
  console.log('  Deleting enumerations...');
  const enumerations = ['NavigationLocation'];
  for (const enumeration of enumerations) {
    const client = new Client({
      authToken: MANAGEMENT_TOKEN,
      endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
    });
    try {
      client.deleteEnumeration({ apiId: enumeration });
      const result = await client.run(true);
      if (!result.errors) {
        console.log(`    ✅ Deleted: ${enumeration}`);
      } else {
        console.log(`    ⏭️  ${enumeration} (may not exist)`);
      }
    } catch (e) {
      console.log(`    ⏭️  ${enumeration} (may not exist)`);
    }
  }

  console.log('  ✅ Schema deletion phase complete');
}

// ==========================================
// PHASE 3: CREATE SCHEMA
// ==========================================

async function createSchema() {
  console.log('\n🔧 PHASE 3: Creating fresh schema...\n');

  const client = new Client({
    authToken: MANAGEMENT_TOKEN,
    endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
  });

  // ------------------------------------------
  // 3.1 Create Enumerations
  // ------------------------------------------
  console.log('  Creating enumerations...');

  client.createEnumeration({
    apiId: 'NavigationLocation',
    displayName: 'Navigation Location',
    description: 'Where a navigation link appears',
    values: [
      { apiId: 'header', displayName: 'Header' },
      { apiId: 'footerQuickLinks', displayName: 'Footer Quick Links' },
      { apiId: 'footerResources', displayName: 'Footer Resources' },
      { apiId: 'footerCommunity', displayName: 'Footer Community' },
    ],
  });

  console.log('    ✅ NavigationLocation enum');

  // ------------------------------------------
  // 3.2 Create Components
  // ------------------------------------------
  console.log('  Creating components...');

  // LandingFeature
  client.createComponent({
    apiId: 'LandingFeature',
    apiIdPlural: 'LandingFeatures',
    displayName: 'Landing Feature',
    description: 'Feature highlight for landing page',
  });

  client.createSimpleField({
    parentApiId: 'LandingFeature',
    apiId: 'title',
    displayName: 'Title',
    type: SimpleFieldType.String,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'LandingFeature',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'LandingFeature',
    apiId: 'icon',
    displayName: 'Icon',
    description: 'Phosphor icon name',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ LandingFeature component');

  // PricingFeature
  client.createComponent({
    apiId: 'PricingFeature',
    apiIdPlural: 'PricingFeatures',
    displayName: 'Pricing Feature',
    description: 'Feature item for pricing tiers',
  });

  client.createSimpleField({
    parentApiId: 'PricingFeature',
    apiId: 'text',
    displayName: 'Text',
    type: SimpleFieldType.String,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'PricingFeature',
    apiId: 'included',
    displayName: 'Included',
    description: 'Whether feature is included in tier',
    type: SimpleFieldType.Boolean,
  });

  console.log('    ✅ PricingFeature component');

  // ContactChannel
  client.createComponent({
    apiId: 'ContactChannel',
    apiIdPlural: 'ContactChannels',
    displayName: 'Contact Channel',
    description: 'Contact method card',
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'title',
    displayName: 'Title',
    type: SimpleFieldType.String,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'icon',
    displayName: 'Icon',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'linkUrl',
    displayName: 'Link URL',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'linkText',
    displayName: 'Link Text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactChannel',
    apiId: 'color',
    displayName: 'Color',
    description: 'Accent color (hex)',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ ContactChannel component');

  // ------------------------------------------
  // 3.3 Create Models
  // ------------------------------------------
  console.log('  Creating models...');

  // === SiteSettings ===
  client.createModel({
    apiId: 'SiteSettings',
    apiIdPlural: 'SiteSettingsEntries',
    displayName: 'Site Settings',
    description: 'Global site configuration (singleton)',
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'siteName',
    displayName: 'Site Name',
    description: 'Portal name shown in header',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'subtitle',
    displayName: 'Subtitle',
    description: 'Tagline below site name',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'tagline',
    displayName: 'Footer Tagline',
    description: 'Description shown in footer',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'quickLinksTitle',
    displayName: 'Quick Links Title',
    description: 'Footer column 1 title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'resourcesTitle',
    displayName: 'Resources Title',
    description: 'Footer column 2 title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'communityTitle',
    displayName: 'Community Title',
    description: 'Footer column 3 title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'copyrightText',
    displayName: 'Copyright Text',
    description: 'Footer copyright text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'privacyPolicyUrl',
    displayName: 'Privacy Policy URL',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SiteSettings',
    apiId: 'termsOfServiceUrl',
    displayName: 'Terms of Service URL',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ SiteSettings model');

  // === NavigationLink ===
  client.createModel({
    apiId: 'NavigationLink',
    apiIdPlural: 'NavigationLinks',
    displayName: 'Navigation Link',
    description: 'Header and footer navigation links',
  });

  client.createSimpleField({
    parentApiId: 'NavigationLink',
    apiId: 'title',
    displayName: 'Title',
    description: 'Link text',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'NavigationLink',
    apiId: 'url',
    displayName: 'URL',
    description: 'Link destination',
    type: SimpleFieldType.String,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'NavigationLink',
    apiId: 'icon',
    displayName: 'Icon',
    description: 'Phosphor icon name',
    type: SimpleFieldType.String,
  });

  client.createEnumerableField({
    parentApiId: 'NavigationLink',
    apiId: 'location',
    displayName: 'Location',
    description: 'Where link appears',
    enumerationApiId: 'NavigationLocation',
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'NavigationLink',
    apiId: 'external',
    displayName: 'External',
    description: 'Opens in new tab',
    type: SimpleFieldType.Boolean,
  });

  client.createSimpleField({
    parentApiId: 'NavigationLink',
    apiId: 'order',
    displayName: 'Order',
    description: 'Sort position',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ NavigationLink model');

  // === ArticleCategory ===
  client.createModel({
    apiId: 'ArticleCategory',
    apiIdPlural: 'ArticleCategories',
    displayName: 'Article Category',
    description: 'Knowledge base categories',
  });

  client.createSimpleField({
    parentApiId: 'ArticleCategory',
    apiId: 'name',
    displayName: 'Name',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'ArticleCategory',
    apiId: 'slug',
    displayName: 'Slug',
    description: 'URL-friendly identifier',
    type: SimpleFieldType.String,
    isRequired: true,
    isUnique: true,
  });

  client.createSimpleField({
    parentApiId: 'ArticleCategory',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'ArticleCategory',
    apiId: 'icon',
    displayName: 'Icon',
    description: 'Phosphor icon name',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ ArticleCategory model');

  // === Article ===
  client.createModel({
    apiId: 'Article',
    apiIdPlural: 'Articles',
    displayName: 'Article',
    description: 'Knowledge base articles',
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'title',
    displayName: 'Title',
    description: 'Article headline',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'slug',
    displayName: 'Slug',
    description: 'URL-friendly identifier',
    type: SimpleFieldType.String,
    isRequired: true,
    isUnique: true,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'excerpt',
    displayName: 'Excerpt',
    description: 'Short summary for search results',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'content',
    displayName: 'Content',
    description: 'Full article body',
    type: SimpleFieldType.Richtext,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'icon',
    displayName: 'Icon',
    description: 'Phosphor icon name',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'readTime',
    displayName: 'Read Time',
    description: 'Estimated minutes to read',
    type: SimpleFieldType.Int,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'keywords',
    displayName: 'Keywords',
    description: 'Comma-separated search keywords',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'searchText',
    displayName: 'Search Text',
    description: 'Hidden searchable text',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  // Article -> Category relation
  client.createRelationalField({
    parentApiId: 'Article',
    apiId: 'category',
    displayName: 'Category',
    type: RelationalFieldType.Relation,
    reverseField: {
      apiId: 'articles',
      displayName: 'Articles',
      modelApiId: 'ArticleCategory',
      isList: true,
    },
  });

  console.log('    ✅ Article model');

  // === Service ===
  client.createModel({
    apiId: 'Service',
    apiIdPlural: 'Services',
    displayName: 'Service',
    description: 'Service offerings',
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'name',
    displayName: 'Name',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'slug',
    displayName: 'Slug',
    type: SimpleFieldType.String,
    isRequired: true,
    isUnique: true,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'tagline',
    displayName: 'Tagline',
    description: 'Short catchy text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'icon',
    displayName: 'Icon',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'color',
    displayName: 'Color',
    description: 'Accent color (hex)',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'features',
    displayName: 'Features',
    description: 'Feature list (one per line)',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'priceLabel',
    displayName: 'Price Label',
    description: 'e.g. "Starting at $199"',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'buttonText',
    displayName: 'Button Text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'Service',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ Service model');

  // === ServiceTier ===
  client.createModel({
    apiId: 'ServiceTier',
    apiIdPlural: 'ServiceTiers',
    displayName: 'Service Tier',
    description: 'Pricing tiers',
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'name',
    displayName: 'Name',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'price',
    displayName: 'Price',
    description: 'Display price (e.g. "Free", "$49/mo")',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'features',
    displayName: 'Features',
    description: 'Feature list (one per line)',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'responseTime',
    displayName: 'Response Time',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'availability',
    displayName: 'Availability',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'highlighted',
    displayName: 'Highlighted',
    description: 'Show as recommended',
    type: SimpleFieldType.Boolean,
  });

  client.createSimpleField({
    parentApiId: 'ServiceTier',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ ServiceTier model');

  // === SlaHighlight ===
  client.createModel({
    apiId: 'SlaHighlight',
    apiIdPlural: 'SlaHighlights',
    displayName: 'SLA Highlight',
    description: 'SLA trust badges',
  });

  client.createSimpleField({
    parentApiId: 'SlaHighlight',
    apiId: 'title',
    displayName: 'Title',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'SlaHighlight',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SlaHighlight',
    apiId: 'icon',
    displayName: 'Icon',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SlaHighlight',
    apiId: 'statValue',
    displayName: 'Stat Value',
    description: 'Large stat text (e.g. "99.9%")',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'SlaHighlight',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ SlaHighlight model');

  // === HelpfulResource ===
  client.createModel({
    apiId: 'HelpfulResource',
    apiIdPlural: 'HelpfulResources',
    displayName: 'Helpful Resource',
    description: 'Resource links on services page',
  });

  client.createSimpleField({
    parentApiId: 'HelpfulResource',
    apiId: 'title',
    displayName: 'Title',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'HelpfulResource',
    apiId: 'description',
    displayName: 'Description',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'HelpfulResource',
    apiId: 'icon',
    displayName: 'Icon',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'HelpfulResource',
    apiId: 'url',
    displayName: 'URL',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'HelpfulResource',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ HelpfulResource model');

  // === ServicesPageContent ===
  client.createModel({
    apiId: 'ServicesPageContent',
    apiIdPlural: 'ServicesPageContents',
    displayName: 'Services Page Content',
    description: 'Services page text (singleton)',
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'heroTitle',
    displayName: 'Hero Title',
    type: SimpleFieldType.String,
    isTitle: true,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'heroSubtitle',
    displayName: 'Hero Subtitle',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'servicesTitle',
    displayName: 'Services Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'slaTitle',
    displayName: 'SLA Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'resourcesTitle',
    displayName: 'Resources Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'ctaTitle',
    displayName: 'CTA Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'ctaButtonText',
    displayName: 'CTA Button Text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ServicesPageContent',
    apiId: 'ctaButtonUrl',
    displayName: 'CTA Button URL',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ ServicesPageContent model');

  // === LandingPageContent ===
  client.createModel({
    apiId: 'LandingPageContent',
    apiIdPlural: 'LandingPageContents',
    displayName: 'Landing Page Content',
    description: 'Landing page text (singleton, main domain)',
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroTitle',
    displayName: 'Hero Title',
    type: SimpleFieldType.String,
    isTitle: true,
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroSubtitle',
    displayName: 'Hero Subtitle',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroCta',
    displayName: 'Hero CTA Text',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroCtaUrl',
    displayName: 'Hero CTA URL',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'featuresTitle',
    displayName: 'Features Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'featuresSubtitle',
    displayName: 'Features Section Subtitle',
    type: SimpleFieldType.String,
  });

  // Add LandingFeature component field (multiple values)
  client.createComponentField({
    parentApiId: 'LandingPageContent',
    apiId: 'features',
    displayName: 'Features',
    description: 'Feature highlights for landing page',
    componentApiId: 'LandingFeature',
    isList: true,
  });

  console.log('    ✅ LandingPageContent model');

  // === PricingPageContent ===
  client.createModel({
    apiId: 'PricingPageContent',
    apiIdPlural: 'PricingPageContents',
    displayName: 'Pricing Page Content',
    description: 'Pricing page text (singleton, main domain)',
  });

  client.createSimpleField({
    parentApiId: 'PricingPageContent',
    apiId: 'heroTitle',
    displayName: 'Hero Title',
    type: SimpleFieldType.String,
    isTitle: true,
  });

  client.createSimpleField({
    parentApiId: 'PricingPageContent',
    apiId: 'heroSubtitle',
    displayName: 'Hero Subtitle',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'PricingPageContent',
    apiId: 'tiersTitle',
    displayName: 'Tiers Section Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'PricingPageContent',
    apiId: 'faqTitle',
    displayName: 'FAQ Section Title',
    type: SimpleFieldType.String,
  });

  // Add PricingFeature component field (multiple values)
  client.createComponentField({
    parentApiId: 'PricingPageContent',
    apiId: 'features',
    displayName: 'Features',
    description: 'Feature list for pricing plan',
    componentApiId: 'PricingFeature',
    isList: true,
  });

  console.log('    ✅ PricingPageContent model');

  // === ContactSettings ===
  client.createModel({
    apiId: 'ContactSettings',
    apiIdPlural: 'ContactSettingsEntries',
    displayName: 'Contact Settings',
    description: 'Contact form configuration (singleton)',
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'formTitle',
    displayName: 'Form Title',
    type: SimpleFieldType.String,
    isTitle: true,
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'formSubtitle',
    displayName: 'Form Subtitle',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'companyFieldLabel',
    displayName: 'Company Field Label',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'companyFieldPlaceholder',
    displayName: 'Company Field Placeholder',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'successTitle',
    displayName: 'Success Title',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'successMessage',
    displayName: 'Success Message',
    type: SimpleFieldType.String,
    formRenderer: 'Multiline',
  });

  client.createSimpleField({
    parentApiId: 'ContactSettings',
    apiId: 'submitButtonText',
    displayName: 'Submit Button Text',
    type: SimpleFieldType.String,
  });

  console.log('    ✅ ContactSettings model');

  // === ContactPageSettings ===
  client.createModel({
    apiId: 'ContactPageSettings',
    apiIdPlural: 'ContactPageSettingsEntries',
    displayName: 'Contact Page Settings',
    description: 'Contact page layout (singleton)',
  });

  client.createSimpleField({
    parentApiId: 'ContactPageSettings',
    apiId: 'pageTitle',
    displayName: 'Page Title',
    type: SimpleFieldType.String,
    isTitle: true,
  });

  client.createSimpleField({
    parentApiId: 'ContactPageSettings',
    apiId: 'pageSubtitle',
    displayName: 'Page Subtitle',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'ContactPageSettings',
    apiId: 'channelsTitle',
    displayName: 'Channels Section Title',
    type: SimpleFieldType.String,
  });

  // Add ContactChannel component field (multiple values)
  client.createComponentField({
    parentApiId: 'ContactPageSettings',
    apiId: 'channels',
    displayName: 'Contact Channels',
    description: 'Contact method cards',
    componentApiId: 'ContactChannel',
    isList: true,
  });

  console.log('    ✅ ContactPageSettings model');

  // === InquiryType ===
  client.createModel({
    apiId: 'InquiryType',
    apiIdPlural: 'InquiryTypes',
    displayName: 'Inquiry Type',
    description: 'Contact form inquiry types',
  });

  client.createSimpleField({
    parentApiId: 'InquiryType',
    apiId: 'typeId',
    displayName: 'Type ID',
    description: 'Internal identifier',
    type: SimpleFieldType.String,
    isRequired: true,
    isUnique: true,
  });

  client.createSimpleField({
    parentApiId: 'InquiryType',
    apiId: 'label',
    displayName: 'Label',
    description: 'Display text',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'InquiryType',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ InquiryType model');

  // === TicketCategory ===
  client.createModel({
    apiId: 'TicketCategory',
    apiIdPlural: 'TicketCategories',
    displayName: 'Ticket Category',
    description: 'Support ticket categories',
  });

  client.createSimpleField({
    parentApiId: 'TicketCategory',
    apiId: 'categoryId',
    displayName: 'Category ID',
    description: 'Internal identifier',
    type: SimpleFieldType.String,
    isRequired: true,
    isUnique: true,
  });

  client.createSimpleField({
    parentApiId: 'TicketCategory',
    apiId: 'name',
    displayName: 'Name',
    description: 'Display name',
    type: SimpleFieldType.String,
    isTitle: true,
    isRequired: true,
  });

  client.createSimpleField({
    parentApiId: 'TicketCategory',
    apiId: 'icon',
    displayName: 'Icon',
    type: SimpleFieldType.String,
  });

  client.createSimpleField({
    parentApiId: 'TicketCategory',
    apiId: 'order',
    displayName: 'Order',
    type: SimpleFieldType.Int,
  });

  console.log('    ✅ TicketCategory model');

  // ------------------------------------------
  // Run the migration
  // ------------------------------------------
  console.log('\n  Running schema migration...');
  try {
    const result = await client.run(true);
    if (result.errors) {
      console.error('  ❌ Migration errors:', result.errors);
      return false;
    }
    console.log('  ✅ Schema created successfully!');
    return true;
  } catch (error) {
    console.error('  ❌ Migration failed:', error);
    return false;
  }
}

// ==========================================
// PHASE 4: CREATE CONTENT
// ==========================================

async function createContent() {
  console.log('\n📝 PHASE 4: Creating sample content...\n');

  // Import the content creation logic
  // We'll inline it here for simplicity

  const categoryIds: Record<string, string> = {};

  // Create categories
  console.log('  Creating article categories...');
  const categories = [
    { name: 'Getting Started', slug: 'getting-started', description: 'Essential guides to set up your portal', icon: 'Rocket' },
    { name: 'Content Management', slug: 'content-management', description: 'Create and manage articles and pages', icon: 'PencilSimple' },
    { name: 'Customization', slug: 'customization', description: 'Personalize branding and navigation', icon: 'Palette' },
  ];

  for (const cat of categories) {
    const result = await graphql<{ createArticleCategory: { id: string } }>(`
      mutation CreateCategory($data: ArticleCategoryCreateInput!) {
        createArticleCategory(data: $data) { id }
      }
    `, { data: cat });

    if (result?.createArticleCategory) {
      categoryIds[cat.slug] = result.createArticleCategory.id;
      // Publish
      await graphql(`mutation { publishArticleCategory(where: { id: "${result.createArticleCategory.id}" }, to: PUBLISHED) { id } }`);
      console.log(`    ✅ Created: ${cat.name}`);
    }
  }

  // Create site settings
  console.log('  Creating site settings...');
  const siteResult = await graphql<{ createSiteSettings: { id: string } }>(`
    mutation CreateSiteSettings($data: SiteSettingsCreateInput!) {
      createSiteSettings(data: $data) { id }
    }
  `, {
    data: {
      siteName: 'HelpPortal',
      subtitle: 'Documentation',
      tagline: 'Learn how to set up and customize your HelpPortal support center.',
      quickLinksTitle: 'Quick Links',
      resourcesTitle: 'Resources',
      communityTitle: 'Community',
      copyrightText: 'HelpPortal',
      privacyPolicyUrl: '/privacy',
      termsOfServiceUrl: '/terms',
    },
  });

  if (siteResult?.createSiteSettings) {
    await graphql(`mutation { publishSiteSettings(where: { id: "${siteResult.createSiteSettings.id}" }, to: PUBLISHED) { id } }`);
    console.log('    ✅ Created site settings');
  }

  // Create navigation links
  console.log('  Creating navigation links...');
  const navLinks = [
    { title: 'Support Hub', url: '/support', icon: 'House', location: 'header', external: false, order: 1 },
    { title: 'Articles', url: '/support/articles', icon: 'BookOpenText', location: 'header', external: false, order: 2 },
    { title: 'Services', url: '/support/services', icon: 'Briefcase', location: 'header', external: false, order: 3 },
    { title: 'Submit Ticket', url: '/support/ticket', icon: 'PaperPlaneTilt', location: 'header', external: false, order: 4 },
    { title: 'Contact', url: '/support/contact', icon: 'Envelope', location: 'header', external: false, order: 5 },
  ];

  for (const link of navLinks) {
    const result = await graphql<{ createNavigationLink: { id: string } }>(`
      mutation CreateNavLink($data: NavigationLinkCreateInput!) {
        createNavigationLink(data: $data) { id }
      }
    `, { data: link });

    if (result?.createNavigationLink) {
      await graphql(`mutation { publishNavigationLink(where: { id: "${result.createNavigationLink.id}" }, to: PUBLISHED) { id } }`);
      console.log(`    ✅ Created: ${link.title}`);
    }
  }

  // Create a sample article
  console.log('  Creating sample article...');
  const articleContent = {
    children: [
      { type: 'heading-one', children: [{ text: 'Welcome to HelpPortal' }] },
      { type: 'paragraph', children: [{ text: 'This is your documentation portal. You can customize this content in Hygraph CMS.' }] },
      { type: 'heading-two', children: [{ text: 'Getting Started' }] },
      { type: 'paragraph', children: [{ text: 'To get started, navigate to your Hygraph dashboard and explore the content models.' }] },
      { type: 'bulleted-list', children: [
        { type: 'list-item', children: [{ text: 'Edit site settings for branding' }] },
        { type: 'list-item', children: [{ text: 'Add navigation links' }] },
        { type: 'list-item', children: [{ text: 'Create articles for your knowledge base' }] },
      ]},
      { type: 'heading-two', children: [{ text: 'Next Steps' }] },
      { type: 'paragraph', children: [{ text: 'Check out the other articles in this category to learn more about customizing your portal.' }] },
    ],
  };

  const articleResult = await graphql<{ createArticle: { id: string } }>(`
    mutation CreateArticle($data: ArticleCreateInput!) {
      createArticle(data: $data) { id }
    }
  `, {
    data: {
      title: 'Welcome to HelpPortal',
      slug: 'welcome-to-helpportal',
      excerpt: 'Get started with your HelpPortal CMS.',
      content: articleContent,
      icon: 'HandWaving',
      readTime: 3,
      keywords: 'welcome, getting started, introduction',
      category: categoryIds['getting-started'] ? { connect: { id: categoryIds['getting-started'] } } : undefined,
    },
  });

  if (articleResult?.createArticle) {
    await graphql(`mutation { publishArticle(where: { id: "${articleResult.createArticle.id}" }, to: PUBLISHED) { id } }`);
    console.log('    ✅ Created welcome article');
  }

  // Create contact settings
  console.log('  Creating contact settings...');
  const contactResult = await graphql<{ createContactSettings: { id: string } }>(`
    mutation CreateContactSettings($data: ContactSettingsCreateInput!) {
      createContactSettings(data: $data) { id }
    }
  `, {
    data: {
      formTitle: 'Get in Touch',
      formSubtitle: 'Have a question? Fill out the form below.',
      companyFieldLabel: 'Company / Server Name',
      companyFieldPlaceholder: 'Enter your company or server name',
      successTitle: 'Message Sent!',
      successMessage: 'Thank you for reaching out.',
      submitButtonText: 'Send Message',
    },
  });

  if (contactResult?.createContactSettings) {
    await graphql(`mutation { publishContactSettings(where: { id: "${contactResult.createContactSettings.id}" }, to: PUBLISHED) { id } }`);
    console.log('    ✅ Created contact settings');
  }

  // Create inquiry types
  console.log('  Creating inquiry types...');
  const inquiryTypes = [
    { typeId: 'general', label: 'General Inquiry', order: 1 },
    { typeId: 'support', label: 'Technical Support', order: 2 },
    { typeId: 'billing', label: 'Billing Question', order: 3 },
  ];

  for (const type of inquiryTypes) {
    const result = await graphql<{ createInquiryType: { id: string } }>(`
      mutation CreateInquiryType($data: InquiryTypeCreateInput!) {
        createInquiryType(data: $data) { id }
      }
    `, { data: type });

    if (result?.createInquiryType) {
      await graphql(`mutation { publishInquiryType(where: { id: "${result.createInquiryType.id}" }, to: PUBLISHED) { id } }`);
      console.log(`    ✅ Created: ${type.label}`);
    }
  }

  // Create ticket categories
  console.log('  Creating ticket categories...');
  const ticketCats = [
    { categoryId: 'technical', name: 'Technical Problem', icon: 'Wrench', order: 1 },
    { categoryId: 'setup', name: 'Setup & Configuration', icon: 'Gear', order: 2 },
    { categoryId: 'feature', name: 'Feature Request', icon: 'Lightbulb', order: 3 },
  ];

  for (const cat of ticketCats) {
    const result = await graphql<{ createTicketCategory: { id: string } }>(`
      mutation CreateTicketCategory($data: TicketCategoryCreateInput!) {
        createTicketCategory(data: $data) { id }
      }
    `, { data: cat });

    if (result?.createTicketCategory) {
      await graphql(`mutation { publishTicketCategory(where: { id: "${result.createTicketCategory.id}" }, to: PUBLISHED) { id } }`);
      console.log(`    ✅ Created: ${cat.name}`);
    }
  }

  console.log('\n  ✅ Content creation complete!');
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  HYGRAPH RESET AND REBUILD SCRIPT');
  console.log('═══════════════════════════════════════════════════════════════');

  if (!CONTENT_TOKEN || !MANAGEMENT_TOKEN) {
    console.error('\n❌ Missing tokens. Set HYGRAPH_CONTENT_TOKEN and HYGRAPH_MANAGEMENT_TOKEN in .env.local');
    process.exit(1);
  }

  console.log(`\n📦 Project ID: ${PROJECT_ID.substring(0, 10)}...`);
  console.log(`🔗 Endpoint: ${ENDPOINT}`);

  // Phase 1: Delete content
  await deleteAllContent();

  // Phase 2: Delete schema
  await deleteSchema();

  // Wait for schema changes to propagate
  console.log('\n⏳ Waiting for schema changes to propagate (30 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 30000));

  // Phase 3: Create schema
  const schemaCreated = await createSchema();

  if (!schemaCreated) {
    console.error('\n❌ Schema creation failed. Please check errors above.');
    process.exit(1);
  }

  // Wait for schema to be ready
  console.log('\n⏳ Waiting for schema to be ready (5 seconds)...');
  await new Promise(resolve => setTimeout(resolve, 5000));

  // Phase 4: Create content
  await createContent();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log('  ✅ RESET AND REBUILD COMPLETE!');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('\n🌐 Visit your Hygraph dashboard to see the new schema and content.');
}

main().catch(console.error);
