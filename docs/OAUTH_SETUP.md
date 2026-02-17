# OAuth Provider Setup Guide

This guide covers setting up OAuth authentication for Discord, Google, and GitHub. Each provider is optional — only Discord is required. Google and GitHub are enabled automatically when their environment variables are set.

## Architecture Overview

The app uses a custom OAuth implementation (not Supabase/NextAuth) for these reasons:

- **Multi-tenant subdomain isolation**: OAuth callbacks go through the main domain (`AUTH_URL`), then redirect to the tenant's subdomain via encrypted handoff tokens. Supabase/NextAuth can't handle this cross-domain flow natively.
- **Discord bot integration**: The session system is tightly coupled with Discord bot DM notifications, ticket tracking, and guild membership. A third-party auth layer would add indirection without benefit.
- **Full session control**: JWT-based sessions with HMAC signing, encrypted cookies, and per-request CSRF tokens — all managed in `src/lib/security/session.ts`.

### OAuth Flow

```
User clicks "Login with Google"
  → GET /api/auth/google?callbackUrl=/support
  → Sets state/callback/origin cookies on AUTH_COOKIE_DOMAIN
  → Redirects to Google's authorize URL

Google redirects back:
  → GET /api/auth/callback/google?code=...&state=...
  → Validates state (CSRF), exchanges code for tokens
  → Fetches user info from Google API
  → Creates/updates User + OAuthIdentity in DB
  → Creates encrypted session token
  → Creates short-lived handoff token (5s TTL)
  → Redirects to tenant subdomain: /api/auth/set-session?token=...

Tenant subdomain:
  → GET /api/auth/set-session?token=...&callback=/support
  → Decrypts handoff token → extracts session token
  → Sets session cookie on subdomain
  → Redirects to callback URL
```

---

## Discord OAuth (Required)

Discord is the primary provider and is required for bot features (DMs, ticket channels, log channels).

### 1. Create Discord Application

1. Go to [Discord Developer Portal](https://discord.com/developers/applications)
2. Click **New Application** → name it (e.g., "HelpPortal")
3. Go to **OAuth2** → **General**

### 2. Configure Redirects

Add this redirect URI:

```
https://helpportal.app/api/auth/callback/discord
```

For local development, also add:

```
http://localhost:3000/api/auth/callback/discord
```

### 3. Copy Credentials

From the OAuth2 page:
- **Client ID** → `DISCORD_CLIENT_ID`
- **Client Secret** → `DISCORD_CLIENT_SECRET` (click "Reset Secret" if needed)

### 4. Required Scopes

The app requests these scopes automatically:
- `identify` — read user profile (username, avatar, ID)
- `guilds` — list servers the user is in (for server ID validation)

### 5. Environment Variables

```env
DISCORD_CLIENT_ID=123456789012345678
DISCORD_CLIENT_SECRET=abcdef...
```

---

## Google OAuth (Optional)

### 1. Create Google Cloud Project

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or ensure "People API" is enabled)

### 2. Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: "HelpPortal" (or whatever you prefer)

### 3. Configure Redirect URIs

**Authorized redirect URIs:**

```
https://helpportal.app/api/auth/callback/google
```

For local development:

```
http://localhost:3000/api/auth/callback/google
```

### 4. Configure Consent Screen

1. Go to **OAuth consent screen**
2. User Type: **External** (unless using Google Workspace)
3. Fill in:
   - App name: your app name
   - User support email: your email
   - Developer contact: your email
4. Scopes: add `openid`, `email`, `profile`
5. Test users: add your Google account while in "Testing" status

> **Note**: While in "Testing" status, only added test users can log in. Submit for verification when ready for production.

### 5. Copy Credentials

From the credentials page:
- **Client ID** → `GOOGLE_CLIENT_ID`
- **Client Secret** → `GOOGLE_CLIENT_SECRET`

### 6. Required Scopes

Requested automatically:
- `openid` — OpenID Connect
- `email` — user's email address
- `profile` — display name and profile picture

Additional authorize parameters sent automatically:
- `access_type=offline` — for refresh token (future use)
- `prompt=consent` — always show consent screen

### 7. Environment Variables

```env
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-...
```

---

## GitHub OAuth (Optional)

### 1. Create GitHub OAuth App

