/**
 * Hygraph Component Creation Script
 *
 * Creates the 3 components needed for HelpPortal CMS:
 * - LandingFeature
 * - PricingFeature
 * - ContactChannel
 *
 * Usage:
 * 1. Delete any existing models with these names first
 * 2. Run: npx tsx scripts/create-hygraph-components.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Client, SimpleFieldType } from '@hygraph/management-sdk';

// Configuration
const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || 'YOUR_MANAGEMENT_TOKEN';
const ENVIRONMENT = 'master';

// Extract project ID from token's audience claim
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

const PROJECT_ID = extractProjectIdFromToken(MANAGEMENT_TOKEN) || 'YOUR_PROJECT_ID';
const REGION = 'us-west-2';

async function createComponents() {
  console.log('🚀 Starting Hygraph component creation...\n');

  // Validate config
  if (!MANAGEMENT_TOKEN || MANAGEMENT_TOKEN === 'YOUR_MANAGEMENT_TOKEN') {
    console.error('❌ HYGRAPH_MANAGEMENT_TOKEN not set in .env.local');
    process.exit(1);
  }

  console.log(`📦 Project ID: ${PROJECT_ID.substring(0, 10)}...`);
  console.log(`🔑 Token: ${MANAGEMENT_TOKEN.substring(0, 20)}...`);
  console.log(`🌍 Region: ${REGION}\n`);

  // Initialize client
  const client = new Client({
    authToken: MANAGEMENT_TOKEN,
    endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
  });

  try {
    // ========================================
    // COMPONENT: LandingFeature
    // ========================================
    console.log('📦 Creating LandingFeature component...');

    client.createComponent({
      apiId: 'LandingFeature',
      apiIdPlural: 'LandingFeatures',
      displayName: 'Landing Feature',
      description: 'Feature card displayed on the landing page. Each feature has a title, description, and icon.',
    });

    client.createSimpleField({
      parentApiId: 'LandingFeature',
      apiId: 'title',
      displayName: 'Title',
      description: 'Feature headline (e.g., "Knowledge Base", "Ticket System")',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'LandingFeature',
      apiId: 'description',
      displayName: 'Description',
      description: 'Brief explanation of this feature (1-2 sentences)',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'LandingFeature',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name (e.g., "BookOpenText", "Ticket"). Browse at phosphoricons.com',
      type: SimpleFieldType.String,
    });

    // ========================================
    // COMPONENT: PricingFeature
    // ========================================
    console.log('📦 Creating PricingFeature component...');

    client.createComponent({
      apiId: 'PricingFeature',
      apiIdPlural: 'PricingFeatures',
      displayName: 'Pricing Feature',
      description: 'Feature line item shown on the pricing page. Can be marked as included or not.',
    });

    client.createSimpleField({
      parentApiId: 'PricingFeature',
      apiId: 'text',
      displayName: 'Text',
      description: 'Feature text (e.g., "Unlimited articles", "Custom domain")',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'PricingFeature',
      apiId: 'included',
      displayName: 'Included',
      description: 'Is this feature included? Shows checkmark if true, X if false',
      type: SimpleFieldType.Boolean,
    });

    // ========================================
    // COMPONENT: ContactChannel
    // ========================================
    console.log('📦 Creating ContactChannel component...');

    client.createComponent({
      apiId: 'ContactChannel',
      apiIdPlural: 'ContactChannels',
      displayName: 'Contact Channel',
      description: 'Contact method card shown on the contact page (e.g., Discord, Email, Submit Ticket).',
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'title',
      displayName: 'Title',
      description: 'Channel name (e.g., "Discord Community", "Email Support")',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'description',
      displayName: 'Description',
      description: 'Brief description of this contact method and when to use it',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name (e.g., "DiscordLogo", "EnvelopeSimple", "Ticket")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'linkUrl',
      displayName: 'Link URL',
      description: 'Destination URL or path (e.g., "https://discord.gg/xxx", "/support/tickets/new")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'linkText',
      displayName: 'Link Text',
      description: 'Button/link text (e.g., "Join Server", "Send Email", "Submit Ticket")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactChannel',
      apiId: 'color',
      displayName: 'Color',
      description: 'Accent color for this card (hex code, e.g., "#5865F2" for Discord blue)',
      type: SimpleFieldType.String,
    });

    // ========================================
    // RUN MIGRATIONS
    // ========================================
    console.log('\n🔄 Running migrations...');

    const result = await client.run(true);

    if (result.errors) {
      console.error('\n❌ Errors occurred:');
      console.error(result.errors);
    } else {
      console.log('\n✅ Components created successfully!');
      console.log('\n📋 Components created:');
      console.log('  - LandingFeature (title, description, icon)');
      console.log('  - PricingFeature (text, included)');
      console.log('  - ContactChannel (title, description, icon, linkUrl, linkText, color)');
      console.log('\n✨ Next steps:');
      console.log('  1. Add "features" component field to LandingPageContent → LandingFeature');
      console.log('  2. Add "features" component field to PricingPageContent → PricingFeature');
      console.log('  3. Add "contactChannels" component field to ContactPageSettings → ContactChannel');
    }

  } catch (error) {
    console.error('❌ Error creating components:', error);
    throw error;
  }
}

// Run the script
createComponents();
