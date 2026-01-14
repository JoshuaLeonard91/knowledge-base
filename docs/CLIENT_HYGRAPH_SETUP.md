# Hygraph CMS Setup Guide

Welcome! This guide will walk you through setting up Hygraph to manage your Knowledge Base content. No coding required - just follow the steps below.

---

## What You'll Set Up

By the end of this guide, you'll have:
- A Hygraph account with your content project
- Content types for Categories and Articles (required)
- Optional: Services, Service Tiers, and SLA Highlights (for a Services page)
- Your API credentials to connect to the Knowledge Base

Estimated time: 15-20 minutes (basic) or 30-40 minutes (with Services)

---

## Step 1: Create Your Hygraph Account

1. Open your browser and go to app.hygraph.com
2. Click "Sign Up" and create an account (you can use Google, GitHub, or email)
3. Once logged in, click "Create new project"
4. Give your project a name (for example: "My Knowledge Base")
5. Choose the region closest to you (this affects loading speed)
6. Click "Create Project"

You're now in your Hygraph dashboard!

---

## Step 2: Create the Category Content Type

Categories help organize your articles (like "Getting Started", "FAQ", "Troubleshooting").

1. In the left sidebar, click "Schema"
2. Look for "MODELS" on the top left - click the "+ Add" button next to it
3. For Display Name, type: Category
4. The other fields will fill in automatically
5. Click "Create Model"

Now let's add the fields that each category will have. You'll see a list of field types on the right side.

FIELD 1 - Name
- Find "Single line text" in the field types list and click the "+ Add" button next to it
- For Display Name, type: Name
- Check the box that says "Required"
- Click "Create"

