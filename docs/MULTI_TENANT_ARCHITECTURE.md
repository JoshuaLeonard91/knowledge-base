# Multi-Tenant Architecture

This document outlines the architecture for deploying the support portal as a multi-tenant SaaS platform with self-service tenant onboarding.

---

## Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         Your Platform                                │
│                    (e.g., supportdesk.io)                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│   acme.supportdesk.io    │   client2.supportdesk.io    │   ...      │
│          ↓               │            ↓                 │            │
│   ┌─────────────┐        │   ┌─────────────┐           │            │
│   │  Middleware │        │   │  Middleware │           │            │
│   │  (extract   │        │   │  (extract   │           │            │
│   │  subdomain) │        │   │  subdomain) │           │            │
│   └──────┬──────┘        │   └──────┬──────┘           │            │
│          ↓               │          ↓                   │            │
│   ┌─────────────┐        │   ┌─────────────┐           │            │
│   │   Tenant    │        │   │   Tenant    │           │            │
│   │   Context   │        │   │   Context   │           │            │
│   └──────┬──────┘        │   └──────┬──────┘           │            │
│          ↓               │          ↓                   │            │
└──────────┼───────────────┴──────────┼───────────────────┴────────────┘
           │                          │
           ▼                          ▼
┌─────────────────────┐    ┌─────────────────────┐
│   Tenant Database   │    │     Hygraph CMS     │
│   (PostgreSQL)      │    │   (per-tenant)      │
│                     │    │                     │
│ - Credentials       │    │ - Articles          │
│ - Jira config       │    │ - Services          │
│ - Hygraph tokens    │    │ - Page content      │
│ - Feature flags     │    │ - Inquiry types     │
└─────────────────────┘    └─────────────────────┘
```

---

## Data Storage Strategy

### What Goes Where

| Data Type | Storage | Reason |
|-----------|---------|--------|
| **Credentials & Secrets** | PostgreSQL (encrypted) | Security - never expose in CMS |
| **Tenant Configuration** | PostgreSQL | Core tenant settings, feature flags |
| **Content** | Hygraph (per-tenant project) | Content editors manage via CMS UI |
| **User Sessions** | Redis/Cookies | Performance |
| **Analytics** | Separate analytics DB/service | Scale independently |

### PostgreSQL: Tenant Database

```sql
-- Core tenant table
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subdomain VARCHAR(63) UNIQUE NOT NULL,  -- e.g., "acme"
  display_name VARCHAR(255) NOT NULL,      -- e.g., "Acme Corp Support"
  status VARCHAR(20) DEFAULT 'active',     -- active, suspended, trial
  plan VARCHAR(50) DEFAULT 'free',         -- free, pro, enterprise
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Hygraph configuration (per tenant)
CREATE TABLE tenant_hygraph_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  endpoint VARCHAR(500) NOT NULL,          -- Hygraph API endpoint
  token_encrypted TEXT NOT NULL,           -- Encrypted Hygraph token
  created_at TIMESTAMP DEFAULT NOW()
);

-- Jira configuration (per tenant)
CREATE TABLE tenant_jira_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  atlassian_domain VARCHAR(255),           -- e.g., "acme.atlassian.net"
  atlassian_email VARCHAR(255),            -- Service account email
  api_token_encrypted TEXT,                -- Encrypted API token
  project_key VARCHAR(20),                 -- e.g., "SUPPORT"
  issue_type VARCHAR(50) DEFAULT 'Task',   -- Default issue type
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tenant branding/theming (optional - can also be in Hygraph)
CREATE TABLE tenant_branding (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  logo_url VARCHAR(500),
  favicon_url VARCHAR(500),
  custom_domain VARCHAR(255),              -- e.g., "support.acmecorp.com"
  created_at TIMESTAMP DEFAULT NOW()
);

