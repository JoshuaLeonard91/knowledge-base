# Google Sheets CMS Setup Guide

This guide walks you through connecting your own Google Sheet as the content management system (CMS) for your knowledge base articles.

---

## Overview

Your support portal uses Google Sheets as a simple, secure CMS. You'll need:
1. A Google Cloud project with Sheets API enabled
2. A service account for API access
3. A Google Sheet with your articles
4. Environment variables configured in DigitalOcean

**Time required:** ~15-20 minutes

---

## Step 1: Create a Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Click **Select a project** → **New Project**
3. Enter a project name (e.g., "My Support Portal CMS")
4. Click **Create**
5. Wait for the project to be created, then select it

---

## Step 2: Enable Google Sheets API

1. In your Google Cloud project, go to **APIs & Services** → **Library**
2. Search for "Google Sheets API"
3. Click on **Google Sheets API**
4. Click **Enable**

---

## Step 3: Create a Service Account

1. Go to **APIs & Services** → **Credentials**
2. Click **+ Create Credentials** → **Service Account**
3. Enter a name (e.g., "sheets-reader")
4. Click **Create and Continue**
5. Skip the optional steps, click **Done**

### Generate the Key

1. Click on your newly created service account
2. Go to the **Keys** tab
3. Click **Add Key** → **Create new key**
4. Select **JSON** format
5. Click **Create**
6. A JSON file will download - **keep this safe!**

The JSON file contains your service account credentials. It looks like this:
```json
{
  "type": "service_account",
  "project_id": "your-project-id",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "sheets-reader@your-project.iam.gserviceaccount.com",
  "client_id": "...",
  ...
}
```

**Important:** Note the `client_email` - you'll need this in Step 5.

---

## Step 4: Create Your Google Sheet

1. Go to [Google Sheets](https://sheets.google.com/) and create a new spreadsheet
2. Name it something like "Knowledge Base Articles"
3. Copy the **Sheet ID** from the URL:
   ```
   https://docs.google.com/spreadsheets/d/[THIS-IS-YOUR-SHEET-ID]/edit
   ```

### Sheet Structure

Create two sheets (tabs) in your spreadsheet:

#### Sheet 1: "Articles"

**Row 1 (Headers):** slug | title | excerpt | category | content | keywords | icon | readTime

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | slug | URL-friendly identifier | `getting-started-with-discord-bot` |
| B | title | Article title | `Getting Started with Your Discord Bot` |
| C | excerpt | Short description | `Learn how to set up and configure...` |
| D | category | Category ID (matches Categories sheet) | `getting-started` |
| E | content | Full article content (Markdown) | `## Introduction\n\nWelcome to...` |
| F | keywords | Comma-separated keywords | `setup, installation, beginner` |
| G | icon | Icon name (optional) | `Rocket` |
| H | readTime | Reading time in minutes | `5` |

#### Sheet 2: "Categories"

**Row 1 (Headers):** id | name | description | icon | color

| Column | Header | Description | Example |
|--------|--------|-------------|---------|
| A | id | Category identifier (used in Articles) | `getting-started` |
| B | name | Display name | `Getting Started` |
| C | description | Category description | `Guides for new users` |
| D | icon | Icon name | `Rocket` |
| E | color | Color name (optional) | `green` |

**Note:** The Categories sheet is optional. If not provided, categories will be auto-generated from the unique category values in your Articles sheet.

### Available Icons

Use any of these icon names:
- `Rocket`, `Shield`, `Terminal`, `FileText`, `Key`, `Database`
- `Crown`, `Warning`, `Search`, `Settings`, `Calendar`, `Bell`
- `Lock`, `Layout`, `HelpCircle`, `Wrench`, `BookOpen`, `Code`
- `Megaphone`, `CreditCard`, `User`, `Plug`, `Article`, `GraduationCap`

### Available Category Colors

- `green`, `blue`, `purple`, `cyan`, `indigo`, `slate`
- `pink`, `sky`, `red`, `emerald`, `violet`, `teal`, `amber`, `rose`, `lime`

---

## Step 5: Share Sheet with Service Account

1. Open your Google Sheet
2. Click **Share** (top right)
3. Paste your service account email (from Step 3):
   ```
   sheets-reader@your-project.iam.gserviceaccount.com
   ```
4. Set permission to **Viewer** (read-only is sufficient)
5. Uncheck "Notify people"
6. Click **Share**

---

## Step 6: Configure DigitalOcean Environment Variables

1. Log in to [DigitalOcean App Platform](https://cloud.digitalocean.com/apps)
2. Select your app
3. Go to **Settings** → **App-Level Environment Variables**
4. Add the following variables:

### Required Variables

| Variable | Value | Encrypt? |
|----------|-------|----------|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Entire JSON content from Step 3 | **Yes** |
| `CMS_SPREADSHEET_ID` | Your Sheet ID from Step 4 | No |
| `CMS_SOURCE` | `google` | No |

### Adding the Service Account Key

1. Open the JSON file you downloaded in Step 3
2. Copy the **entire contents** (including the curly braces)
3. Paste it as the value for `GOOGLE_SERVICE_ACCOUNT_KEY`
4. **Important:** Check the "Encrypt" checkbox

### Example Configuration

```
CMS_SOURCE=google
CMS_SPREADSHEET_ID=1ABC123xyz789...
GOOGLE_SERVICE_ACCOUNT_KEY={"type":"service_account","project_id":"..."}
```

5. Click **Save**
6. Your app will automatically redeploy with the new settings

---

## Step 7: Verify Setup

After your app redeploys:

1. Visit your support portal's `/support` page
2. You should see your categories from the Google Sheet
3. Articles should appear when you click on categories
4. Search should find articles from your sheet

### Troubleshooting

**No articles showing:**
- Verify the Sheet ID is correct
- Check that the service account email has access to the sheet
- Ensure sheet names are exactly "Articles" and "Categories"

**API errors in logs:**
- Verify the JSON key was pasted completely
- Check that Google Sheets API is enabled in your project
- Ensure the service account key is marked as encrypted

**Articles not updating:**
- The app caches articles for performance
- Changes may take a few minutes to appear
- You can redeploy the app to force a cache refresh

---

## Content Formatting Guide

Your article content supports Markdown formatting:

### Headers
```markdown
# Main Header
## Section Header
### Subsection Header
```

### Text Formatting
```markdown
**bold text**
*italic text*
`inline code`
[link text](https://example.com)
```

### Lists
```markdown
- Item one
- Item two
- Item three
```

### Code Blocks
````markdown
```
code block here
```
````

### Tables
```markdown
| Header 1 | Header 2 |
|----------|----------|
| Cell 1   | Cell 2   |
```

---

## Security Notes

- Your Google Service Account key is stored encrypted in DigitalOcean
- The key is never exposed to the frontend or browser
- Only server-side code can access the API
- The service account only has read access to your sheet
- Each client deployment is completely isolated

---

## Need Help?

If you encounter issues during setup:
1. Check the troubleshooting section above
2. Visit our support portal at [your-support-url]
3. Submit a support ticket for personalized assistance
