# Google Docs CMS Setup Guide

This guide explains how to set up Google Docs as a CMS for your knowledge base.

## Overview

The knowledge base uses:
- **Google Sheets** as an article index (metadata)
- **Google Docs** for article content

## Prerequisites

1. A Google Cloud Project with APIs enabled
2. A Google API Key
3. A Google Sheet for the article index
4. Google Docs for each article

## Step 1: Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project
3. Enable these APIs:
   - Google Docs API
   - Google Sheets API
4. Create an API Key:
   - Go to APIs & Services > Credentials
   - Create Credentials > API Key
   - (Optional) Restrict the key to Docs and Sheets APIs

## Step 2: Create the Article Index Sheet

1. Create a new Google Sheet
2. Name the first sheet tab: `Articles`
3. Add this header row (Row 1):

| A | B | C | D | E | F | G | H |
|---|---|---|---|---|---|---|---|
| documentId | slug | title | category | excerpt | icon | keywords | published |

### Column Descriptions

| Column | Required | Description |
|--------|----------|-------------|
| documentId | Yes | Google Doc ID (from URL) |
| slug | Yes | URL-friendly identifier (e.g., `getting-started`) |
| title | No | Article title (falls back to Doc title) |
| category | No | Category slug (e.g., `faq`, `guides`). Creates categories dynamically |
| excerpt | No | Brief description (auto-generated if empty) |
| icon | No | Phosphor icon name (default: `Article`) |
| keywords | No | Comma-separated keywords for search |
| published | No | `true` or `false` (default: true) |

### Example Data

| documentId | slug | title | category | excerpt | icon | keywords | published |
|------------|------|-------|----------|---------|------|----------|-----------|
| 1ABC...xyz | getting-started | Getting Started Guide | getting-started | Learn the basics | Rocket | setup,start,begin | true |
| 1DEF...uvw | faq-billing | Billing FAQ | faq | Common billing questions | CreditCard | billing,payment | true |
| 1GHI...rst | troubleshoot-login | Login Issues | troubleshooting | Fix login problems | Wrench | login,error,fix | true |

## Step 3: Get Document IDs

The Document ID is in the Google Doc URL:
```
https://docs.google.com/document/d/[DOCUMENT_ID]/edit
```

For example, in this URL:
```
https://docs.google.com/document/d/1ABC123xyz456/edit
```
The document ID is: `1ABC123xyz456`

## Step 4: Get Sheet ID

The Sheet ID is in the Google Sheet URL:
```
https://docs.google.com/spreadsheets/d/[SHEET_ID]/edit
```

## Step 5: Make Documents Public

For API key access (simplest setup):

1. Open each Google Doc
2. Click Share > Anyone with the link > Viewer
3. Do the same for the Google Sheet

## Step 6: Configure Environment Variables

Add to your `.env.local`:

```env
GOOGLE_API_KEY=your_api_key_here
GOOGLE_DOCS_INDEX_SHEET_ID=your_sheet_id_here
```

## Dynamic Categories

Categories are created automatically based on unique values in the `category` column.

### Category Display Names
Category slugs are converted to display names:
- `getting-started` → "Getting Started"
- `faq` → "FAQ"
- `troubleshooting` → "Troubleshooting"

### Category Icons
Common category slugs get automatic icons:

| Slug | Icon |
|------|------|
| getting-started | Rocket |
| faq | Question |
| troubleshooting | Wrench |
| guides | BookOpen |
| tutorials | GraduationCap |
| api | Code |
| reference | FileText |
| announcements | Megaphone |
| updates | Bell |
| security | Shield |
| billing | CreditCard |
| account | User |
| integrations | Plug |

Other categories default to `Article` icon.

### Category Colors
Common categories have predefined colors. Unknown categories get colors from a consistent palette.

## Available Icons

Use any Phosphor icon name. Common ones:
- `Article`, `FileText`, `BookOpen`
- `Rocket`, `Wrench`, `Question`
- `Shield`, `Lock`, `Key`
- `Code`, `Terminal`, `Database`
- `Bell`, `Megaphone`, `Calendar`
- `CreditCard`, `User`, `Plug`

See [Phosphor Icons](https://phosphoricons.com/) for all options.

## Writing Articles in Google Docs

Supported formatting:
- **Headings**: Use Title, Subtitle, or Heading 1-6 styles
- **Bold/Italic**: Standard formatting
- **Lists**: Bullet and numbered lists
- **Links**: Hyperlinks
- **Images**: Inline images (auto-proxied and cached)
- **Tables**: Simple tables
- **Code**: Use monospace font (Courier) for inline code

## Troubleshooting

### Articles not appearing
1. Check the Sheet ID is correct
2. Verify documents are set to public
3. Check `published` column is `true` (or empty)
4. Verify API key has Docs and Sheets API access

### Images not loading
- Images are proxied through `/api/cms/image/`
- Ensure Vercel Blob storage is configured (for caching)
- Check the document is publicly accessible

### Categories not showing
- At least one article must exist with that category
- Category is derived from the `category` column in the sheet

## Testing Locally

1. Add environment variables to `.env.local`
2. Run `npm run dev`
3. Visit `/support` to see articles
4. Changes to the Sheet reflect within 1 minute (cached)