-- Tenant feature flags
CREATE TABLE tenant_features (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  services_enabled BOOLEAN DEFAULT true,
  tickets_enabled BOOLEAN DEFAULT true,
  discord_login_enabled BOOLEAN DEFAULT false,
  tips_enabled BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_tenants_subdomain ON tenants(subdomain);
CREATE INDEX idx_tenants_status ON tenants(status);
```

### Hygraph CMS: Content Models (Per Tenant)

Each tenant gets their own Hygraph project with these models:

| Model | Purpose |
|-------|---------|
| Article | Knowledge base articles |
| Category | Article categories |
| Service | Service offerings |
| Service Tier | Pricing tiers |
| SLA Highlight | Trust badges/metrics |
| Helpful Resource | Resource links |
| Services Page Content | Section titles/copy |
| Contact Settings | Form configuration |
| Inquiry Type | Contact form options |
| Site Theme | Brand colors |

---

## Subdomain Routing

### Next.js Middleware

```typescript
// middleware.ts
import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const hostname = request.headers.get('host') || '';
  const subdomain = extractSubdomain(hostname);

  // Skip for main domain, API routes, static files
  if (!subdomain || subdomain === 'www' || subdomain === 'app') {
    return NextResponse.next();
  }

  // Add tenant context to headers
  const response = NextResponse.next();
  response.headers.set('x-tenant-subdomain', subdomain);

  return response;
}

function extractSubdomain(hostname: string): string | null {
  // Handle localhost:3000 in development
  if (hostname.includes('localhost')) {
    // Use query param or cookie for local dev
    return null;
  }

  // Extract subdomain from hostname
  // e.g., "acme.supportdesk.io" → "acme"
  const parts = hostname.split('.');
  if (parts.length >= 3) {
    return parts[0];
  }

  return null;
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
```

### Tenant Context Provider

```typescript
// lib/tenant/context.tsx
import { createContext, useContext } from 'react';

interface TenantConfig {
  id: string;
  subdomain: string;
  displayName: string;
  features: {
    servicesEnabled: boolean;
    ticketsEnabled: boolean;
    discordLoginEnabled: boolean;
  };
}

const TenantContext = createContext<TenantConfig | null>(null);

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error('useTenant must be used within TenantProvider');
  }
  return context;
}
```

### Server-Side Tenant Resolution

```typescript
// lib/tenant/resolver.ts
import { headers } from 'next/headers';
import { db } from '@/lib/db';

export async function getTenantFromRequest() {
  const headersList = headers();
  const subdomain = headersList.get('x-tenant-subdomain');

  if (!subdomain) {
    return null;
  }

  // Cache this query
  const tenant = await db.query(`
    SELECT
      t.*,
      h.endpoint as hygraph_endpoint,
      j.project_key as jira_project_key,
      f.*
    FROM tenants t
    LEFT JOIN tenant_hygraph_config h ON t.id = h.tenant_id
    LEFT JOIN tenant_jira_config j ON t.id = j.tenant_id
    LEFT JOIN tenant_features f ON t.id = f.tenant_id
    WHERE t.subdomain = $1 AND t.status = 'active'
  `, [subdomain]);

  return tenant;
}
```

---

## Self-Service Onboarding Flow

### Step 1: Signup Page

```
┌─────────────────────────────────────────┐
│         Create Your Support Portal       │
├─────────────────────────────────────────┤
│                                          │
│  Organization Name: [_______________]    │
│                                          │
│  Subdomain: [________].supportdesk.io    │
│             ✓ Available                  │
│                                          │
│  Admin Email: [___________________]      │
│                                          │
│  [Create Portal]                         │
│                                          │
└─────────────────────────────────────────┘
```

### Step 2: Hygraph Setup

After signup, guide tenant to:
1. Create Hygraph account (or connect existing)
2. Create new project from template
3. Copy API endpoint and token
4. Paste into portal settings

```
┌─────────────────────────────────────────┐
│         Connect Your CMS                 │
├─────────────────────────────────────────┤
│                                          │
│  1. Create a Hygraph project             │
│     [Open Hygraph] ↗                     │
│                                          │
│  2. Copy your credentials                │
│                                          │
│  API Endpoint: [____________________]    │
│                                          │
│  API Token: [_______________________]    │
│                                          │
│  [Test Connection]  [Save & Continue]    │
│                                          │
└─────────────────────────────────────────┘
```

### Step 3: Jira Integration (Optional)

```
┌─────────────────────────────────────────┐
│         Connect Jira (Optional)          │
├─────────────────────────────────────────┤
│                                          │
│  Atlassian Domain: [______].atlassian.net│
│                                          │
│  Service Email: [___________________]    │
│                                          │
│  API Token: [_______________________]    │
│             [How to create token] ↗      │
│                                          │
│  Project Key: [_______]                  │
│                                          │
│  [Test Connection]  [Skip for Now]       │
│                                          │
└─────────────────────────────────────────┘
```

### Step 4: Initial Content

Provide:
- Starter article templates
- Sample services configuration
- Default inquiry types

### Onboarding API Routes

```
POST /api/onboarding/signup
  → Create tenant record
  → Generate subdomain
  → Send verification email

