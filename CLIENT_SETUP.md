# Client Setup Guide

This guide walks through setting up a new client deployment on Digital Ocean App Platform.

## Prerequisites

Before starting, collect the following from the client:

### 1. Domain Information
- [ ] Domain name (e.g., `support.clientcompany.com`)

### 2. Discord OAuth Credentials
Client creates a Discord application:
1. Go to https://discord.com/developers/applications
2. Create new application
3. Go to OAuth2 > General
4. Copy **Client ID** and **Client Secret**
5. Add redirect URL: `https://support.clientdomain.com/api/auth/callback/discord`

Collect from client:
- [ ] Discord Client ID
- [ ] Discord Client Secret

### 3. Jira Service Management
Client provides access to their Jira workspace:
1. Client creates API token at: Profile > Account Settings > Security > API Tokens

Collect from client:
- [ ] Atlassian Domain (e.g., `clientcompany.atlassian.net`)
- [ ] Atlassian Email (admin email)
- [ ] Atlassian API Token
- [ ] Jira Project Key (e.g., `SUPPORT`)
- [ ] Service Desk ID (from URL: `/servicedesk/project/[ID]`)
- [ ] Request Type ID (from Service Desk settings)

### 4. Google Docs CMS
Client sets up their documentation:
1. Create Google Cloud project
2. Enable Google Docs API and Google Sheets API
3. Create API key (restrict to Docs and Sheets APIs)
4. Create index spreadsheet (see GOOGLE_DOCS_SETUP.md)
5. Make all docs/sheets public ("Anyone with the link")

Collect from client:
- [ ] Google API Key
- [ ] Google Sheets Index ID

---

## Deployment Steps

### Step 1: Generate Security Keys

Generate unique keys for this client:

```bash
# SESSION_SECRET (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# ENCRYPTION_KEY (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# AUTH_SECRET (64 hex chars)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 2: Create App via Digital Ocean Dashboard

1. Log in to Digital Ocean: https://cloud.digitalocean.com/apps
2. Click **Create App**
3. Select **GitHub** as source
4. Choose repository: `YOUR_USERNAME/knowledge-base`
5. Branch: `main`
6. Auto-deploy: **Yes**
7. Click **Next**

### Step 3: Configure Resources

1. Select **Web Service**
2. Instance Size: **Basic ($5/mo)** - 512 MB RAM, 1 vCPU
3. Containers: **1**
4. Click **Next**

### Step 4: Set Environment Variables

Add these environment variables (use the **Encrypt** option for secrets):

| Variable | Type | Value |
|----------|------|-------|
| `NODE_ENV` | General | `production` |
| `SESSION_SECRET` | **Encrypted** | (generated in Step 1) |
| `ENCRYPTION_KEY` | **Encrypted** | (generated in Step 1) |
| `AUTH_SECRET` | **Encrypted** | (generated in Step 1) |
| `AUTH_URL` | General | `https://support.clientdomain.com` |
| `DISCORD_CLIENT_ID` | **Encrypted** | (from client) |
| `DISCORD_CLIENT_SECRET` | **Encrypted** | (from client) |
| `GOOGLE_API_KEY` | **Encrypted** | (from client) |
| `GOOGLE_DOCS_INDEX_SHEET_ID` | General | (from client) |
| `ATLASSIAN_DOMAIN` | General | (from client) |
| `ATLASSIAN_EMAIL` | General | (from client) |
| `ATLASSIAN_API_TOKEN` | **Encrypted** | (from client) |
| `JIRA_SERVICE_DESK_ID` | General | (from client) |
| `JIRA_REQUEST_TYPE_ID` | General | (from client) |
| `JIRA_PROJECT_KEY` | General | (from client) |

### Step 5: Configure Domain

1. After app is created, go to **Settings** > **Domains**
2. Click **Add Domain**
3. Enter client's domain: `support.clientdomain.com`
4. Copy the **CNAME target** shown (e.g., `xxx.ondigitalocean.app`)

### Step 6: Client DNS Setup

Send client these instructions:

```
Please add a CNAME record to your DNS:

Host/Name: support (or your subdomain)
Type: CNAME
Value: [CNAME target from Step 5]
TTL: 3600 (or default)

SSL certificate will be automatically provisioned once DNS propagates.
```

### Step 7: Verify Deployment

1. Wait for DNS propagation (5-30 minutes)
2. Visit `https://support.clientdomain.com/support`
3. Test Discord login
4. Test ticket submission
5. Verify articles load from Google Docs

---

## Ongoing Maintenance

### Code Updates
- Push to `main` branch on GitHub
- All client apps auto-deploy with new code
- Environment variables persist automatically

### Client Needs Changes
- Update env vars in DO Dashboard > App > Settings > App-Level Environment Variables
- Changes take effect on next deployment (or force redeploy)

### Monitoring
- View logs: DO Dashboard > App > Runtime Logs
- View metrics: DO Dashboard > App > Insights
- Alerts configured for deployment failures

---

## Troubleshooting

### App won't start
- Check Runtime Logs for errors
- Verify all required env vars are set
- Ensure `AUTH_URL` matches the actual domain

### Discord login fails
- Verify redirect URL in Discord Developer Portal matches domain
- Check `DISCORD_CLIENT_ID` and `DISCORD_CLIENT_SECRET`

### Articles not loading
- Verify Google Sheets is public ("Anyone with the link")
- Check `GOOGLE_API_KEY` has Docs and Sheets API enabled
- Verify Sheet ID is correct

### Tickets not creating
- Test Jira API token is valid
- Verify Service Desk ID and Request Type ID
- Check Atlassian email has permission to create tickets

---

## Client Checklist Template

```
Client: _______________
Domain: _______________
Setup Date: _______________
DO App ID: _______________

[ ] Domain configured
[ ] Discord OAuth working
[ ] Jira integration working
[ ] Google Docs loading
[ ] SSL certificate active
[ ] Client verified working
```
