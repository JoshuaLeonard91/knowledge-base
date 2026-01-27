/**
 * Test the article query directly
 */
import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const ENDPOINT = process.env.HYGRAPH_ENDPOINT || '';
const TOKEN = process.env.HYGRAPH_TOKEN || '';

console.log('Endpoint:', ENDPOINT ? ENDPOINT.substring(0, 50) + '...' : 'NOT SET');
console.log('Token:', TOKEN ? `SET (${TOKEN.length} chars)` : 'NOT SET');

async function main() {
  const query = `
    query GetArticles {
      articles(first: 100, orderBy: createdAt_DESC) {
        slug
        title
        excerpt
        content { markdown html text }
        category
        keywords
        icon
        readTime
      }
    }
  `;

  console.log('\nSending query...\n');

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${TOKEN}`,
    },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();
  console.log('Response:', JSON.stringify(result, null, 2));
}

main().catch(console.error);
