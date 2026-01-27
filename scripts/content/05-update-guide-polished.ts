/**
 * Update guide article - polished, no emojis, accurate Hygraph instructions
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

const text = (content: string) => ({ text: content });
const bold = (content: string) => ({ text: content, bold: true });
const italic = (content: string) => ({ text: content, italic: true });
const code = (content: string) => ({ text: content, code: true });

const h1 = (content: string) => ({ type: 'heading-one', children: [text(content)] });
const h2 = (content: string) => ({ type: 'heading-two', children: [text(content)] });
const h3 = (content: string) => ({ type: 'heading-three', children: [text(content)] });
const h4 = (content: string) => ({ type: 'heading-four', children: [text(content)] });
const h5 = (content: string) => ({ type: 'heading-five', children: [text(content)] });
const h6 = (content: string) => ({ type: 'heading-six', children: [text(content)] });

const p = (...children: any[]) => ({
  type: 'paragraph',
  children: children.map(c => typeof c === 'string' ? text(c) : c)
});

const blockquote = (...children: any[]) => ({
  type: 'block-quote',
  children: children.map(c => typeof c === 'string' ? { type: 'paragraph', children: [text(c)] } : c)
});

const codeBlock = (content: string) => ({
  type: 'code-block',
  children: [text(content)]
});

const link = (url: string, linkText: string) => ({
  type: 'link',
  href: url,
  children: [text(linkText)]
});

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

// Callouts
const tip = (...content: any[]) => blockquote(p(bold('Tip: '), ...content));
const warning = (...content: any[]) => blockquote(p(bold('Warning: '), ...content));
const note = (...content: any[]) => blockquote(p(bold('Note: '), ...content));

// ============================================
// ARTICLE CONTENT - Professional, No Emojis
// ============================================

const richContent = {
  children: [
    h1('How to Create and Manage Articles'),

    p(
      'This guide walks you through creating help articles for your support portal using Hygraph, your content management system. ',
      'Follow these steps to create, edit, and publish articles that help your users find answers quickly.'
    ),

    h2('Before You Begin'),

    p(
      'You will need access to your ',
      bold('Hygraph dashboard'),
      '. If you have not received your login credentials, contact your administrator or check your email for the welcome message sent during setup.'
    ),

    h3('Requirements'),
    bulletList(
      'Hygraph account credentials (email and password)',
      'A modern web browser (Chrome, Firefox, Safari, or Edge)',
      'The content you want to publish'
    ),

    h2('Accessing the Content Editor'),

    numberedList(
      [text('Navigate to '), link('https://app.hygraph.com', 'app.hygraph.com'), text(' and sign in')],
      'Select your project from the dashboard',
      [text('In the left sidebar, click '), bold('Content')],
      [text('Click '), bold('Article'), text(' to view existing articles or create new ones')]
    ),

    h2('Creating a New Article'),

    p(
      'From the Article content view, click the ',
      bold('Create entry'),
      ' button in the top right corner. This opens the article editor with the following fields:'
    ),

    h3('Title'),
    p(
      'Enter a clear, descriptive title that tells users what the article covers. ',
      'This appears as the main heading and in search results.'
    ),

    h4('Good Title Examples'),
    bulletList(
      [code('How to Reset Your Password')],
      [code('Getting Started with Discord Integration')],
      [code('Understanding Your Billing Statement')],
      [code('Troubleshooting Login Errors')]
    ),

    h4('Titles to Avoid'),
    bulletList(
      [code('Password'), text(' — Too vague, does not describe what the article covers')],
      [code('Help'), text(' — Not specific enough')],
      [code('FAQ'), text(' — Use for a collection, not individual articles')],
      [code('Click Here'), text(' — Not descriptive')]
    ),

    h3('Slug'),
    p(
      'The slug is the URL-friendly identifier for your article. It appears in the browser address bar when someone views your article.'
    ),

    h4('Slug Format Rules'),
    bulletList(
      'Use only lowercase letters',
      'Replace spaces with hyphens',
      'Remove special characters (no !, ?, &, etc.)',
      'Keep it concise but descriptive'
    ),

    h4('Slug Examples'),
    bulletList(
      [text('Title: "How to Reset Your Password" '), text(' — Slug: '), code('how-to-reset-your-password')],
      [text('Title: "What is Two-Factor Authentication?" '), text(' — Slug: '), code('what-is-two-factor-authentication')],
      [text('Title: "Billing & Payments FAQ" '), text(' — Slug: '), code('billing-payments-faq')]
    ),
    warning('Each slug must be unique. If you receive an error, the slug is already in use by another article.'),

    h3('Excerpt'),
    p(
      'Write a brief summary (one to two sentences) that appears in article listings. This helps users decide if the article answers their question before they click.'
    ),

    h4('Excerpt Examples'),
    blockquote(
      p(italic('"Step-by-step instructions for resetting your account password, including what to do if you no longer have access to your email."'))
    ),
    blockquote(
      p(italic('"Learn how to connect your Discord server to enable single sign-on for your community members."'))
    ),
    blockquote(
      p(italic('"Common solutions for login problems, including browser issues, expired sessions, and account lockouts."'))
    ),

    h3('Content'),
    p(
      'This is the main body of your article. The rich text editor provides formatting tools in the toolbar:'
    ),
    bulletList(
      [bold('Bold'), text(' — Emphasize important terms or actions')],
      [italic('Italic'), text(' — Secondary emphasis or introduce terms')],
      [text('Headings (H2, H3, H4) — Organize content into scannable sections')],
      [text('Bullet lists — Group related items or options')],
      [text('Numbered lists — Step-by-step instructions')],
      [code('Code'), text(' — Button names, field labels, or technical terms')],
      [text('Block quotes — Callouts, tips, or important notices')],
      [text('Links — Reference external resources or other articles')]
    ),

    h4('Writing Tips'),
    bulletList(
      'Start with a brief introduction explaining what the user will learn',
      'Use headings to break content into logical sections',
      'Keep paragraphs short — two to three sentences maximum',
      'Use numbered lists for sequential steps',
      'Use bullet lists for non-sequential items',
      [text('Put button and field names in '), code('code formatting'), text(' for clarity')]
    ),

    h3('Category'),
    p(
      'Enter the ',
      bold('category slug'),
      ' that this article belongs to. Categories help organize your knowledge base and allow users to browse related content.'
    ),
    p('Available categories depend on your configuration. Common examples:'),
    bulletList(
      [code('getting-started'), text(' — Onboarding and setup guides')],
      [code('account-billing'), text(' — Account management and payments')],
      [code('troubleshooting'), text(' — Problem resolution')],
      [code('integrations'), text(' — Third-party connections')],
      [code('faq'), text(' — Frequently asked questions')]
    ),

    h3('Keywords'),
    p(
      'Add search terms that users might enter when looking for this content. Click ',
      bold('Add'),
      ' to add each keyword individually.'
    ),
    p('Think about:'),
    bulletList(
      'Synonyms for terms in your title',
      'Common misspellings',
      'Related concepts users might search for',
      'Action words (reset, change, update, fix)'
    ),

    h3('Icon'),
    p(
      'Select a ',
      link('https://phosphoricons.com', 'Phosphor icon'),
      ' name to display alongside your article. Enter the icon name exactly as shown:'
    ),
    bulletList(
      [code('BookOpenText'), text(' — Guides, tutorials, documentation')],
      [code('Question'), text(' — FAQs and general questions')],
      [code('Gear'), text(' — Settings and configuration')],
      [code('Lightning'), text(' — Quick tips and shortcuts')],
      [code('Shield'), text(' — Security and privacy')],
      [code('CreditCard'), text(' — Billing and payments')],
      [code('Wrench'), text(' — Troubleshooting and fixes')],
      [code('Users'), text(' — Account and user management')],
      [code('Link'), text(' — Integrations and connections')]
    ),

    h3('Read Time'),
    p(
      'Enter the estimated reading time in minutes. This helps users gauge the article length before they start reading.'
    ),
    bulletList(
      [bold('1-2 minutes'), text(' — Short articles under 300 words')],
      [bold('3-5 minutes'), text(' — Medium articles, 300-700 words')],
      [bold('6-10 minutes'), text(' — Comprehensive guides over 700 words')]
    ),

    h2('Saving and Publishing'),

    h3('Save as Draft'),
    p(
      'Click ',
      bold('Save'),
      ' in the top right corner to save your progress. Saved articles are stored as drafts and are ',
      bold('not visible'),
      ' to users on your portal.'
    ),
    tip('Save frequently while writing longer articles to avoid losing work.'),

    h3('Publish'),
    p(
      'When your article is ready, click ',
      bold('Publish'),
      ' to make it live. In the confirmation dialog, click ',
      bold('Publish'),
      ' again to confirm.'
    ),
    note(
      'After publishing, changes may take up to one minute to appear on your portal due to caching.'
    ),

    h2('Editing Existing Articles'),

    numberedList(
      [text('Navigate to '), bold('Content'), text(' and select '), bold('Article')],
      'Click on the article you want to edit',
      'Make your changes in the editor',
      [text('Click '), bold('Save'), text(' to update the draft')],
      [text('Click '), bold('Publish'), text(' to push changes to your live portal')]
    ),
    warning(
      'You must click both Save and Publish for changes to appear on your portal. Saving alone only updates the draft.'
    ),

    h2('Deleting Articles'),

    numberedList(
      [text('Navigate to '), bold('Content'), text(' and select '), bold('Article')],
      'Locate the article you want to remove',
      [text('Click the '), bold('three-dot menu'), text(' on the right side of the row')],
      [text('Select '), bold('Delete')],
      'Confirm the deletion in the dialog'
    ),
    warning('Deleted articles cannot be recovered. Consider unpublishing instead if you may need the content later.'),

    h2('Best Practices'),

    h3('Structure for Scannability'),
    p('Most users scan articles rather than reading word-by-word. Help them find information quickly:'),
    bulletList(
      'Use descriptive headings that summarize each section',
      'Front-load important information at the beginning',
      'Keep paragraphs focused on a single point',
      'Use lists to break up dense information'
    ),

    h3('Write Clear Instructions'),
    p('When documenting procedures:'),
    bulletList(
      'Start each step with an action verb (Click, Enter, Select)',
      [text('Reference UI elements exactly as they appear: '), code('Click the "Save" button')],
      'Describe what users should see after each action',
      'Anticipate common mistakes and address them'
    ),

    h3('Maintain Consistency'),
    bulletList(
      'Use the same terminology throughout your knowledge base',
      'Follow a consistent format for similar types of articles',
      'Keep your tone professional but approachable',
      'Update related articles when you make changes'
    ),

    h2('Troubleshooting'),

    h3('Article not appearing on the portal'),
    p(
      'Verify that you clicked ',
      bold('Publish'),
      ' after saving. Drafts are not visible to users. Also allow up to one minute for cache updates.'
    ),

    h3('Changes not reflected after editing'),
    p(
      'Ensure you clicked both ',
      bold('Save'),
      ' and ',
      bold('Publish'),
      '. Saving updates only the draft; publishing pushes changes live.'
    ),

    h3('Slug already exists error'),
    p(
      'Each article requires a unique slug. Modify your slug to be distinct from existing articles.'
    ),

    h3('Formatting not displaying correctly'),
    p(
      'Check that you selected the correct formatting option in the toolbar. For code, use the code formatting button rather than quotes.'
    ),

    h2('Complete Example'),

    p('Here is a complete example showing how to fill in all fields for a sample article:'),

    h3('Example: Password Reset Article'),

    h4('Field Values'),
    bulletList(
      [bold('Title: '), code('How to Reset Your Password')],
      [bold('Slug: '), code('how-to-reset-your-password')],
      [bold('Category: '), code('account-billing')],
      [bold('Icon: '), code('Shield')],
      [bold('Read Time: '), code('3')]
    ),

    h4('Excerpt'),
    blockquote(
      p(italic('Learn how to reset your account password using email verification. Includes steps for users who no longer have access to their registered email.'))
    ),

    h4('Keywords'),
    codeBlock('password, reset, forgot, login, access, security, email, verification'),

    h4('Content Structure'),
    p('The article content would be structured like this:'),

    bulletList(
      [bold('Introduction'), text(' — Brief explanation of when users need to reset their password')],
      [bold('H2: Reset via Email'), text(' — Steps for standard password reset')],
      [bold('H3: Step 1'), text(' — Click "Forgot Password" on the login page')],
      [bold('H3: Step 2'), text(' — Enter your email address')],
      [bold('H3: Step 3'), text(' — Check your inbox for the reset link')],
      [bold('H3: Step 4'), text(' — Create a new password')],
      [bold('H2: No Access to Email'), text(' — Alternative steps for users who cannot access their email')],
      [bold('H2: Password Requirements'), text(' — List of requirements for new passwords')],
      [bold('H2: Still Need Help?'), text(' — Contact information for additional support')]
    ),

    tip('Use this example as a template when creating your own articles. Adjust the structure based on your content.'),

    h2('Getting Help'),

    p(
      'If you encounter issues not covered in this guide, contact support through your dashboard or email us directly. We typically respond within one business day.'
    ),
  ],
};

async function main() {
  console.log('========================================');
  console.log('  UPDATE GUIDE ARTICLE (POLISHED)');
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
    console.log('Article not found! Creating...');

    const createResult = await graphql(`
      mutation Create($data: ArticleCreateInput!) {
        createArticle(data: $data) { id }
      }
    `, {
      data: {
        title: 'How to Create and Manage Articles',
        slug: 'how-to-create-articles',
        excerpt: 'Complete guide to creating, editing, and publishing help articles in your support portal using Hygraph CMS.',
        content: richContent,
        keywords: ['articles', 'create', 'write', 'publish', 'hygraph', 'cms', 'content', 'guide', 'tutorial', 'editor'],
        icon: 'BookOpenText',
        readTime: 8,
        category: 'getting-started',
        datePublished: new Date().toISOString(),
      },
    });

    if (createResult.errors) {
      console.log('Create ERROR:', createResult.errors[0].message);
      return;
    }

    const newId = createResult.data?.createArticle?.id;
    console.log(`Created: ${newId}`);

    await graphql(`mutation { publishArticle(where: { id: "${newId}" }, to: PUBLISHED) { id } }`);
    console.log('Published!');
    return;
  }

  console.log(`Updating article: ${articleId}`);

  const updateResult = await graphql(`
    mutation Update($id: ID!, $data: ArticleUpdateInput!) {
      updateArticle(where: { id: $id }, data: $data) { id }
    }
  `, {
    id: articleId,
    data: {
      content: richContent,
      excerpt: 'Complete guide to creating, editing, and publishing help articles in your support portal using Hygraph CMS.',
      readTime: 8,
    },
  });

  if (updateResult.errors) {
    console.log('Update ERROR:', updateResult.errors[0].message);
    return;
  }

  console.log('Updated!');

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

  console.log('\nDone! Article updated with polished content.');
}

main().catch(console.error);