POST /api/onboarding/verify
  → Verify email
  → Activate tenant

POST /api/onboarding/hygraph
  → Validate Hygraph credentials
  → Store encrypted token
  → Test API connection

POST /api/onboarding/jira
  → Validate Jira credentials
  → Store encrypted tokens
  → Test API connection

GET /api/onboarding/status
  → Return setup progress
  → List incomplete steps
```

---

## Security Considerations

### Credential Encryption

```typescript
// lib/encryption.ts
import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const KEY = process.env.ENCRYPTION_KEY!; // 32 bytes

export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

export function decrypt(encrypted: string): string {
  const [ivHex, authTagHex, encryptedText] = encrypted.split(':');

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(KEY, 'hex'), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedText, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}
```

### Tenant Isolation

1. **Database queries** - Always include tenant_id in WHERE clauses
2. **API routes** - Validate tenant from subdomain before processing
3. **CMS access** - Each tenant has separate Hygraph project
4. **File uploads** - Namespace by tenant_id
5. **Caching** - Include tenant_id in cache keys

### Rate Limiting

```typescript
// Per-tenant rate limits
const RATE_LIMITS = {
  free: { requests: 100, window: '1m' },
  pro: { requests: 1000, window: '1m' },
  enterprise: { requests: 10000, window: '1m' },
};
```

---

## Environment Variables

### Platform-Level (in .env)

```bash
# Database
DATABASE_URL=postgres://user:pass@host:5432/supportportal

# Encryption
ENCRYPTION_KEY=your-32-byte-hex-key

# Platform settings
PLATFORM_DOMAIN=supportdesk.io
PLATFORM_NAME=SupportDesk

# Optional: Default Hygraph for platform landing page
PLATFORM_HYGRAPH_ENDPOINT=https://...
PLATFORM_HYGRAPH_TOKEN=...
```

### Tenant-Level (in Database)

- Hygraph endpoint & token (encrypted)
- Jira credentials (encrypted)
- Feature flags
- Custom domain settings

---

## Implementation Phases

### Phase 1: Foundation (Current)
- [x] CMS-driven content (Hygraph)
- [x] Services page with CMS configuration
- [ ] Contact form with CMS-configurable fields
- [ ] All page copy CMS-driven

### Phase 2: Tenant Database
- [ ] PostgreSQL schema setup
- [ ] Tenant CRUD API routes
- [ ] Credential encryption utilities
- [ ] Subdomain middleware

### Phase 3: Tenant Resolution
- [ ] Middleware for subdomain extraction
- [ ] Tenant context provider
- [ ] Dynamic Hygraph client per tenant
- [ ] Dynamic Jira client per tenant

### Phase 4: Self-Service Onboarding
- [ ] Signup flow UI
- [ ] Email verification
- [ ] Hygraph connection wizard
- [ ] Jira connection wizard
- [ ] Onboarding progress tracking

### Phase 5: Admin Dashboard
- [ ] Tenant management UI
- [ ] Usage analytics per tenant
- [ ] Billing integration (Stripe)
- [ ] Plan management

---

## Local Development

For local development without subdomains:

```typescript
// Use query parameter or cookie
// http://localhost:3000?tenant=acme

