/**
 * Update guide article with rich text formatting showcase
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

// ============================================
// RICH TEXT HELPERS - Slate.js AST for Hygraph
// ============================================

// Basic text node
const text = (content: string) => ({ text: content });

// Formatted text nodes
const bold = (content: string) => ({ text: content, bold: true });
const italic = (content: string) => ({ text: content, italic: true });
const boldItalic = (content: string) => ({ text: content, bold: true, italic: true });
const underline = (content: string) => ({ text: content, underline: true });
const code = (content: string) => ({ text: content, code: true });

// Headings
const h1 = (content: string) => ({ type: 'heading-one', children: [text(content)] });
const h2 = (content: string) => ({ type: 'heading-two', children: [text(content)] });
const h3 = (content: string) => ({ type: 'heading-three', children: [text(content)] });
const h4 = (content: string) => ({ type: 'heading-four', children: [text(content)] });

// Paragraph with mixed formatting
const p = (...children: any[]) => ({
  type: 'paragraph',
  children: children.map(c => typeof c === 'string' ? text(c) : c)
});

// Block quote
const blockquote = (...children: any[]) => ({
  type: 'block-quote',
  children: children.map(c => typeof c === 'string' ? { type: 'paragraph', children: [text(c)] } : c)
});

// Code block
const codeBlock = (content: string) => ({
  type: 'code-block',
  children: [text(content)]
});

// Link
const link = (url: string, linkText: string) => ({
  type: 'link',
  href: url,
  children: [text(linkText)]
});

// Lists
const bulletList = (...items: any[]) => ({
  type: 'bulleted-list',
  children: items.map(item => ({
    type: 'list-item',
    children: [{
      type: 'list-item-child',
      children: Array.isArray(item) ? item.map(i => typeof i === 'string' ? text(i) : i) : [typeof item === 'string' ? text(item) : item]
    }]
  }))
});

const numberedList = (...items: any[]) => ({
  type: 'numbered-list',
  children: items.map(item => ({
    type: 'list-item',
    children: [{
      type: 'list-item-child',
      children: Array.isArray(item) ? item.map(i => typeof i === 'string' ? text(i) : i) : [typeof item === 'string' ? text(item) : item]
    }]
  }))
});

// Class/callout simulation using block quote with emoji
const tip = (content: string) => blockquote(p('💡 ', bold('Tip: '), content));
const warning = (content: string) => blockquote(p('⚠️ ', bold('Warning: '), content));
const info = (content: string) => blockquote(p('ℹ️ ', bold('Note: '), content));
const success = (content: string) => blockquote(p('✅ ', bold('Success: '), content));

// ============================================
// ARTICLE CONTENT
// ============================================

const richContent = {
  children: [
    h1('How to Create and Manage Articles'),

    p(
      'This guide will walk you through ',
      bold('everything'),
      ' you need to know about creating help articles for your support portal. ',
      italic('No technical experience required'),
      ' — just follow along step by step!'
    ),

    tip('Bookmark this page! You can come back to it anytime you need a refresher.'),

    h2('📚 What Are Articles?'),

    p(
      'Articles are the help pages your users will read when they visit your support portal. Think of them like pages in a help manual. Each article explains ',
      bold('one topic'),
      ', answers ',
      bold('one question'),
      ', or solves ',
      bold('one problem'),
      '.'
    ),

    p(
      'Good articles help your users find answers on their own, which means ',
      italic('fewer support tickets for you!'),
    ),

    h2('🔐 Before You Start'),

    p(
      'To create articles, you will use a tool called ',
      bold('Hygraph'),
      '. This is your ',
      italic('Content Management System (CMS)'),
      ' — where all your content is stored and managed.'
    ),

    info('You should have received login details when you set up your portal. Check your email!'),

    h3('What You Need'),
    bulletList(
      [bold('Hygraph login'), ' — your email and password'],
      [bold('A web browser'), ' — Chrome, Firefox, Safari, or Edge'],
      [bold('Your article content'), ' — what you want to write about']
    ),

    h2('📝 Step 1: Log Into Hygraph'),

    numberedList(
      'Open your web browser',
      [text('Go to '), link('https://hygraph.com', 'hygraph.com')],
      [text('Click '), code('"Login"'), text(' in the top right corner')],
      'Enter your email and password',
      [text('Click '), code('"Sign In"')]
    ),

    success('Once logged in, you will see your project dashboard. This is your content home base!'),

    h2('📂 Step 2: Find the Articles Section'),

    numberedList(
      [text('Look at the '), bold('left sidebar'), text(' — you will see a menu')],
      [text('Click on '), code('"Content"'), text(' to expand it')],
      [text('Click on '), code('"Articles"')],
      'You will now see a list of all your articles'
    ),

    info('If this is your first time, the list might be empty. That is perfectly normal!'),

    h2('✨ Step 3: Create a New Article'),

    p(
      'Click the blue ',
      code('+ Add entry'),
      ' button in the top right corner. A new article form will open with several fields to fill in.'
    ),

    h3('Understanding Each Field'),

    h4('Title'),
    p('This is the name of your article that users will see. Make it ', bold('clear'), ' and ', bold('descriptive'), '.'),

    bulletList(
      [text('✅ Good: '), code('"How to Reset Your Password"')],
      [text('❌ Bad: '), code('"Password Stuff"')]
    ),

    h4('Slug'),
    p(
      'The slug is the ',
      bold('URL-friendly version'),
      ' of your title. Use ',
      italic('lowercase letters'),
      ' and ',
      italic('dashes'),
      ' instead of spaces.'
    ),

    bulletList(
      [text('✅ Good: '), code('how-to-reset-password')],
      [text('❌ Bad: '), code('How To Reset Password'), text(' (no capitals or spaces!)')]
    ),

    warning('Each article must have a unique slug. If you see an error, try a different slug.'),

    h4('Excerpt'),
    p(
      'A ',
      bold('short summary'),
      ' (1-2 sentences) that appears in article lists. Tell users what they will learn.'
    ),

    blockquote(
      p(italic('"Learn how to reset your password if you forgot it or want to change it for security."'))
    ),

    h4('Content'),
    p('This is the ', bold('main body'), ' of your article. Use the formatting toolbar:'),

    bulletList(
      [bold('B'), text(' — Bold text for important words')],
      [italic('I'), text(' — Italic text for emphasis')],
      [text('H1, H2, H3 — Headings to organize sections')],
      [text('• Bullet list — For groups of items')],
      [text('1. Number list — For step-by-step instructions')],
      [code('< >'), text(' — Code formatting for technical terms')],
      [text('" — Block quotes for callouts and tips')]
    ),

    h4('Category'),
    p(
      'Pick which category this article belongs to. Type the ',
      bold('category slug'),
      ' exactly as it appears (like ',
      code('getting-started'),
      ').'
    ),

    h4('Keywords'),
    p(
      'Add words that users might ',
      bold('search for'),
      '. Think about what someone would type when looking for this help.'
    ),

    p('Example keywords for a password article:'),
    codeBlock('password, reset, forgot, login, access, security'),

    h4('Icon'),
    p('Choose a ', link('https://phosphoricons.com', 'Phosphor icon'), ' name to display with your article:'),

    bulletList(
      [code('BookOpenText'), text(' — Guides and tutorials')],
      [code('Question'), text(' — FAQs')],
      [code('Gear'), text(' — Settings and configuration')],
      [code('Lightning'), text(' — Quick tips')],
      [code('Shield'), text(' — Security topics')],
      [code('CreditCard'), text(' — Billing topics')],
      [code('Wrench'), text(' — Troubleshooting')]
    ),

    h4('Read Time'),
    p('Estimate how many minutes it takes to read your article:'),

    bulletList(
      [bold('1-2 min'), text(' — Short (under 300 words)')],
      [bold('3-5 min'), text(' — Medium (300-600 words)')],
      [bold('5+ min'), text(' — Long (over 600 words)')]
    ),

    h2('💾 Step 4: Save Your Article'),

    numberedList(
      'Review everything you entered',
      [text('Click '), code('"Save"'), text(' in the top right corner')],
      [text('Your article is now saved as a '), bold('draft')]
    ),

    warning('Drafts are NOT visible to users yet. You must publish to make it live!'),

    h2('🚀 Step 5: Publish Your Article'),

    p(
      'This is the ',
      boldItalic('most important step'),
      '! Saved articles are just drafts — users cannot see them.'
    ),

    numberedList(
      [text('Click the '), code('"Publish"'), text(' button (next to Save)')],
      'A popup will appear asking you to confirm',
      [text('Click '), code('"Publish"'), text(' again')],
      [bold('Your article is now live!'), text(' 🎉')]
    ),

    success('Visit your support portal to see your new article!'),

    h2('✏️ Editing Articles'),

    p('Need to update an existing article? Easy!'),

    numberedList(
      [text('Go to '), bold('Content > Articles')],
      'Click on the article you want to edit',
      'Make your changes',
      [text('Click '), code('"Save"'), text(' then '), code('"Publish"')]
    ),

    info('Always remember: Save AND Publish. Just saving will not update the live version.'),

    h2('🗑️ Deleting Articles'),

    numberedList(
      [text('Go to '), bold('Content > Articles')],
      'Find the article you want to delete',
      [text('Click the '), bold('three dots menu'), text(' (⋮) on the right')],
      [text('Select '), code('"Delete"')],
      'Confirm in the popup'
    ),

    warning('Deleted articles cannot be recovered. Make sure you really want to delete it!'),

    h2('💡 Tips for Writing Great Articles'),

    h3('Keep It Simple'),
    bulletList(
      'Use short sentences',
      'Avoid technical jargon',
      'Explain any terms that might be confusing',
      [text('Write like you are explaining to a '), italic('friend')]
    ),

    h3('Structure Matters'),
    bulletList(
      [text('Use '), bold('headings'), text(' to break up long articles')],
      [text('Use '), bold('bullet lists'), text(' for groups of items')],
      [text('Use '), bold('numbered lists'), text(' for step-by-step instructions')],
      [text('Keep paragraphs '), italic('short'), text(' — 2-3 sentences max')]
    ),

    h3('Be Specific'),
    bulletList(
      [text('Tell users '), bold('exactly'), text(' where to click')],
      [text('Put button names in '), code('code formatting')],
      'Describe what users should see at each step',
      'Include screenshots when possible'
    ),

    h2('❓ Common Problems'),

    h3('Article Not Showing Up'),
    p(
      'Did you click ',
      bold('"Publish"'),
      '? Saved drafts are ',
      italic('not visible'),
      ' to users. You must publish the article.'
    ),

    h3('Changes Not Appearing'),
    p(
      'After editing, you need to click ',
      bold('both'),
      ' "Save" ',
      bold('AND'),
      ' "Publish" for changes to go live. Also, it may take up to a minute for the portal to update.'
    ),

    h3('Slug Already Exists'),
    p(
      'Every article needs a ',
      bold('unique slug'),
      '. If you see this error, change your slug to something different.'
    ),

    h2('🆘 Need More Help?'),

    p(
      'If you get stuck or have questions, ',
      bold("don't hesitate"),
      ' to contact our support team. We are happy to help you get your knowledge base set up!'
    ),

    blockquote(
      p(
        '📧 Email us or submit a ticket through your dashboard. We typically respond within ',
        bold('24 hours'),
        '.'
      )
    ),
  ],
};

async function main() {
  console.log('========================================');
  console.log('  UPDATE GUIDE ARTICLE (RICH TEXT)');
  console.log('========================================\n');

  if (!CONTENT_TOKEN) {
    console.error('Missing HYGRAPH_CONTENT_TOKEN');
    process.exit(1);
  }

  // Find the existing article
  const findResult = await graphql(`
    query {
      articles(where: { slug: "how-to-create-articles" }, stage: DRAFT) {
        id
      }
    }
  `);

  const articleId = findResult.data?.articles?.[0]?.id;

  if (!articleId) {
    console.log('Article not found. Creating new one...');

    const createResult = await graphql(`
      mutation Create($data: ArticleCreateInput!) {
        createArticle(data: $data) { id }
      }
    `, {
      data: {
        title: 'How to Create and Manage Articles',
        slug: 'how-to-create-articles',
        excerpt: 'A complete beginner-friendly guide to creating, organizing, and publishing help articles for your support portal. Includes tips, examples, and troubleshooting.',
        content: richContent,
        keywords: ['articles', 'create', 'write', 'publish', 'hygraph', 'cms', 'content', 'guide', 'tutorial', 'beginner', 'help'],
        icon: 'BookOpenText',
        readTime: 10,
        category: 'getting-started',
        datePublished: new Date().toISOString(),
      },
    });

    if (createResult.errors) {
      console.log('Create ERROR:', createResult.errors[0].message);
      return;
    }

    const newId = createResult.data?.createArticle?.id;
    console.log(`Created! (${newId})`);

    // Publish
    await graphql(`mutation { publishArticle(where: { id: "${newId}" }, to: PUBLISHED) { id } }`);
    console.log('Published!');
    return;
  }

  console.log(`Found article: ${articleId}`);
  console.log('Updating with rich text content...');

  const updateResult = await graphql(`
    mutation Update($id: ID!, $data: ArticleUpdateInput!) {
      updateArticle(where: { id: $id }, data: $data) { id }
    }
  `, {
    id: articleId,
    data: {
      content: richContent,
      excerpt: 'A complete beginner-friendly guide to creating, organizing, and publishing help articles for your support portal. Includes tips, examples, and troubleshooting.',
      readTime: 10,
    },
  });

  if (updateResult.errors) {
    console.log('Update ERROR:', updateResult.errors[0].message);
    return;
  }

  console.log('Updated!');

  // Publish
  const pubResult = await graphql(`
    mutation Publish($id: ID!) {
      publishArticle(where: { id: $id }, to: PUBLISHED) { id }
    }
  `, { id: articleId });

  if (pubResult.errors) {
    console.log('Publish ERROR:', pubResult.errors[0].message);
  } else {
    console.log('Published!');
  }

  console.log('\n✨ Done! Article updated with rich formatting.');
}

main().catch(console.error);
