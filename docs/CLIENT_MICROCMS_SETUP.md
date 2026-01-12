# microCMS Setup Guide

This guide walks you through connecting microCMS as the content management system for your knowledge base articles.

---

## Overview

microCMS is a Japanese headless CMS that's easy to use and has a generous free tier. Your support portal fetches articles directly from your microCMS account.

**Time required:** ~10-15 minutes

---

## Step 1: Create a microCMS Account

1. Go to [microCMS](https://microcms.io/)
2. Click **Sign Up** (free tier available)
3. Create your account

---

## Step 2: Create a Service

1. After logging in, click **Create Service**
2. Enter a service name (e.g., "support-portal")
3. Note your **Service ID** - this is the subdomain (e.g., `support-portal` from `support-portal.microcms.io`)

---

## Step 3: Create API Schemas

You need two API endpoints: **articles** and **categories**.

### Create Articles API

1. Click **Create New API**
2. Select **List Format** (multiple entries)
3. Set API endpoint to: `articles`
4. Add the following fields:

| Field ID | Display Name | Type | Required |
|----------|--------------|------|----------|
| `slug` | Slug | Text | Yes |
| `title` | Title | Text | Yes |
| `excerpt` | Excerpt | Text | No |
| `content` | Content | Rich Text or Markdown | Yes |
| `category` | Category | Reference (to categories) | No |
| `keywords` | Keywords | Text List | No |
| `icon` | Icon | Text | No |
| `readTime` | Read Time | Number | No |

5. Click **Create**

### Create Categories API

1. Click **Create New API**
2. Select **List Format**
3. Set API endpoint to: `categories`
4. Add the following fields:

| Field ID | Display Name | Type | Required |
|----------|--------------|------|----------|
| `name` | Name | Text | Yes |
| `description` | Description | Text | No |
| `icon` | Icon | Text | No |

5. Click **Create**

---

## Step 4: Get Your API Key

1. Go to **Service Settings** (gear icon)
2. Click **API Keys**
3. Copy your API key (or create a new one with GET permissions only)

**Important:** For security, create a key with only **GET** permissions for production use.

---

## Step 5: Add Some Content

> **Schema Templates:** Upload these to auto-create your API fields:
> - `docs/templates/categories-schema.csv`
> - `docs/templates/articles-schema.csv`

### Add Categories

1. Go to **categories** API
2. Click **Create**
3. Add categories (see template for examples):

| name | description | icon |
|------|-------------|------|
| Getting Started | Learn the basics and get up and running quickly | Rocket |
| FAQ | Frequently asked questions and answers | Question |
| Troubleshooting | Solutions to common problems and issues | Wrench |

### Add Articles

1. Go to **articles** API
2. Click **Create**
3. Fill in the fields:
   - **slug**: `welcome-guide` (URL-friendly, lowercase, hyphens)
   - **title**: `Welcome to Our Support Portal`
   - **excerpt**: `Learn how to get started...`
   - **content**: Your article content (supports Rich Text with colors, images, etc.)
   - **category**: Select from your categories (Reference field)
   - **keywords**: `welcome, getting started, beginner`
   - **icon**: `Rocket`
   - **readTime**: `5`

> **Note:** The `category` field should be a **Reference** field type pointing to your categories API. This links articles to categories.

---

## Step 6: Configure Environment Variables

Add these to your DigitalOcean App Platform (or `.env.local` for development):

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `CMS_SOURCE` | `microcms` | No |
| `MICROCMS_SERVICE_ID` | Your service ID (e.g., `support-portal`) | No |
| `MICROCMS_API_KEY` | Your API key | **Yes** |

### Example Configuration

```env
CMS_SOURCE=microcms
MICROCMS_SERVICE_ID=support-portal
MICROCMS_API_KEY=your-api-key-here
```

---

## Step 7: Verify Setup

After deploying with the new environment variables:

1. Visit your support portal's `/support` page
2. You should see your categories
3. Click on a category to see articles
4. Search should find your articles

---

## Content Formatting

microCMS supports both Rich Text and Markdown. For the knowledge base, we recommend using the **Markdown** field type for content.

### Supported Markdown

```markdown
# Heading 1
## Heading 2
### Heading 3

**bold text**
*italic text*
`inline code`

- List item 1
- List item 2

[Link text](https://example.com)

| Column 1 | Column 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

---

## Available Icons

Use any of these icon names in the `icon` field:

- `Rocket`, `Shield`, `Terminal`, `FileText`, `Key`, `Database`
- `Crown`, `Warning`, `Search`, `Settings`, `Calendar`, `Bell`
- `Lock`, `Layout`, `Question`, `Wrench`, `BookOpen`, `Code`
- `Megaphone`, `CreditCard`, `User`, `Plug`, `Article`, `GraduationCap`

---

## Troubleshooting

### No articles showing

- Verify `CMS_SOURCE` is set to `microcms`
- Check that `MICROCMS_SERVICE_ID` matches your service subdomain
- Verify the API key has GET permissions
- Check that articles are published (not draft)

### API errors

- Ensure the API key is correct
- Check that API endpoints are named `articles` and `categories`
- Verify field IDs match exactly (case-sensitive)

### Categories not showing

- The categories API is optional - if not configured, categories are auto-generated from article data
- Make sure you're using a Reference field type for the category in articles

---

## Pricing

microCMS has a free tier that includes:
- 3 APIs
- 10,000 API requests/month
- 1GB transfer

This is usually sufficient for small to medium support portals. See [microCMS Pricing](https://microcms.io/pricing) for details.

---

## Security Notes

- API keys are stored encrypted in DigitalOcean
- Keys are never exposed to the frontend
- Use GET-only permissions for production
- Each client has their own isolated microCMS account