export function getDevTenant(request: NextRequest): string | null {
  if (process.env.NODE_ENV !== 'development') return null;

  // Check query param first
  const url = new URL(request.url);
  const tenantParam = url.searchParams.get('tenant');
  if (tenantParam) return tenantParam;

  // Fall back to cookie
  return request.cookies.get('dev-tenant')?.value || null;
}
```

---

## Caching Strategy (Valkey + Webhooks)

### Overview

Each tenant's Hygraph content is cached in a shared Valkey (Redis-compatible) instance. Webhooks from each tenant's Hygraph project trigger cache invalidation for real-time updates.

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           Tenant Request Flow                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Request arrives at acme.supportdesk.io/support                     │
│                          ↓                                               │
│   2. Middleware extracts tenant: "acme"                                 │
│                          ↓                                               │
│   3. Check Valkey for: tenant:acme:header, tenant:acme:footer, etc.     │
│                          ↓                                               │
│         ┌────────────────┴────────────────┐                             │
│         ↓                                  ↓                             │
│   [Cache HIT]                        [Cache MISS]                        │
│   Return cached data                 Fetch from Hygraph API              │
│                                      Store in Valkey (TTL: 24h)          │
│                                      Return data                         │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│                        Webhook Invalidation Flow                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│   1. Content editor publishes Article in Hygraph (acme's project)       │
│                          ↓                                               │
│   2. Hygraph fires webhook to:                                          │
│      POST /api/webhooks/hygraph?tenant=acme                             │
│                          ↓                                               │
│   3. Webhook handler validates secret, identifies affected cache keys   │
│                          ↓                                               │
│   4. Delete from Valkey: tenant:acme:articles, tenant:acme:article:*    │
│                          ↓                                               │
│   5. Next request triggers cache rebuild from fresh API data            │
│                                                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

### Cache Key Namespacing

All cache keys are namespaced by tenant to ensure isolation:

```
Pattern: tenant:{subdomain}:{resource}:{optional-id}

Examples:
  tenant:acme:header           → Header settings + nav links
  tenant:acme:footer           → Footer settings + footer links
  tenant:acme:theme            → Site theme/colors
  tenant:acme:articles         → Article list
  tenant:acme:article:welcome  → Single article by slug
  tenant:acme:categories       → Category list
  tenant:acme:services         → Services page data
  tenant:acme:contact          → Contact settings + inquiry types
```

### Valkey Configuration

```typescript
// lib/cache/valkey.ts
import { createClient } from 'redis';

const valkey = createClient({
  url: process.env.VALKEY_URL, // e.g., redis://user:pass@host:6379
});

// Default TTL: 24 hours (content rarely changes more than daily)
const DEFAULT_TTL = 60 * 60 * 24;

export async function getCached<T>(key: string): Promise<T | null> {
  const data = await valkey.get(key);
  return data ? JSON.parse(data) : null;
}

export async function setCache(key: string, data: unknown, ttl = DEFAULT_TTL): Promise<void> {
  await valkey.setEx(key, ttl, JSON.stringify(data));
}

export async function invalidateCache(pattern: string): Promise<void> {
  // Use SCAN for pattern matching (e.g., tenant:acme:article:*)
  const keys = await valkey.keys(pattern);
  if (keys.length > 0) {
    await valkey.del(keys);
  }
}

export async function invalidateTenantCache(subdomain: string): Promise<void> {
  await invalidateCache(`tenant:${subdomain}:*`);
}
```

### Webhook Database Schema

```sql
-- Webhook configuration per tenant
CREATE TABLE tenant_webhook_config (
  tenant_id UUID PRIMARY KEY REFERENCES tenants(id),
  hygraph_webhook_secret VARCHAR(255) NOT NULL,  -- Secret for validating incoming webhooks
  webhook_enabled BOOLEAN DEFAULT true,
  last_webhook_at TIMESTAMP,                      -- For monitoring
  webhook_failure_count INTEGER DEFAULT 0,        -- Track failures
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Webhook event log (optional, for debugging)
CREATE TABLE webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID REFERENCES tenants(id),
  event_type VARCHAR(50),                         -- publish, unpublish, delete
  model_name VARCHAR(100),                        -- Article, Service, etc.
  model_id VARCHAR(100),
  processed_at TIMESTAMP DEFAULT NOW(),
  success BOOLEAN DEFAULT true,
  error_message TEXT
);