FIELD 2 - Slug (this creates the URL-friendly name)
- Find "Slug" in the field types list and click the "+ Add" button next to it
- For Display Name, type: Slug
- Check the box that says "Required"
- Look for "Generate slug from template"
- Click in the template box and type the { character
- A dropdown will appear - select "name"
- Click "Create"

FIELD 3 - Description
- Find "Single line text" in the field types list and click the "+ Add" button next to it
- For Display Name, type: Description
- Leave "Required" unchecked
- Click "Create"

FIELD 4 - Icon
- Find "Single line text" in the field types list and click the "+ Add" button next to it
- For Display Name, type: Icon
- Leave "Required" unchecked
- Click "Create"

Your Category model is complete!

---

## Step 3: Create the Article Content Type

Articles are the main content your users will read.

1. Go back to "Schema" in the left sidebar
2. Click the "+ Add" button next to "MODELS"
3. For Display Name, type: Article
4. Click "Create Model"

Now add these fields from the field types list on the right:

FIELD 1 - Title
- Find "Single line text" and click "+ Add"
- Display Name: Title
- Check "Required"
- Click "Create"

FIELD 2 - Slug
- Find "Slug" and click "+ Add"
- Display Name: Slug
- Check "Required"
- In the template box, type { and select "title" from the dropdown
- Click "Create"

FIELD 3 - Excerpt (short summary)
- Find "Single line text" and click "+ Add"
- Display Name: Excerpt
- Click "Create"

FIELD 4 - Content (the main article body)
- Find "Rich text" and click "+ Add"
- Display Name: Content
- Check "Required"
- Click "Create"

FIELD 5 - Category (links to your categories)
- Find "Reference" and click "+ Add"
- Display Name: Category
- Under "Select the model to reference", choose "Category"
- Make sure "Allow only one" is selected
- Click "Create"

FIELD 6 - Keywords (for search)
- Find "Single line text" and click "+ Add"
- Display Name: Keywords
- Look for "Allow multiple values" and enable it
- Click "Create"

FIELD 7 - Icon
- Find "Single line text" and click "+ Add"
- Display Name: Icon
- Click "Create"

FIELD 8 - Read Time
- Find "Integer" and click "+ Add"
- Display Name: Read Time
- Click "Create"

Your Article model is complete!

---

## OPTIONAL: Services Page

Want a Services page to showcase your offerings and pricing tiers?

See the separate guide: **[Services Page Setup](./CLIENT_HYGRAPH_SERVICES.md)**

The Services page automatically appears when you add services, and stays hidden if you don't.

---

## Step 4: Get Your API Endpoint

The endpoint is the URL that connects your Knowledge Base to Hygraph.

1. Look at the bottom left of the screen and click "Project Settings"
2. In the left sidebar, find the "Access" category
3. Click "Endpoints"
4. Find "High Performance Content API"
5. Copy this URL - it looks something like:
   https://us-west-2.cdn.hygraph.com/content/abc123xyz/master

Save this URL somewhere - you'll need it later.

---

## Step 5: Create Your Access Token

The token is like a password that lets your Knowledge Base read your content.

1. Still in "Project Settings", look at the left sidebar under "Access"
2. Click "Permanent Auth Tokens"
3. Click "Create token"
4. For Name, type: Knowledge Base Read
5. For Description, type: Read-only access for the knowledge base
6. Click "Create"

Now set the permissions:

1. After creating the token, you need to give it read permissions
2. Find "Article" and enable "Read" permission for it
3. Find "Category" and enable "Read" permission for it
4. If you created the Services models, also enable "Read" for:
   - Service
   - Service Tier
   - Sla Highlight
5. Save your changes

IMPORTANT: Copy the token that appears! It's a long string of letters and numbers. You won't be able to see it again after you leave this page.

The token looks something like:
eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJ2ZXJzaW9uIjozLC...

Save this token somewhere safe - you'll need it later.

---

## Step 6: Add Your First Category

Let's add a test category to make sure everything works.

1. Click "Content" in the left sidebar
2. Click "Category"
3. Click "+ Create entry"
4. Fill in the fields:
   - Name: Getting Started
   - Slug: (this should fill in automatically as "getting-started")
   - Description: Quick start guides to help you begin
   - Icon: Rocket
5. Click the blue "Publish" button in the top right corner

Important: Content must be Published to appear on your website. If it says "Draft", it won't show up!

---

## Step 7: Add Your First Article

Now let's add a test article.

1. Go to "Content" in the sidebar
2. Click "Article"
3. Click "+ Create entry"
4. Fill in the fields:
   - Title: Welcome Guide
   - Slug: (should auto-fill as "welcome-guide")
   - Excerpt: Learn how to get started with our platform
   - Content: Write anything here - you can use the formatting toolbar to add headers, bold text, lists, etc.
   - Category: Click this field and select "Getting Started"
   - Keywords: Type "welcome" and press Enter, then type "beginner" and press Enter
   - Icon: Rocket
   - Read Time: 3
5. Click the blue "Publish" button

---

## Step 8: Send Your Credentials

You now have everything needed to connect your Knowledge Base!

Send these two items to your developer or add them to your hosting platform:

1. Your API Endpoint URL (from Step 4)
   Example: https://us-west-2.cdn.hygraph.com/content/abc123xyz/master

2. Your Access Token (from Step 5)
   Example: eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...

These will be added as environment variables:
- HYGRAPH_ENDPOINT = your endpoint URL
- HYGRAPH_TOKEN = your access token
- CMS_SOURCE = hygraph

---

## Adding More Content

To add more categories or articles in the future:

1. Log in to app.hygraph.com
2. Click "Content" in the sidebar
3. Choose "Category" or "Article"
4. Click "+ Create entry"
5. Fill in the fields
6. Click "Publish"

Remember: Always click Publish! Draft content won't appear on your website.

---

## Available Icons

When filling in the Icon field, use one of these names:

For Getting Started content: Rocket
For FAQ content: Question
For Troubleshooting: Wrench
For Guides: BookOpen
For Tutorials: GraduationCap
For Developer/API content: Code
For Security content: Shield
For Billing content: CreditCard
For Account content: User
For Integrations: Plug
For General content: FileText

---

## Common Issues

MY CONTENT ISN'T SHOWING UP
- Make sure you clicked "Publish" (not just saved as draft)
- Check that your token has "Read" permission for both Article and Category

I GET A 403 ERROR
- Your token doesn't have the right permissions
- Go to Project Settings, Access, Permanent Auth Tokens, find your token, and make sure Read is enabled for Article and Category

THE SLUG FIELD ISN'T AUTO-FILLING
- When you set up the Slug field, you need to type { in the template box
- A dropdown should appear - select the field you want (like "name" or "title")

I CAN'T FIND MY TOKEN
- Tokens are only shown once when created
- If you lost it, create a new token with the same permissions

---

## Need Help?

If you run into any issues:
- Hygraph Documentation: hygraph.com/docs
- Hygraph Community: hygraph.com/community

Or contact your developer for assistance.
