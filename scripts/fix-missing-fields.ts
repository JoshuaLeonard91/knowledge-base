/**
 * Fix Missing Fields
 *
 * Adds missing fields to models that the application code expects.
 *
 * Usage: npx tsx scripts/fix-missing-fields.ts
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Client, SimpleFieldType } from '@hygraph/management-sdk';

const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || '';

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

async function main() {
  console.log('========================================');
  console.log('  ADDING MISSING FIELDS TO SCHEMA');
  console.log('========================================\n');

  if (!MANAGEMENT_TOKEN) {
    console.error('Missing HYGRAPH_MANAGEMENT_TOKEN');
    process.exit(1);
  }

  console.log(`Project ID: ${PROJECT_ID.substring(0, 10)}...\n`);

  const client = new Client({
    authToken: MANAGEMENT_TOKEN,
    endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`,
  });

  // ------------------------------------------
  // LandingPageContent missing fields
  // ------------------------------------------
  console.log('1. Adding missing LandingPageContent fields...');

  // heroHighlight
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroHighlight',
    displayName: 'Hero Highlight',
    description: 'Highlighted text in hero (gradient text)',
    type: SimpleFieldType.String,
  });

  // heroSecondaryCtaText
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroSecondaryCtaText',
    displayName: 'Hero Secondary CTA Text',
    type: SimpleFieldType.String,
  });

  // heroSecondaryCtaLink
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'heroSecondaryCtaLink',
    displayName: 'Hero Secondary CTA Link',
    type: SimpleFieldType.String,
  });

  // ctaTitle
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'ctaTitle',
    displayName: 'CTA Section Title',
    type: SimpleFieldType.String,
  });

  // ctaSubtitle
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'ctaSubtitle',
    displayName: 'CTA Section Subtitle',
    type: SimpleFieldType.String,
  });

  // ctaButtonText
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'ctaButtonText',
    displayName: 'CTA Button Text',
    type: SimpleFieldType.String,
  });

  // ctaButtonLink
  client.createSimpleField({
    parentApiId: 'LandingPageContent',
    apiId: 'ctaButtonLink',
    displayName: 'CTA Button Link',
    type: SimpleFieldType.String,
  });

  console.log('   - heroHighlight');
  console.log('   - heroSecondaryCtaText');
  console.log('   - heroSecondaryCtaLink');
  console.log('   - ctaTitle');
  console.log('   - ctaSubtitle');
  console.log('   - ctaButtonText');
  console.log('   - ctaButtonLink');

  // ------------------------------------------
  // Run migration
  // ------------------------------------------
  console.log('\nRunning migration...');

  try {
    const result = await client.run(true);
    if (result.errors) {
      console.log('\n⚠️ Some fields may already exist:');
      console.log(result.errors);
    } else {
      console.log('\n✅ Schema updated successfully!');
    }
  } catch (error) {
    console.error('Migration error:', error);
  }

  // ------------------------------------------
  // Now update the content with new field values
  // ------------------------------------------
  console.log('\n2. Updating LandingPageContent with new field values...');

  const CONTENT_TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';
  const ENDPOINT = `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`;

  // Get existing content ID
  const getResponse = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONTENT_TOKEN}`,
    },
    body: JSON.stringify({
      query: `query { landingPageContents(first: 1) { id } }`,
    }),
  });

  const getData = await getResponse.json() as { data?: { landingPageContents: Array<{ id: string }> } };
  const contentId = getData.data?.landingPageContents?.[0]?.id;

  if (contentId) {
    // Update with new fields
    const updateResponse = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONTENT_TOKEN}`,
      },
      body: JSON.stringify({
        query: `
          mutation UpdateLandingPage($id: ID!, $data: LandingPageContentUpdateInput!) {
            updateLandingPageContent(where: { id: $id }, data: $data) { id }
            publishLandingPageContent(where: { id: $id }, to: PUBLISHED) { id }
          }
        `,
        variables: {
          id: contentId,
          data: {
            heroHighlight: 'Support Portal',
            heroSecondaryCtaText: 'View Pricing',
            heroSecondaryCtaLink: '/pricing',
            ctaTitle: 'Ready to Get Started?',
            ctaSubtitle: 'Create your support portal today. $15 to start ($10 setup + $5 first month), then just $5/month.',
            ctaButtonText: 'Create Your Portal',
            ctaButtonLink: '/signup',
          },
        },
      }),
    });

    const updateData = await updateResponse.json();
    if ((updateData as { errors?: unknown }).errors) {
      console.log('   ⚠️ Update errors:', (updateData as { errors: unknown }).errors);
    } else {
      console.log('   ✅ Content updated and published');
    }
  } else {
    console.log('   ⚠️ No existing content found to update');
  }

  console.log('\n========================================');
  console.log('  ✅ DONE');
  console.log('========================================');
}

main().catch(console.error);