-- Index for recent events lookup
CREATE INDEX idx_webhook_events_tenant ON webhook_events(tenant_id, processed_at DESC);
```

### Webhook Endpoint

```typescript
// app/api/webhooks/hygraph/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { invalidateCache } from '@/lib/cache/valkey';

// Model to cache key mapping
const MODEL_CACHE_KEYS: Record<string, (subdomain: string, data?: any) => string[]> = {
  HeaderSettings: (s) => [`tenant:${s}:header`],
  NavLink: (s) => [`tenant:${s}:header`],
  FooterSettings: (s) => [`tenant:${s}:footer`],
  FooterLink: (s) => [`tenant:${s}:footer`],
  Article: (s, d) => [`tenant:${s}:articles`, `tenant:${s}:article:${d?.slug || '*'}`],
  Category: (s) => [`tenant:${s}:articles`, `tenant:${s}:categories`],
  Service: (s) => [`tenant:${s}:services`],
  ServiceTier: (s) => [`tenant:${s}:services`],
  SlaHighlight: (s) => [`tenant:${s}:services`],
  HelpfulResource: (s) => [`tenant:${s}:services`],
  ServicesPageContent: (s) => [`tenant:${s}:services`],
  SiteTheme: (s) => [`tenant:${s}:theme`],
  ContactSettings: (s) => [`tenant:${s}:contact`],
  InquiryType: (s) => [`tenant:${s}:contact`],
};

