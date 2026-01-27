/**
 * Hygraph Schema Creation Script
 *
 * Creates all remaining models for HelpPortal CMS.
 *
 * Prerequisites:
 * - Components already created: LandingFeature, PricingFeature, ContactChannel
 * - Enumeration already created: NavigationLocation
 * - Models already created: SiteSettings, NavigationLink, ArticleCategory
 *
 * Usage:
 * 1. Set environment variables HYGRAPH_PROJECT_ID and HYGRAPH_MANAGEMENT_TOKEN in .env.local
 * 2. Run: npx tsx scripts/create-hygraph-schema.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from .env.local
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Client, SimpleFieldType, RelationalFieldType } from '@hygraph/management-sdk';

// Configuration - set these or use environment variables
const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || 'YOUR_MANAGEMENT_TOKEN';
const ENVIRONMENT = 'master';

// Extract project ID from token's audience claim
function extractProjectIdFromToken(token: string): string | null {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
    const audience = Array.isArray(payload.aud) ? payload.aud[0] : payload.aud;
    // Extract project ID from URL like https://api-us-west-2.hygraph.com/v2/PROJECT_ID/master
    const match = audience.match(/\/v2\/([^/]+)\//);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}

const PROJECT_ID = extractProjectIdFromToken(MANAGEMENT_TOKEN) || process.env.HYGRAPH_PROJECT_ID || 'YOUR_PROJECT_ID';
const REGION = 'us-west-2';

async function createSchema() {
  console.log('🚀 Starting Hygraph schema creation...\n');

  // Debug: Check if variables are loaded
  if (!PROJECT_ID || PROJECT_ID === 'YOUR_PROJECT_ID') {
    console.error('❌ HYGRAPH_PROJECT_ID not set in .env.local');
    process.exit(1);
  }
  if (!MANAGEMENT_TOKEN || MANAGEMENT_TOKEN === 'YOUR_MANAGEMENT_TOKEN') {
    console.error('❌ HYGRAPH_MANAGEMENT_TOKEN not set in .env.local');
    process.exit(1);
  }
  console.log(`📦 Project ID: ${PROJECT_ID.substring(0, 10)}...`);
  console.log(`🔑 Token: ${MANAGEMENT_TOKEN.substring(0, 20)}...`);
  console.log(`🌍 Region: ${REGION}\n`);

  // Initialize client - SDK auto-detects endpoint from token
  const client = new Client({
    authToken: MANAGEMENT_TOKEN,
    endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/${ENVIRONMENT}`,
  });

  try {
    // ========================================
    // MODEL: Article (SKIPPED - already exists)
    // ========================================
    console.log('⏭️  Skipping Article model (already exists)...');

    // NOTE: Article model was created in a previous run.
    // If you need to recreate it, delete it from Hygraph first.

    // ========================================
    // MODEL: Service
    // ========================================
    console.log('📝 Creating Service model...');

    client.createModel({
      apiId: 'Service',
      apiIdPlural: 'Services',
      displayName: 'Service',
      description: 'Services offered on the services page. Each service can have features, pricing, and related articles.',
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'name',
      displayName: 'Name',
      description: 'Service name displayed to users (e.g., "Custom Bot Development")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'slug',
      displayName: 'Slug',
      description: 'URL-friendly identifier. Auto-generates from name',
      type: SimpleFieldType.String,
      isRequired: true,
      isUnique: true,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'tagline',
      displayName: 'Tagline',
      description: 'Short catchy description (under 10 words). Shown below service name',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'description',
      displayName: 'Description',
      description: 'Full service description explaining what is included and benefits',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name (e.g., "Robot", "Gear", "Users"). Browse at phosphoricons.com',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'color',
      displayName: 'Color',
      description: 'Accent color for this service card (hex code, e.g., "#7C3AED")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'features',
      displayName: 'Features',
      description: 'Feature bullet points, one per line. Each becomes a list item',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'relatedArticles',
      displayName: 'Related Articles',
      description: 'Article slugs (comma-separated) to show as related content',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order on page. Lower numbers appear first (1, 2, 3...)',
      type: SimpleFieldType.Int,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'priceLabel',
      displayName: 'Price Label',
      description: 'Pricing text shown on card (e.g., "Starting at $199", "From $49/mo")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'Service',
      apiId: 'buttonText',
      displayName: 'Button Text',
      description: 'Call-to-action button text. Default: "Get Started"',
      type: SimpleFieldType.String,
    });

    // ========================================
    // MODEL: ServiceTier
    // ========================================
    console.log('📝 Creating ServiceTier model...');

    client.createModel({
      apiId: 'ServiceTier',
      apiIdPlural: 'ServiceTiers',
      displayName: 'Service Tier',
      description: 'Pricing tiers displayed on the services page. Typically Free, Pro, and Enterprise.',
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'name',
      displayName: 'Name',
      description: 'Tier name (e.g., "Free", "Pro", "Enterprise")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'slug',
      displayName: 'Slug',
      description: 'URL-friendly identifier',
      type: SimpleFieldType.String,
      isRequired: true,
      isUnique: true,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'description',
      displayName: 'Description',
      description: 'Short description of who this tier is for',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'price',
      displayName: 'Price',
      description: 'Price display text (e.g., "Free", "$49/mo", "Custom")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'features',
      displayName: 'Features',
      description: 'Features included in this tier, one per line',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'responseTime',
      displayName: 'Response Time',
      description: 'Expected support response time (e.g., "24 hours", "<4 hours")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'availability',
      displayName: 'Availability',
      description: 'Support availability (e.g., "Business hours", "24/7")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'supportChannels',
      displayName: 'Support Channels',
      description: 'Available support channels (e.g., "Email", "Email, Chat", "Phone, Email, Chat")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'highlighted',
      displayName: 'Highlighted',
      description: 'Show as "Recommended" tier with visual emphasis',
      type: SimpleFieldType.Boolean,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'accentColor',
      displayName: 'Accent Color',
      description: 'Tier accent color (hex code, e.g., "#7C3AED")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'buttonText',
      displayName: 'Button Text',
      description: 'CTA button text. Default: "Contact Sales"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServiceTier',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order. Lower numbers appear first',
      type: SimpleFieldType.Int,
      isRequired: true,
    });

    // ========================================
    // MODEL: SLAHighlight
    // ========================================
    console.log('📝 Creating SLAHighlight model...');

    client.createModel({
      apiId: 'SLAHighlight',
      apiIdPlural: 'SLAHighlights',
      displayName: 'SLA Highlight',
      description: 'Trust badges and metrics displayed on the services page (e.g., "99.9% Uptime", "24/7 Support").',
    });

    client.createSimpleField({
      parentApiId: 'SLAHighlight',
      apiId: 'title',
      displayName: 'Title',
      description: 'Highlight headline (e.g., "Guaranteed Uptime", "Response Time")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'SLAHighlight',
      apiId: 'description',
      displayName: 'Description',
      description: 'Brief explanation of this metric or guarantee',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'SLAHighlight',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name. Default: "Check"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'SLAHighlight',
      apiId: 'statValue',
      displayName: 'Stat Value',
      description: 'Large stat to display (e.g., "99.9%", "24/7", "<4hrs"). If set, shows instead of icon',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'SLAHighlight',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order. Lower numbers appear first',
      type: SimpleFieldType.Int,
      isRequired: true,
    });

    // ========================================
    // MODEL: HelpfulResource
    // ========================================
    console.log('📝 Creating HelpfulResource model...');

    client.createModel({
      apiId: 'HelpfulResource',
      apiIdPlural: 'HelpfulResources',
      displayName: 'Helpful Resource',
      description: 'Resource links displayed on the services page. Links to docs, guides, or external resources.',
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'title',
      displayName: 'Title',
      description: 'Resource link title (e.g., "Documentation", "API Reference")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'description',
      displayName: 'Description',
      description: 'Brief description of what this resource contains',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'url',
      displayName: 'URL',
      description: 'Link destination. Use relative paths (e.g., "/support/articles") or full URLs',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name. Default: "BookOpenText"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'color',
      displayName: 'Color',
      description: 'Accent color for hover effect (hex code)',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'HelpfulResource',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order. Lower numbers appear first',
      type: SimpleFieldType.Int,
      isRequired: true,
    });

    // ========================================
    // MODEL: ServicesPageContent
    // ========================================
    console.log('📝 Creating ServicesPageContent model...');

    client.createModel({
      apiId: 'ServicesPageContent',
      apiIdPlural: 'ServicesPageContents',
      displayName: 'Services Page Content',
      description: 'Text content and copy for the services page sections. Only one entry should exist.',
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'heroTitle',
      displayName: 'Hero Title',
      description: 'Main headline on services page',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'heroSubtitle',
      displayName: 'Hero Subtitle',
      description: 'Subheading text below hero title',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'servicesTitle',
      displayName: 'Services Title',
      description: 'Title for the services section. Default: "What We Offer"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'servicesSubtitle',
      displayName: 'Services Subtitle',
      description: 'Subtitle for the services section',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'slaTitle',
      displayName: 'SLA Title',
      description: 'Title for the SLA/metrics section. Default: "Service Level Agreements"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'slaSubtitle',
      displayName: 'SLA Subtitle',
      description: 'Subtitle for the SLA section',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'resourcesTitle',
      displayName: 'Resources Title',
      description: 'Title for the resources section. Default: "Helpful Resources"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'resourcesSubtitle',
      displayName: 'Resources Subtitle',
      description: 'Subtitle for the resources section',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'ctaTitle',
      displayName: 'CTA Title',
      description: 'Title for bottom call-to-action section',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ServicesPageContent',
      apiId: 'ctaSubtitle',
      displayName: 'CTA Subtitle',
      description: 'Subtitle for bottom call-to-action section',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    // ========================================
    // MODEL: LandingPageContent
    // ========================================
    console.log('📝 Creating LandingPageContent model...');

    client.createModel({
      apiId: 'LandingPageContent',
      apiIdPlural: 'LandingPageContents',
      displayName: 'Landing Page Content',
      description: 'Content for the main domain landing page. Only one entry should exist.',
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroTitle',
      displayName: 'Hero Title',
      description: 'Main headline (e.g., "Build Your Support Portal")',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroHighlight',
      displayName: 'Hero Highlight',
      description: 'Text portion to highlight with gradient (e.g., "in Minutes")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroSubtitle',
      displayName: 'Hero Subtitle',
      description: 'Subheading below the main title',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroCta',
      displayName: 'Hero CTA',
      description: 'Primary button text (e.g., "Get Started")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroCtaLink',
      displayName: 'Hero CTA Link',
      description: 'Primary button URL (e.g., "/signup")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroSecondaryCtaText',
      displayName: 'Hero Secondary CTA Text',
      description: 'Secondary button text (e.g., "View Demo")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'heroSecondaryCtaLink',
      displayName: 'Hero Secondary CTA Link',
      description: 'Secondary button URL',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'featuresTitle',
      displayName: 'Features Title',
      description: 'Title for features section',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'featuresSubtitle',
      displayName: 'Features Subtitle',
      description: 'Subtitle for features section',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'ctaTitle',
      displayName: 'CTA Title',
      description: 'Bottom CTA section title',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'ctaSubtitle',
      displayName: 'CTA Subtitle',
      description: 'Bottom CTA section subtitle',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'ctaButtonText',
      displayName: 'CTA Button Text',
      description: 'Bottom CTA button text',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'LandingPageContent',
      apiId: 'ctaButtonLink',
      displayName: 'CTA Button Link',
      description: 'Bottom CTA button URL',
      type: SimpleFieldType.String,
    });

    // ========================================
    // MODEL: PricingPageContent
    // ========================================
    console.log('📝 Creating PricingPageContent model...');

    client.createModel({
      apiId: 'PricingPageContent',
      apiIdPlural: 'PricingPageContents',
      displayName: 'Pricing Page Content',
      description: 'Content for the main domain pricing page. Only one entry should exist.',
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'pageTitle',
      displayName: 'Page Title',
      description: 'Main page headline',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'pageSubtitle',
      displayName: 'Page Subtitle',
      description: 'Subheading below title',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'planName',
      displayName: 'Plan Name',
      description: 'Name of the pricing plan (e.g., "Pro")',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'planDescription',
      displayName: 'Plan Description',
      description: 'Description of what the plan includes',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'monthlyPrice',
      displayName: 'Monthly Price',
      description: 'Price as a number only (e.g., "5" for $5)',
      type: SimpleFieldType.String,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'setupFee',
      displayName: 'Setup Fee',
      description: 'One-time setup fee as number only (e.g., "10" for $10)',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'ctaText',
      displayName: 'CTA Text',
      description: 'Call-to-action button text',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'ctaLink',
      displayName: 'CTA Link',
      description: 'Call-to-action button URL',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'PricingPageContent',
      apiId: 'footerNote',
      displayName: 'Footer Note',
      description: 'Small text below pricing (e.g., "Cancel anytime. No questions asked.")',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    // ========================================
    // MODEL: ContactSettings
    // ========================================
    console.log('📝 Creating ContactSettings model...');

    client.createModel({
      apiId: 'ContactSettings',
      apiIdPlural: 'ContactSettingsEntries',
      displayName: 'Contact Settings',
      description: 'Configuration for the service inquiry modal/form. Only one entry should exist.',
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'formTitle',
      displayName: 'Form Title',
      description: 'Modal/form headline',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'formSubtitle',
      displayName: 'Form Subtitle',
      description: 'Text below form title',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'companyFieldLabel',
      displayName: 'Company Field Label',
      description: 'Label for company/organization field (e.g., "Company / Server Name")',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'companyFieldPlaceholder',
      displayName: 'Company Field Placeholder',
      description: 'Placeholder text for company field',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'successTitle',
      displayName: 'Success Title',
      description: 'Title shown after successful submission',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'successMessage',
      displayName: 'Success Message',
      description: 'Message shown after successful submission',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ContactSettings',
      apiId: 'submitButtonText',
      displayName: 'Submit Button Text',
      description: 'Submit button label. Default: "Send Message"',
      type: SimpleFieldType.String,
    });

    // ========================================
    // MODEL: ContactPageSettings
    // ========================================
    console.log('📝 Creating ContactPageSettings model...');

    client.createModel({
      apiId: 'ContactPageSettings',
      apiIdPlural: 'ContactPageSettingsEntries',
      displayName: 'Contact Page Settings',
      description: 'Configuration for the /support/contact page. Only one entry should exist.',
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'pageTitle',
      displayName: 'Page Title',
      description: 'Contact page headline',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'pageSubtitle',
      displayName: 'Page Subtitle',
      description: 'Text below page title',
      type: SimpleFieldType.String,
      formRenderer: 'Multiline',
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'discordUrl',
      displayName: 'Discord URL',
      description: 'Discord server invite link',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'emailAddress',
      displayName: 'Email Address',
      description: 'Contact email address',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'showDecisionGuide',
      displayName: 'Show Decision Guide',
      description: 'Show help for choosing contact method',
      type: SimpleFieldType.Boolean,
    });

    client.createSimpleField({
      parentApiId: 'ContactPageSettings',
      apiId: 'showResponseTimes',
      displayName: 'Show Response Times',
      description: 'Display expected response times',
      type: SimpleFieldType.Boolean,
    });

    // ========================================
    // MODEL: InquiryType
    // ========================================
    console.log('📝 Creating InquiryType model...');

    client.createModel({
      apiId: 'InquiryType',
      apiIdPlural: 'InquiryTypes',
      displayName: 'Inquiry Type',
      description: 'Dropdown options for the service inquiry form (e.g., "General Inquiry", "Pricing Information").',
    });

    client.createSimpleField({
      parentApiId: 'InquiryType',
      apiId: 'typeId',
      displayName: 'Type ID',
      description: 'Unique identifier for this type (e.g., "general", "pricing")',
      type: SimpleFieldType.String,
      isRequired: true,
      isUnique: true,
    });

    client.createSimpleField({
      parentApiId: 'InquiryType',
      apiId: 'label',
      displayName: 'Label',
      description: 'Display text shown in dropdown (e.g., "General Inquiry")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'InquiryType',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order in dropdown. Lower numbers appear first',
      type: SimpleFieldType.Int,
      isRequired: true,
    });

    // ========================================
    // MODEL: TicketCategory
    // ========================================
    console.log('📝 Creating TicketCategory model...');

    client.createModel({
      apiId: 'TicketCategory',
      apiIdPlural: 'TicketCategories',
      displayName: 'Ticket Category',
      description: 'Dropdown options for the ticket submission form (e.g., "Technical Problem", "Billing").',
    });

    client.createSimpleField({
      parentApiId: 'TicketCategory',
      apiId: 'categoryId',
      displayName: 'Category ID',
      description: 'Unique identifier for this category (e.g., "technical", "billing")',
      type: SimpleFieldType.String,
      isRequired: true,
      isUnique: true,
    });

    client.createSimpleField({
      parentApiId: 'TicketCategory',
      apiId: 'name',
      displayName: 'Name',
      description: 'Display text shown in dropdown (e.g., "Technical Problem")',
      type: SimpleFieldType.String,
      isTitle: true,
      isRequired: true,
    });

    client.createSimpleField({
      parentApiId: 'TicketCategory',
      apiId: 'icon',
      displayName: 'Icon',
      description: 'Phosphor icon name. Default: "Question"',
      type: SimpleFieldType.String,
    });

    client.createSimpleField({
      parentApiId: 'TicketCategory',
      apiId: 'order',
      displayName: 'Order',
      description: 'Display order in dropdown. Lower numbers appear first',
      type: SimpleFieldType.Int,
      isRequired: true,
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
      console.log('\n✅ Schema created successfully!');
      console.log('\n📋 Models created:');
      console.log('  - Article');
      console.log('  - Service');
      console.log('  - ServiceTier');
      console.log('  - SLAHighlight');
      console.log('  - HelpfulResource');
      console.log('  - ServicesPageContent');
      console.log('  - LandingPageContent');
      console.log('  - PricingPageContent');
      console.log('  - ContactSettings');
      console.log('  - ContactPageSettings');
      console.log('  - InquiryType');
      console.log('  - TicketCategory');
      console.log('\n⚠️  Manual steps required:');
      console.log('  1. Add "features" component field to LandingPageContent (LandingFeature)');
      console.log('  2. Add "features" component field to PricingPageContent (PricingFeature)');
      console.log('  3. Add contact channel component fields to ContactPageSettings');
    }

  } catch (error) {
    console.error('❌ Error creating schema:', error);
    throw error;
  }
}

// Run the script
createSchema();
