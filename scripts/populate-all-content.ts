/**
 * Populate All CMS Content
 *
 * Creates all missing content entries for HelpPortal:
 * - Landing Page Content (with features component)
 * - Pricing Page Content (with features component)
 * - Services Page Content
 * - Services
 * - Service Tiers
 * - SLA Highlights
 * - Helpful Resources
 * - Contact Settings (singleton)
 * - Contact Page Settings (with channels component)
 *
 * Usage: npx tsx scripts/populate-all-content.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

// Use CONTENT_TOKEN for write operations (has mutation permissions)
const TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';

// Extract project ID from token to build correct API endpoint
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

const PROJECT_ID = extractProjectIdFromToken(TOKEN) || '';
const REGION = 'us-west-2';
const ENDPOINT = `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`;

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
        Authorization: `Bearer ${TOKEN}`,
      },
      body: JSON.stringify({ query, variables }),
    });

    const result: GraphQLResponse<T> = await response.json();

    if (result.errors) {
      console.error('  GraphQL errors:', result.errors.map(e => e.message).join(', '));
      return null;
    }

    return result.data || null;
  } catch (error) {
    console.error('  Request error:', error);
    return null;
  }
}

async function publish(model: string, id: string): Promise<void> {
  await graphql(`
    mutation Publish($id: ID!) {
      publish${model}(where: { id: $id }, to: PUBLISHED) { id }
    }
  `, { id });
}

async function deleteEntry(model: string, id: string): Promise<void> {
  await graphql(`
    mutation Delete($id: ID!) {
      delete${model}(where: { id: $id }) { id }
    }
  `, { id });
}

// ==========================================
// MAIN
// ==========================================

async function main() {
  console.log('========================================');
  console.log('  POPULATE ALL CMS CONTENT');
  console.log('========================================\n');

  if (!ENDPOINT || !TOKEN) {
    console.error('Missing HYGRAPH_ENDPOINT or HYGRAPH_TOKEN');
    process.exit(1);
  }

  // ------------------------------------------
  // 1. Clean up duplicate ContactSettings
  // ------------------------------------------
  console.log('1. Cleaning up duplicate ContactSettings...');

  const existingContactSettings = await graphql<{
    contactSettingsEntries: Array<{ id: string }>;
  }>(`query { contactSettingsEntries { id } }`);

  if (existingContactSettings?.contactSettingsEntries) {
    const entries = existingContactSettings.contactSettingsEntries;
    if (entries.length > 1) {
      // Delete all but the first one
      for (let i = 1; i < entries.length; i++) {
        await deleteEntry('ContactSettings', entries[i].id);
        console.log(`   Deleted duplicate: ${entries[i].id}`);
      }
    }
    // Delete the remaining one too so we can create fresh
    if (entries.length > 0) {
      await deleteEntry('ContactSettings', entries[0].id);
      console.log(`   Deleted: ${entries[0].id}`);
    }
  }
  console.log('   ✅ Done\n');

  // ------------------------------------------
  // 2. Create Landing Page Content
  // ------------------------------------------
  console.log('2. Creating Landing Page Content...');

  const landingResult = await graphql<{ createLandingPageContent: { id: string } }>(`
    mutation CreateLandingPageContent($data: LandingPageContentCreateInput!) {
      createLandingPageContent(data: $data) { id }
    }
  `, {
    data: {
      heroTitle: 'Your Own',
      heroSubtitle: 'Create a professional support portal for your Discord community. Knowledge base, service catalog, and ticket system — all under your brand.',
      heroCta: 'Get Started — $5/mo',
      heroCtaUrl: '/signup',
      featuresTitle: 'Everything You Need',
      featuresSubtitle: 'Launch a fully-featured support portal in minutes, not months.',
      features: {
        create: [
          { title: 'Knowledge Base', description: 'Create and organize help articles. Let your users find answers themselves with powerful search.', icon: 'BookOpenText' },
          { title: 'Custom Branding', description: 'Your subdomain, your logo, your colors. Make the portal feel like part of your brand.', icon: 'Palette' },
          { title: 'Discord Login', description: 'Users sign in with Discord. No passwords, no friction. Perfect for Discord communities.', icon: 'Discord' },
          { title: 'Service Catalog', description: 'Showcase your services and pricing tiers. Let customers know exactly what you offer.', icon: 'Briefcase' },
          { title: 'Ticket System', description: 'Users can submit support tickets. Integrates with Jira Service Desk for powerful workflows.', icon: 'Ticket' },
          { title: 'CMS Powered', description: 'Manage content with Hygraph CMS. Update articles and settings without touching code.', icon: 'Lightning' },
        ]
      }
    }
  });

  if (landingResult?.createLandingPageContent) {
    await publish('LandingPageContent', landingResult.createLandingPageContent.id);
    console.log('   ✅ Created and published\n');
  } else {
    console.log('   ⚠️ Failed to create\n');
  }

  // ------------------------------------------
  // 3. Create Pricing Page Content
  // ------------------------------------------
  console.log('3. Creating Pricing Page Content...');

  const pricingResult = await graphql<{ createPricingPageContent: { id: string } }>(`
    mutation CreatePricingPageContent($data: PricingPageContentCreateInput!) {
      createPricingPageContent(data: $data) { id }
    }
  `, {
    data: {
      heroTitle: 'Simple, Transparent Pricing',
      heroSubtitle: 'One plan, everything included. No hidden fees, no surprises.',
      tiersTitle: 'Choose Your Plan',
      faqTitle: 'Frequently Asked Questions',
      features: {
        create: [
          { text: 'Custom branded support portal', included: true },
          { text: 'Discord authentication for your users', included: true },
          { text: 'Knowledge base with unlimited articles', included: true },
          { text: 'Service catalog', included: true },
          { text: 'Ticket submission system', included: true },
          { text: 'Custom subdomain (yourname.helpportal.app)', included: true },
          { text: 'Custom logo and colors', included: true },
          { text: 'Jira Service Desk integration', included: true },
          { text: 'Priority support', included: true },
        ]
      }
    }
  });

  if (pricingResult?.createPricingPageContent) {
    await publish('PricingPageContent', pricingResult.createPricingPageContent.id);
    console.log('   ✅ Created and published\n');
  } else {
    console.log('   ⚠️ Failed to create\n');
  }

  // ------------------------------------------
  // 4. Create Services Page Content
  // ------------------------------------------
  console.log('4. Creating Services Page Content...');

  const servicesPageResult = await graphql<{ createServicesPageContent: { id: string } }>(`
    mutation CreateServicesPageContent($data: ServicesPageContentCreateInput!) {
      createServicesPageContent(data: $data) { id }
    }
  `, {
    data: {
      heroTitle: 'Our Services',
      heroSubtitle: 'Professional solutions to help your Discord community thrive.',
      servicesTitle: 'What We Offer',
      slaTitle: 'Service Guarantees',
      resourcesTitle: 'Helpful Resources',
      ctaTitle: 'Ready to get started?',
      ctaButtonText: 'Contact Us',
      ctaButtonUrl: '/support/contact',
    }
  });

  if (servicesPageResult?.createServicesPageContent) {
    await publish('ServicesPageContent', servicesPageResult.createServicesPageContent.id);
    console.log('   ✅ Created and published\n');
  } else {
    console.log('   ⚠️ Failed to create\n');
  }

  // ------------------------------------------
  // 5. Create Services
  // ------------------------------------------
  console.log('5. Creating Services...');

  const services = [
    {
      name: 'Managed Bot Hosting',
      slug: 'managed-bot-hosting',
      tagline: 'We host and maintain your Discord bots',
      description: 'Focus on your community while we handle the technical infrastructure. Our managed hosting includes 24/7 monitoring, automatic updates, and guaranteed uptime.',
      icon: 'Robot',
      color: '#7C3AED',
      features: '24/7 uptime monitoring\nAutomatic updates\nDaily backups\nPriority support',
      priceLabel: 'From $29/mo',
      buttonText: 'Get Started',
      order: 1,
    },
    {
      name: 'Custom Bot Development',
      slug: 'custom-bot-development',
      tagline: 'Bots built for your unique needs',
      description: 'Need a custom solution? Our team builds Discord bots tailored to your specific requirements, from moderation tools to engagement features.',
      icon: 'Code',
      color: '#2563EB',
      features: 'Custom commands\nAdvanced moderation\nAPI integrations\nFull source code',
      priceLabel: 'From $499',
      buttonText: 'Request Quote',
      order: 2,
    },
    {
      name: 'Server Setup & Optimization',
      slug: 'server-setup',
      tagline: 'Professional Discord server configuration',
      description: 'Let our experts set up your Discord server with best practices for security, permissions, channels, and engagement.',
      icon: 'Gear',
      color: '#059669',
      features: 'Role hierarchy setup\nChannel organization\nSecurity hardening\nBot configuration',
      priceLabel: 'From $99',
      buttonText: 'Learn More',
      order: 3,
    },
  ];

  for (const service of services) {
    const result = await graphql<{ createService: { id: string } }>(`
      mutation CreateService($data: ServiceCreateInput!) {
        createService(data: $data) { id }
      }
    `, { data: service });

    if (result?.createService) {
      await publish('Service', result.createService.id);
      console.log(`   ✅ Created: ${service.name}`);
    }
  }
  console.log('');

  // ------------------------------------------
  // 6. Create Service Tiers
  // ------------------------------------------
  console.log('6. Creating Service Tiers...');

  const tiers = [
    {
      name: 'Starter',
      description: 'Perfect for small communities',
      price: 'Free',
      features: 'Up to 100 members\nBasic moderation\nCommunity support\n1 bot integration',
      responseTime: '48 hours',
      availability: 'Business hours',
      highlighted: false,
      order: 1,
    },
    {
      name: 'Pro',
      description: 'For growing communities',
      price: '$29/mo',
      features: 'Unlimited members\nAdvanced moderation\nPriority support\n5 bot integrations\nCustom branding',
      responseTime: '24 hours',
      availability: 'Extended hours',
      highlighted: true,
      order: 2,
    },
    {
      name: 'Enterprise',
      description: 'For large-scale operations',
      price: 'Custom',
      features: 'Unlimited everything\nDedicated support\nSLA guarantee\nCustom development\nWhite-label options',
      responseTime: '4 hours',
      availability: '24/7',
      highlighted: false,
      order: 3,
    },
  ];

  for (const tier of tiers) {
    const result = await graphql<{ createServiceTier: { id: string } }>(`
      mutation CreateServiceTier($data: ServiceTierCreateInput!) {
        createServiceTier(data: $data) { id }
      }
    `, { data: tier });

    if (result?.createServiceTier) {
      await publish('ServiceTier', result.createServiceTier.id);
      console.log(`   ✅ Created: ${tier.name}`);
    }
  }
  console.log('');

  // ------------------------------------------
  // 7. Create SLA Highlights
  // ------------------------------------------
  console.log('7. Creating SLA Highlights...');

  const slaHighlights = [
    { title: 'Uptime Guarantee', description: 'Our infrastructure maintains consistent availability', icon: 'Check', statValue: '99.9%', order: 1 },
    { title: 'Response Time', description: 'Average first response for Pro tier', icon: 'Clock', statValue: '<24hrs', order: 2 },
    { title: 'Support Availability', description: 'Enterprise tier support coverage', icon: 'Headset', statValue: '24/7', order: 3 },
    { title: 'Satisfaction Rate', description: 'Based on customer feedback', icon: 'Heart', statValue: '98%', order: 4 },
  ];

  for (const highlight of slaHighlights) {
    const result = await graphql<{ createSlaHighlight: { id: string } }>(`
      mutation CreateSlaHighlight($data: SlaHighlightCreateInput!) {
        createSlaHighlight(data: $data) { id }
      }
    `, { data: highlight });

    if (result?.createSlaHighlight) {
      await publish('SlaHighlight', result.createSlaHighlight.id);
      console.log(`   ✅ Created: ${highlight.title}`);
    }
  }
  console.log('');

  // ------------------------------------------
  // 8. Create Helpful Resources
  // ------------------------------------------
  console.log('8. Creating Helpful Resources...');

  const resources = [
    { title: 'Documentation', description: 'Learn how to use all features', icon: 'BookOpenText', url: '/support/articles', order: 1 },
    { title: 'Discord Community', description: 'Join our support server', icon: 'Discord', url: 'https://discord.gg/helpportal', order: 2 },
    { title: 'Submit a Ticket', description: 'Get personalized help', icon: 'Ticket', url: '/support/ticket', order: 3 },
  ];

  for (const resource of resources) {
    const result = await graphql<{ createHelpfulResource: { id: string } }>(`
      mutation CreateHelpfulResource($data: HelpfulResourceCreateInput!) {
        createHelpfulResource(data: $data) { id }
      }
    `, { data: resource });

    if (result?.createHelpfulResource) {
      await publish('HelpfulResource', result.createHelpfulResource.id);
      console.log(`   ✅ Created: ${resource.title}`);
    }
  }
  console.log('');

  // ------------------------------------------
  // 9. Create Contact Settings
  // ------------------------------------------
  console.log('9. Creating Contact Settings...');

  const contactSettingsResult = await graphql<{ createContactSettings: { id: string } }>(`
    mutation CreateContactSettings($data: ContactSettingsCreateInput!) {
      createContactSettings(data: $data) { id }
    }
  `, {
    data: {
      formTitle: 'Get in Touch',
      formSubtitle: 'Have a question or need help? Fill out the form below.',
      companyFieldLabel: 'Company / Server Name',
      companyFieldPlaceholder: 'Enter your company or Discord server name',
      successTitle: 'Message Sent!',
      successMessage: 'Thank you for reaching out. We\'ll respond within 1-2 business days.',
      submitButtonText: 'Send Message',
    }
  });

  if (contactSettingsResult?.createContactSettings) {
    await publish('ContactSettings', contactSettingsResult.createContactSettings.id);
    console.log('   ✅ Created and published\n');
  } else {
    console.log('   ⚠️ Failed to create\n');
  }

  // ------------------------------------------
  // 10. Create Contact Page Settings
  // ------------------------------------------
  console.log('10. Creating Contact Page Settings...');

  const contactPageResult = await graphql<{ createContactPageSettings: { id: string } }>(`
    mutation CreateContactPageSettings($data: ContactPageSettingsCreateInput!) {
      createContactPageSettings(data: $data) { id }
    }
  `, {
    data: {
      pageTitle: 'Contact Us',
      pageSubtitle: 'We\'re here to help. Choose the best way to reach us.',
      channelsTitle: 'Ways to Reach Us',
      channels: {
        create: [
          { title: 'Submit a Ticket', description: 'Best for technical issues and detailed requests', icon: 'Ticket', linkUrl: '/support/ticket', linkText: 'Create Ticket', color: '#7C3AED' },
          { title: 'Discord Server', description: 'Join our community for quick questions', icon: 'Discord', linkUrl: 'https://discord.gg/helpportal', linkText: 'Join Discord', color: '#5865F2' },
          { title: 'Email Support', description: 'For business inquiries and partnerships', icon: 'Envelope', linkUrl: 'mailto:support@helpportal.app', linkText: 'Send Email', color: '#059669' },
        ]
      }
    }
  });

  if (contactPageResult?.createContactPageSettings) {
    await publish('ContactPageSettings', contactPageResult.createContactPageSettings.id);
    console.log('   ✅ Created and published\n');
  } else {
    console.log('   ⚠️ Failed to create\n');
  }

  // ------------------------------------------
  // Done
  // ------------------------------------------
  console.log('========================================');
  console.log('  ✅ ALL CONTENT CREATED!');
  console.log('========================================\n');

  // Verify
  console.log('Verifying content...\n');

  const verify = await graphql<{
    landingPageContents: Array<{ heroTitle: string }>;
    pricingPageContents: Array<{ heroTitle: string }>;
    servicesPageContents: Array<{ heroTitle: string }>;
    services: Array<{ name: string }>;
    serviceTiers: Array<{ name: string }>;
    slaHighlights: Array<{ title: string }>;
    helpfulResources: Array<{ title: string }>;
    contactSettingsEntries: Array<{ formTitle: string }>;
    contactPageSettingsEntries: Array<{ pageTitle: string }>;
  }>(`
    query Verify {
      landingPageContents { heroTitle }
      pricingPageContents { heroTitle }
      servicesPageContents { heroTitle }
      services { name }
      serviceTiers { name }
      slaHighlights { title }
      helpfulResources { title }
      contactSettingsEntries { formTitle }
      contactPageSettingsEntries { pageTitle }
    }
  `);

  if (verify) {
    console.log('Content Summary:');
    console.log(`  - Landing Page: ${verify.landingPageContents.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Pricing Page: ${verify.pricingPageContents.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Services Page: ${verify.servicesPageContents.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Services: ${verify.services.length} entries`);
    console.log(`  - Service Tiers: ${verify.serviceTiers.length} entries`);
    console.log(`  - SLA Highlights: ${verify.slaHighlights.length} entries`);
    console.log(`  - Helpful Resources: ${verify.helpfulResources.length} entries`);
    console.log(`  - Contact Settings: ${verify.contactSettingsEntries.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Contact Page Settings: ${verify.contactPageSettingsEntries.length > 0 ? '✅' : '❌'}`);
  }
}

main().catch(console.error);