1. Go to [GitHub Developer Settings](https://github.com/settings/developers)
2. Click **OAuth Apps** → **New OAuth App**

### 2. Fill In Details

- **Application name**: "HelpPortal" (or your app name)
- **Homepage URL**: `https://helpportal.app`
- **Authorization callback URL**:

```
https://helpportal.app/api/auth/callback/github
```

> **Important**: GitHub only allows ONE callback URL per OAuth App. For local development, create a separate OAuth App with `http://localhost:3000/api/auth/callback/github`.

### 3. Copy Credentials

After creating:
- **Client ID** → `GITHUB_CLIENT_ID`
- Click **Generate a new client secret** → `GITHUB_CLIENT_SECRET`

### 4. Required Scopes

Requested automatically:
- `read:user` — read user profile (name, avatar, ID)
- `user:email` — read email addresses (needed since GitHub email can be private)

### 5. Environment Variables

```env
GITHUB_CLIENT_ID=Iv1.abcdef123456
GITHUB_CLIENT_SECRET=abcdef...
```

---

## Environment Variables Summary

Add these to your `.env.local` (development) or deployment environment:

```env
# Required
DISCORD_CLIENT_ID=
DISCORD_CLIENT_SECRET=

# Optional — enable Google login
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

# Optional — enable GitHub login
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Cross-subdomain OAuth cookie domain (production only)
AUTH_COOKIE_DOMAIN=.helpportal.app

# Main domain URL (must match OAuth redirect URIs)
AUTH_URL=https://helpportal.app
```

### Provider Auto-Detection

Providers are **automatically enabled** when their env vars are present. No code changes needed. The login UI dynamically shows available providers:

- 1 provider → direct login button (no dropdown)
- 2+ providers → "Sign In" button with provider picker dropdown

See `src/lib/oauth/providers.ts` → `getConfiguredProviders()`.

---

## Testing

### Local Development

1. Set up env vars in `.env.local`
2. Start the dev server: `npm run dev`
3. Navigate to `http://localhost:3000/support`
4. Click "Sign In" → select a provider
5. Complete the OAuth flow
6. Verify you're redirected back and authenticated

### Verify Each Provider

| Check | Expected |
|-------|----------|
| `GET /api/auth/login` | Returns `{ mode: "oauth", providers: ["discord", "google", "github"] }` |
| Click Discord login | Redirects to Discord authorize → callback → session set |
| Click Google login | Redirects to Google consent → callback → session set |
| Click GitHub login | Redirects to GitHub authorize → callback → session set |
| Session persists | Refresh page → still logged in |
| Logout | Clears session, revokes provider token |
| Subdomain login | OAuth flows through main domain, handoff token sets session on subdomain |

### Common Issues

| Issue | Solution |
|-------|----------|
| "ProviderNotConfigured" error | Check env vars are set and not empty |
| "InvalidState" error | State cookie expired or cookies blocked. Check `AUTH_COOKIE_DOMAIN` matches. |
| "TokenExchangeFailed" error | Client secret is wrong, or redirect URI doesn't match exactly |
| Google "access_denied" | App is in "Testing" mode and user isn't a test user |
| GitHub "redirect_uri_mismatch" | Callback URL must match exactly (including trailing slash) |
| Cookies not sharing across subdomains | Set `AUTH_COOKIE_DOMAIN=.yourdomain.com` (with leading dot) |

---

## File Reference

| File | Purpose |
|------|---------|
| `src/lib/oauth/providers.ts` | Provider config (URLs, scopes, user extraction) |
| `src/lib/oauth/revoke.ts` | Token revocation per provider |
| `src/app/api/auth/[provider]/route.ts` | OAuth initiation (redirect to provider) |
| `src/app/api/auth/callback/[provider]/route.ts` | OAuth callback (token exchange, user creation) |
| `src/app/api/auth/set-session/route.ts` | Cross-subdomain session handoff |
| `src/app/api/auth/login/route.ts` | Returns available providers |
| `src/app/api/auth/logout/route.ts` | Session destruction + token revocation |
| `src/lib/security/session.ts` | JWT session creation/verification |
| `src/components/auth/LoginButton.tsx` | Multi-provider login UI |
| `prisma/schema.prisma` | `OAuthIdentity` model (provider + user link) |
