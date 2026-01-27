/**
 * Update existing article with icon and readTime
 */

import * as dotenv from 'dotenv';
import * as path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const CONTENT_TOKEN = process.env.HYGRAPH_CONTENT_TOKEN || '';
const ENDPOINT = 'https://api-us-west-2.hygraph.com/v2/cmku5yw6c00xa07wd78s30t75/master';

async function graphql(query: string, variables?: Record<string, unknown>) {
  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${CONTENT_TOKEN}`,
    },
    body: JSON.stringify({ query, variables }),
  });
  return response.json() as Promise<any>;
}

async function main() {
  console.log('========================================');
  console.log('  UPDATE ARTICLE WITH ICON & READTIME');
  console.log('========================================\n');

  // Get the article
  const result = await graphql(`
    query {
      articles(stage: DRAFT, first: 10) {
        id
        slug
        title
      }
    }
  `);

  const articles = result.data?.articles || [];
  console.log(`Found ${articles.length} articles.\n`);

  for (const article of articles) {
    console.log(`Updating "${article.title}"...`);

    // Update with icon and readTime
    const updateResult = await graphql(`
      mutation Update($id: ID!, $icon: String, $readTime: Int) {
        updateArticle(
          where: { id: $id }
          data: { icon: $icon, readTime: $readTime }
        ) { id }
      }
    `, {
      id: article.id,
      icon: 'BookOpenText',  // Default icon for articles
      readTime: 3,           // Estimate 3 min read
    });

    if (updateResult.errors) {
      console.log(`  ERROR: ${updateResult.errors[0].message}`);
    } else {
      console.log(`  Updated!`);
    }

    // Publish the update
    const pubResult = await graphql(`
      mutation Publish($id: ID!) {
        publishArticle(where: { id: $id }, to: PUBLISHED) { id }
      }
    `, { id: article.id });

    if (pubResult.errors) {
      console.log(`  Publish ERROR: ${pubResult.errors[0].message}`);
    } else {
      console.log(`  Published!`);
    }
  }

  console.log('\nDone!');
}

main().catch(console.error);
