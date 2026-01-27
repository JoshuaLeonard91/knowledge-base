/**
 * Add icon and readTime fields to Article model
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

import { Client, SimpleFieldType } from '@hygraph/management-sdk';

const MANAGEMENT_TOKEN = process.env.HYGRAPH_MANAGEMENT_TOKEN || '';
const REGION = 'us-west-2';

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

async function main() {
  console.log('========================================');
  console.log('  ADD FIELDS TO ARTICLE MODEL');
  console.log('========================================\n');

  if (!MANAGEMENT_TOKEN) {
    console.error('Missing HYGRAPH_MANAGEMENT_TOKEN');
    process.exit(1);
  }

  const client = new Client({
    authToken: MANAGEMENT_TOKEN,
    endpoint: `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`,
  });

  // Icon field (Phosphor icon name)
  console.log('Adding icon field...');
  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'icon',
    displayName: 'Icon',
    description: 'Phosphor icon name (e.g., "BookOpen", "Gear", "Lightning")',
    type: SimpleFieldType.String,
  });

  // Read time field
  console.log('Adding readTime field...');
  client.createSimpleField({
    parentApiId: 'Article',
    apiId: 'readTime',
    displayName: 'Read Time',
    description: 'Estimated read time in minutes',
    type: SimpleFieldType.Int,
  });

  console.log('\nApplying changes...');

  try {
    const result = await client.run(true);

    if (result.errors) {
      console.log('\nErrors:');
      const errors = Array.isArray(result.errors) ? result.errors : [result.errors];
      errors.forEach((e: any) => console.log('  -', typeof e === 'string' ? e : (e.message || JSON.stringify(e))));
    } else {
      console.log('\nFields added successfully!');
      console.log('Migration ID:', result.migration?.id);
      console.log('Status:', result.migration?.status);
    }
  } catch (err: any) {
    console.log('\nException:', err.message);
  }
}

main().catch(console.error);
