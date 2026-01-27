/**
 * Create comprehensive guide article for setting up articles
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

// Slate.js AST helpers for Hygraph Rich Text
const h1 = (text: string) => ({ type: 'heading-one', children: [{ text }] });
const h2 = (text: string) => ({ type: 'heading-two', children: [{ text }] });
const h3 = (text: string) => ({ type: 'heading-three', children: [{ text }] });
const p = (text: string) => ({ type: 'paragraph', children: [{ text }] });
const bold = (textBefore: string, boldText: string, textAfter: string = '') => ({
  type: 'paragraph',
  children: [
    { text: textBefore },
    { text: boldText, bold: true },
    { text: textAfter },
  ],
});
const list = (items: string[]) => ({
  type: 'bulleted-list',
  children: items.map(item => ({
    type: 'list-item',
    children: [{ type: 'list-item-child', children: [{ text: item }] }],
  })),
});
const numberedList = (items: string[]) => ({
  type: 'numbered-list',
  children: items.map(item => ({
    type: 'list-item',
    children: [{ type: 'list-item-child', children: [{ text: item }] }],
  })),
});

const article = {
  title: 'How to Create and Manage Articles',
  slug: 'how-to-create-articles',
  excerpt: 'A complete beginner-friendly guide to creating, organizing, and publishing help articles for your support portal.',
  content: {
    children: [
      h1('How to Create and Manage Articles'),
      p('This guide will walk you through everything you need to know about creating help articles for your support portal. No technical experience required - just follow along step by step!'),

      h2('What Are Articles?'),
      p('Articles are the help pages your users will read when they visit your support portal. Think of them like pages in a help manual. Each article explains one topic, answers one question, or solves one problem.'),
      p('Good articles help your users find answers on their own, which means fewer support tickets for you!'),

      h2('Before You Start'),
      p('To create articles, you will use a tool called Hygraph. This is where all your content is stored. You should have received login details when you set up your portal.'),
      bold('You will need: ', 'Your Hygraph login email and password'),

      h2('Step 1: Log Into Hygraph'),
      numberedList([
        'Open your web browser (Chrome, Firefox, Safari, or Edge)',
        'Go to hygraph.com',
        'Click "Login" in the top right corner',
        'Enter your email and password',
        'Click "Sign In"',
      ]),
      p('Once logged in, you will see your project dashboard. This is your content home base.'),

      h2('Step 2: Find the Articles Section'),
      numberedList([
        'Look at the left sidebar - you will see a menu',
        'Click on "Content" to expand it',
        'Click on "Articles"',
        'You will now see a list of all your articles (it might be empty if you are just starting)',
      ]),

      h2('Step 3: Create a New Article'),
      numberedList([
        'Click the blue "+ Add entry" button in the top right',
        'A new article form will open',
      ]),
      p('Now you need to fill in the article details. Here is what each field means:'),

      h3('Title'),
      p('This is the name of your article that users will see. Make it clear and descriptive.'),
      list([
        'Good example: "How to Reset Your Password"',
        'Bad example: "Password Stuff"',
      ]),

      h3('Slug'),
      p('This is the web address for your article. Use lowercase letters and dashes instead of spaces.'),
      list([
        'Good example: "how-to-reset-password"',
        'Bad example: "How To Reset Password" (no capitals or spaces!)',
      ]),

      h3('Excerpt'),
      p('This is a short summary (1-2 sentences) that appears in article lists. Tell users what they will learn.'),
      p('Example: "Learn how to reset your password if you forgot it or want to change it for security."'),

      h3('Content'),
      p('This is the main body of your article. You can format text using the toolbar at the top:'),
      list([
        'B = Bold text (for important words)',
        'I = Italic text (for emphasis)',
        'H1, H2, H3 = Headings (to organize sections)',
        'Bullet list = For lists of items',
        'Number list = For step-by-step instructions',
      ]),

      h3('Category'),
      p('Pick which category this article belongs to. Categories help users find related articles. Type the category slug exactly as it appears (like "getting-started").'),

      h3('Keywords'),
      p('Add words that users might search for. Click "+ Add" for each keyword. Think about what words someone would type when looking for this help.'),
      p('Example keywords for a password reset article: "password", "reset", "forgot", "login", "access"'),

      h3('Icon'),
      p('Choose an icon name to display with your article. Some options:'),
      list([
        'BookOpenText - for guides and tutorials',
        'Question - for FAQs',
        'Gear - for settings and configuration',
        'Lightning - for quick tips',
        'Shield - for security topics',
        'CreditCard - for billing topics',
      ]),

      h3('Read Time'),
      p('Estimate how many minutes it takes to read your article. A rough guide:'),
      list([
        'Short article (under 300 words) = 1-2 minutes',
        'Medium article (300-600 words) = 3-5 minutes',
        'Long article (over 600 words) = 5+ minutes',
      ]),

      h2('Step 4: Save Your Article'),
      numberedList([
        'Review everything you entered',
        'Click "Save" in the top right corner',
        'Your article is now saved as a draft',
      ]),

      h2('Step 5: Publish Your Article'),
      p('Saved articles are drafts - users cannot see them yet. To make your article visible:'),
      numberedList([
        'Click the "Publish" button (next to Save)',
        'A popup will appear - click "Publish" again to confirm',
        'Your article is now live!',
      ]),
      bold('Important: ', 'You must publish for changes to appear on your portal. Just saving is not enough.'),

      h2('Editing an Existing Article'),
      numberedList([
        'Go to Content > Articles',
        'Click on the article you want to edit',
        'Make your changes',
        'Click "Save" then "Publish" to update the live version',
      ]),

      h2('Deleting an Article'),
      numberedList([
        'Go to Content > Articles',
        'Find the article you want to delete',
        'Click the three dots menu on the right',
        'Select "Delete"',
        'Confirm by clicking "Delete" in the popup',
      ]),
      bold('Warning: ', 'Deleted articles cannot be recovered. Make sure you really want to delete it!'),

      h2('Tips for Writing Great Articles'),

      h3('Keep It Simple'),
      list([
        'Use short sentences',
        'Avoid technical jargon',
        'Explain any terms that might be confusing',
      ]),

      h3('Use Headings'),
      list([
        'Break long articles into sections',
        'Users can scan headings to find what they need',
        'Use H2 for main sections, H3 for sub-sections',
      ]),

      h3('Use Lists'),
      list([
        'Bullet lists for groups of related items',
        'Numbered lists for step-by-step instructions',
        'Lists are easier to read than long paragraphs',
      ]),

      h3('Be Specific'),
      list([
        'Tell users exactly where to click',
        'Include button names in quotes',
        'Describe what they should see at each step',
      ]),

      h2('Common Problems and Solutions'),

      h3('Article Not Showing Up'),
      p('Did you click "Publish"? Saved drafts are not visible to users. You must publish the article.'),

      h3('Changes Not Appearing'),
      p('After editing, you need to click both "Save" AND "Publish" for changes to go live. Also, it may take a minute for the portal to update.'),

      h3('Slug Already Exists'),
      p('Every article needs a unique slug. If you see this error, change your slug to something different.'),

      h2('Need More Help?'),
      p('If you get stuck or have questions, contact our support team. We are happy to help you get your knowledge base set up!'),
    ],
  },
  keywords: ['articles', 'create', 'write', 'publish', 'hygraph', 'cms', 'content', 'guide', 'tutorial', 'beginner', 'help'],
  icon: 'BookOpenText',
  readTime: 8,
  category: 'getting-started',
};

async function main() {
  console.log('========================================');
  console.log('  CREATE GUIDE ARTICLE');
  console.log('========================================\n');

  if (!CONTENT_TOKEN) {
    console.error('Missing HYGRAPH_CONTENT_TOKEN');
    process.exit(1);
  }

  console.log(`Creating "${article.title}"...`);

  const result = await graphql(`
    mutation Create($data: ArticleCreateInput!) {
      createArticle(data: $data) { id }
    }
  `, {
    data: {
      title: article.title,
      slug: article.slug,
      excerpt: article.excerpt,
      content: article.content,
      keywords: article.keywords,
      icon: article.icon,
      readTime: article.readTime,
      category: article.category,
      datePublished: new Date().toISOString(),
    },
  });

  if (result.errors) {
    console.log(`ERROR: ${result.errors[0].message}`);
    return;
  }

  const id = result.data?.createArticle?.id;
  console.log(`Created! (${id})`);

  // Publish
  console.log('Publishing...');
  const pubResult = await graphql(`
    mutation Publish($id: ID!) {
      publishArticle(where: { id: $id }, to: PUBLISHED) { id }
    }
  `, { id });

  if (pubResult.errors) {
    console.log(`Publish ERROR: ${pubResult.errors[0].message}`);
  } else {
    console.log('Published!');
  }

  console.log('\nDone! Article is now live.');
}

main().catch(console.error);
