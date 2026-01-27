/**
 * Inspect Hygraph Schema
 *
 * Queries the schema to see what fields exist on each model.
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTENT_TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';
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
const ENDPOINT = `https://api-${REGION}.hygraph.com/v2/${PROJECT_ID}/master`;

async function inspectSchema() {
  console.log('🔍 Inspecting Hygraph schema...\n');
  console.log(`📦 Project ID: ${PROJECT_ID}`);
  console.log(`🔗 Endpoint: ${ENDPOINT}\n`);

  // Use introspection to get schema info
  const introspectionQuery = `
    query IntrospectSchema {
      __schema {
        types {
          name
          kind
          fields {
            name
            type {
              name
              kind
            }
          }
        }
      }
    }
  `;

  try {
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${CONTENT_TOKEN}`,
      },
      body: JSON.stringify({ query: introspectionQuery }),
    });

    const result = await response.json();

    if (result.errors) {
      console.error('Errors:', result.errors);
      return;
    }

    // Find Article and SiteSettings types
    const types = result.data.__schema.types;

    const modelsToInspect = ['Article', 'SiteSettings', 'ArticleCategory', 'NavigationLink', 'LandingPageContent', 'PricingPageContent', 'ContactPageSettings'];

    for (const modelName of modelsToInspect) {
      const model = types.find((t: { name: string }) => t.name === modelName);
      if (model) {
        console.log(`\n📋 ${modelName} fields:`);
        if (model.fields) {
          const fieldNames = model.fields
            .map((f: { name: string }) => f.name)
            .filter((n: string) => !n.startsWith('_') && n !== 'id')
            .sort();
          fieldNames.forEach((name: string) => console.log(`  - ${name}`));
        } else {
          console.log('  (no fields or not accessible)');
        }
      } else {
        console.log(`\n❌ ${modelName} not found`);
      }
    }

    // Also check input types for mutations
    console.log('\n\n📝 Checking CreateInput types...');

    for (const modelName of modelsToInspect) {
      const inputType = types.find((t: { name: string }) => t.name === `${modelName}CreateInput`);
      if (inputType) {
        console.log(`\n📋 ${modelName}CreateInput fields:`);
        if (inputType.fields) {
          inputType.fields.forEach((f: { name: string }) => console.log(`  - ${f.name}`));
        } else if (inputType.inputFields) {
          // Input types use inputFields, not fields
          const inputFields = (inputType as { inputFields?: { name: string }[] }).inputFields;
          if (inputFields) {
            inputFields.forEach((f) => console.log(`  - ${f.name}`));
          }
        }
      }
    }

  } catch (error) {
    console.error('Error:', error);
  }
}

inspectSchema();