export async function POST(request: NextRequest) {
  try {
    // 1. Extract tenant from query param
    const { searchParams } = new URL(request.url);
    const subdomain = searchParams.get('tenant');

    if (!subdomain) {
      return NextResponse.json({ error: 'Missing tenant' }, { status: 400 });
    }

    // 2. Get tenant's webhook secret from database
    const tenant = await db.query(`
      SELECT t.id, w.hygraph_webhook_secret, w.webhook_enabled
      FROM tenants t
      JOIN tenant_webhook_config w ON t.id = w.tenant_id
      WHERE t.subdomain = $1 AND t.status = 'active'
    `, [subdomain]);

    if (!tenant || !tenant.webhook_enabled) {
      return NextResponse.json({ error: 'Invalid tenant' }, { status: 404 });
    }

    // 3. Validate webhook secret
    const providedSecret = request.headers.get('x-webhook-secret');
    if (providedSecret !== tenant.hygraph_webhook_secret) {
      return NextResponse.json({ error: 'Invalid secret' }, { status: 401 });
    }

    // 4. Parse webhook payload
    const payload = await request.json();
    const { operation, data } = payload;
    const modelName = data?.__typename;

    // 5. Get cache keys to invalidate
    const getCacheKeys = MODEL_CACHE_KEYS[modelName];
    if (getCacheKeys) {
      const keysToInvalidate = getCacheKeys(subdomain, data);

      // 6. Invalidate cache (must complete within 3s)
      await Promise.all(keysToInvalidate.map(key => invalidateCache(key)));
    }

    // 7. Update last webhook timestamp
    await db.query(`
      UPDATE tenant_webhook_config
      SET last_webhook_at = NOW(), webhook_failure_count = 0
      WHERE tenant_id = $1
    `, [tenant.id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
```

### Tenant Hygraph Setup with Webhooks

Update the onboarding flow to include webhook configuration:

```
┌─────────────────────────────────────────┐
│         Connect Your CMS                 │
├─────────────────────────────────────────┤
│                                          │
│  Step 1: Create a Hygraph project        │
│          [Open Hygraph] ↗                │
│                                          │
│  Step 2: Copy your credentials           │
│                                          │
│  API Endpoint: [____________________]    │
│  API Token: [_______________________]    │
│                                          │
│  Step 3: Configure Webhook (for          │
│          real-time updates)              │
│                                          │
│  ┌────────────────────────────────────┐  │
│  │ Webhook URL (copy this):           │  │
│  │ https://api.supportdesk.io/        │  │
│  │   webhooks/hygraph?tenant=acme     │  │
│  │                          [Copy]    │  │
│  ├────────────────────────────────────┤  │
│  │ Webhook Secret (copy this):        │  │
│  │ whsec_a1b2c3d4e5f6...              │  │
│  │                          [Copy]    │  │
│  ├────────────────────────────────────┤  │
│  │ In Hygraph → Settings → Webhooks:  │  │
│  │ • URL: paste webhook URL           │  │
│  │ • Header: x-webhook-secret         │  │
│  │ • Header Value: paste secret       │  │
│  │ • Triggers: All models, Publish/   │  │
│  │   Unpublish/Delete                 │  │
│  └────────────────────────────────────┘  │
│                                          │
│  [Test Connection]  [Save & Continue]    │
│                                          │
└─────────────────────────────────────────┘
```

### Cache-Aware Data Fetching

```typescript
// lib/cms/cached.ts
import { getCached, setCache } from '@/lib/cache/valkey';
import { HygraphClient } from '@/lib/hygraph/client';

export async function getCachedHeaderData(subdomain: string, hygraphClient: HygraphClient) {
  const cacheKey = `tenant:${subdomain}:header`;

  // Try cache first
  const cached = await getCached(cacheKey);
  if (cached) {
    return cached;
  }

  // Fetch from Hygraph
  const data = await hygraphClient.getHeaderData();

  // Store in cache
  await setCache(cacheKey, data);

  return data;
}

// Similar functions for footer, articles, services, etc.
```

### Manual Cache Invalidation

Provide tenants a way to manually clear their cache:

```typescript
// app/api/admin/cache/clear/route.ts
import { invalidateTenantCache } from '@/lib/cache/valkey';
import { getTenantFromRequest } from '@/lib/tenant/resolver';

export async function POST() {
  const tenant = await getTenantFromRequest();

  if (!tenant) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  await invalidateTenantCache(tenant.subdomain);

  return NextResponse.json({ success: true, message: 'Cache cleared' });
}
```

### Environment Variables

Add to platform environment:

```bash
# Valkey/Redis Cache
VALKEY_URL=redis://user:pass@your-valkey-host:6379

# Cache settings
CACHE_TTL_SECONDS=86400  # 24 hours default
```

### Implementation Phases (Updated)

Add caching to the existing phases:

#### Phase 2: Tenant Database (Updated)
- [ ] PostgreSQL schema setup
- [ ] **Add tenant_webhook_config table**
- [ ] **Add webhook_events table (optional)**
- [ ] Tenant CRUD API routes
- [ ] Credential encryption utilities
- [ ] **Webhook secret generation utility**
- [ ] Subdomain middleware

#### Phase 3: Tenant Resolution (Updated)
- [ ] Middleware for subdomain extraction
- [ ] Tenant context provider
- [ ] Dynamic Hygraph client per tenant
- [ ] **Valkey client setup**
- [ ] **Cache-aware data fetching functions**
- [ ] Dynamic Jira client per tenant

#### Phase 4: Self-Service Onboarding (Updated)
- [ ] Signup flow UI
- [ ] Email verification
- [ ] Hygraph connection wizard
- [ ] **Webhook configuration UI + instructions**
- [ ] **Webhook secret generation on signup**
- [ ] Jira connection wizard
- [ ] Onboarding progress tracking

#### New Phase: Cache Infrastructure
- [ ] Valkey client library
- [ ] Cache key utilities
- [ ] Webhook endpoint handler
- [ ] Model-to-cache-key mapping
- [ ] Manual cache clear endpoint
- [ ] Cache hit/miss monitoring

---

## Related Documentation

- [Hygraph Setup Guide](./CLIENT_HYGRAPH_SETUP.md)
- [Services Page Setup](./CLIENT_HYGRAPH_SERVICES.md)
- [User Stories Status](./USER_STORIES_IMPLEMENTATION_STATUS.md)
