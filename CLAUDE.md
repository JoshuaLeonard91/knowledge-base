# CLAUDE.md — Project Instructions

## Project Overview

Multi-tenant SaaS support portal (Next.js 16 + React 19 + TypeScript + Tailwind CSS 4). Discord OAuth, Prisma/PostgreSQL, Hygraph CMS, Stripe payments, Discord.js bot, Jira Service Desk integration. Subdomains via middleware for tenant isolation.

---

## Security Checklist

Every code change **must** be verified against this checklist. Items marked `[x]` are implemented; `[ ]` are not yet implemented or need attention. Update status as fixes land.

### 1. Authentication & Session Management

- [x] Session tokens encrypted with AES-256-GCM + signed with HMAC-SHA256
- [x] HMAC verified before decryption (Encrypt-then-MAC)
- [x] HMAC uses `crypto.timingSafeEqual` for constant-time comparison (`src/lib/security/crypto.ts`)
- [x] Session IDs have 128+ bits of entropy (`generateSecureToken(16)`)
- [x] Session cookies: `HttpOnly`, `Secure` (production), `SameSite=Lax`, `Path=/`
- [x] No `domain` attribute on cookies — subdomain-isolated sessions per tenant
- [x] Absolute session timeout: 24 hours (`SESSION_DURATION_MS`)
- [x] Session rotation when < 6 hours remain (`needsRotation` in `src/lib/security/session.ts`)
- [x] Server-side session revocation via in-memory deny-list on logout (`revokeSession`)
- [x] Discord OAuth `state` parameter: 32 bytes random + 5-minute expiry timestamp
- [x] OAuth tokens exchanged server-side only, never exposed to client
- [x] Open redirect prevention on OAuth callbacks (`src/app/api/auth/set-session/route.ts`)
- [x] Handoff tokens for cross-subdomain redirect: 5-second expiry, encrypted, signed
- [x] Mock auth mode denied in production when Discord credentials present
- [x] Discord access token revoked on logout
- [x] `__Host-` cookie prefix in production for cookie integrity (`src/lib/security/session.ts`)
- [x] Idle session timeout: 30 minutes of inactivity (`src/lib/security/session.ts`)
- [x] Auth routes (`/api/auth/*`) rate-limited before early return in middleware

### 2. CSRF Protection

- [x] Signed Double-Submit Cookie pattern with HMAC-SHA256
- [x] CSRF tokens bound to session ID
- [x] 24-hour token expiration with timestamp validation
- [x] CSRF cookie: `HttpOnly`, `Secure` (production), `SameSite=Strict`
- [x] All state-changing API routes validated (POST/PUT/DELETE/PATCH)
- [x] Dashboard mutations auto-validated via `requireAuth(request)` / `requireTenantOwner(request)`
- [x] Webhooks (Stripe, Jira, Hygraph) exempt from CSRF but use signature verification
- [x] CSRF tokens regenerated on session rotation

### 3. Injection Prevention

- [x] All database queries use Prisma ORM methods — no `$queryRawUnsafe` / `$executeRawUnsafe`
- [x] GraphQL queries to Hygraph use parameterized variables, not string interpolation
- [x] HTML sanitized with DOMPurify before `dangerouslySetInnerHTML` (`src/lib/sanitize.ts`)
- [x] CSS property allowlist with dangerous pattern blocking (javascript:, expression(), url(), @import)
- [x] Discord bot command inputs sanitized via `sanitizeString` before use
- [x] No `eval()`, `Function()`, or `child_process.exec()` with user input anywhere in codebase
- [x] All Prisma `where` clause inputs validated with regex/allowlist/type checks before reaching ORM (audited — no unsafe patterns found)

### 4. XSS Prevention

- [x] React's default JSX escaping for all dynamic content
- [x] DOMPurify with strict tag/attribute allowlist for CMS HTML content
- [x] `sanitizeString` strips HTML tags from user text inputs (`src/lib/validation.ts`)
- [x] Response `sanitizeString` entity-encodes special characters (`src/lib/security/sanitize.ts`)
- [x] CSP `frame-src: 'none'`, `frame-ancestors: 'none'`, `object-src: 'none'`, `base-uri: 'self'`
- [x] CSP `script-src` uses nonce-based policy with `'strict-dynamic'` (middleware generates per-request nonce)
- [x] CSP violation reporting via `report-uri /api/csp-report` endpoint

### 5. HTTP Security Headers

- [x] `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` (production)
- [x] `X-Content-Type-Options: nosniff` (triple-layered: next.config, middleware, response helpers)
- [x] `X-Frame-Options: DENY`
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=(), interest-cohort=()`
- [x] `X-Permitted-Cross-Domain-Policies: none`
- [x] `X-Download-Options: noopen`
- [x] `poweredByHeader: false` in next.config
- [x] `upgrade-insecure-requests` in CSP
- [x] `Cache-Control: no-store` on all API JSON responses
- [x] `form-action 'self' https://discord.com` restricts form submissions
- [x] `Cross-Origin-Opener-Policy: same-origin` (next.config + middleware)
- [x] `Cross-Origin-Resource-Policy: same-origin` (next.config + middleware)
- [x] `X-XSS-Protection: 0` — legacy filter disabled, CSP is the replacement

### 6. File Upload Security

- [x] Magic byte verification against declared MIME type (`verifyFileSignature` in `src/lib/security/uploads.ts`)
- [x] Filenames replaced with UUID-based server-generated names (`sanitizeFilename`)
- [x] Null byte removal, path traversal prevention (`../`, `/`, `\`)
- [x] MIME type allowlist (images, PDF, text, documents, zip, video)
- [x] File size limit: 10MB per file (server-side enforcement)
- [x] File count limit: max 5 per upload
- [x] Applied consistently: API route, Discord bot ticket/panel/reply commands
- [x] Double extension and special character handling in filename sanitization
- [x] SSRF protection: attachment URLs validated via `safeFetch` before server-side download
- [ ] Image re-processing (e.g., Sharp) to strip EXIF data and embedded payloads — *low priority, files go to Jira not served directly*

### 7. Rate Limiting

- [x] Per-endpoint tiered rate limits (general: 100/min, auth: 10/15min, ticket: 5/hr, comment: 15/hr)
- [x] IP-based keying using rightmost `X-Forwarded-For` (trusted proxy, prevents spoofing)
- [x] Periodic cleanup of expired entries (60s interval)
- [x] Hard cap: 10,000 entries to prevent memory exhaustion
- [x] Standard rate limit headers: `X-RateLimit-Limit`, `X-RateLimit-Remaining`, `X-RateLimit-Reset`, `Retry-After`
- [x] Rate limiting applied before expensive operations (checked in middleware before route handlers)
- [x] Auth routes rate-limited before early return in middleware
- [x] Per-tenant rate limiting alongside per-IP to prevent one tenant exhausting shared resources
- [ ] Persistent rate limit store (Redis) for multi-instance deployments — *infrastructure, not needed for single-instance*

### 8. Multi-Tenant Isolation

- [x] Tenant resolved from subdomain in middleware, set via `x-tenant-slug` header
- [x] Reserved subdomain blocklist (www, app, api, admin, etc.)
- [x] Session cookies subdomain-isolated (no `domain` attribute + `__Host-` prefix)
- [x] Dashboard routes verify tenant ownership via `requireTenantOwner` (DB lookup)
- [x] Tenant secrets (Jira, Hygraph, Discord tokens) encrypted per-tenant in DB
- [x] Subscription status verified per-tenant
- [x] Dev-tenant override only available in non-production
- [x] `x-middleware-subrequest` header stripped (CVE-2025-29927 mitigation)
- [x] Bot operations carry explicit tenant context (`tenantId` / `botId` parameters)
- [x] Cache keys include tenant context (TTL-based eviction on bot Maps)
- [ ] Database-level Row-Level Security (RLS) as defense-in-depth — *infrastructure, requires PostgreSQL policy changes*

### 9. Discord Bot Security

- [x] Bot tokens stored encrypted in DB, decrypted only when connecting
- [x] `/setup` and `/panel` commands: guild owner-only permission check
- [x] Staff commands: `StaffMapping` DB lookup required before execution
- [x] Modal text inputs sanitized via `sanitizeString`
- [x] File uploads validated with magic bytes + UUID filename sanitization + SSRF-safe fetch
- [x] TTL-based eviction on all in-memory caches (categoryNameCache, assignmentMap)
- [x] Size caps on Maps (evict expired entries when > 500/10,000)
- [x] Wizard state auto-cleanup after 10 minutes
- [x] Error responses do not expose internal details

### 10. Stripe / Payment Security

- [x] Webhook signatures verified via `stripe.webhooks.constructEvent()`
- [x] Raw body preserved for signature verification (`request.text()`)
- [x] Webhook routes skip middleware to preserve raw body
- [x] Stripe secret key in environment variable, never in client code
- [x] Only publishable key has `NEXT_PUBLIC_` prefix
- [x] Checkout sessions created server-side with server-defined `line_items`
- [x] Generic error messages — webhook secrets never exposed in responses
- [x] Webhook event ID deduplication via in-memory store (`src/lib/security/webhooks.ts`)
- [x] Webhook timestamp validation: reject events older than 5 minutes

### 11. Database Security (Prisma / PostgreSQL)

- [x] No `$queryRawUnsafe` or `$executeRawUnsafe` in application code
- [x] `DATABASE_URL` requires `sslmode=require` for encrypted connections
- [x] `@@unique` compound indexes for multi-tenant uniqueness constraints
- [x] Prisma query builder handles all parameterization
- [x] All user inputs validated (regex, allowlist, type checks) before Prisma where clauses
- [ ] Database user uses minimum-privilege role (not superuser) — *infrastructure*
- [ ] Database credential rotation process — *infrastructure/ops*

### 12. Error Handling & Information Disclosure

- [x] Generic error messages via `createErrorResponse` — no internal details exposed
- [x] `sanitizeErrorResponse` maps error types to generic messages
- [x] `stripSensitiveFields` recursively removes sensitive keys from response objects
- [x] All API route catch blocks return generic "An error occurred" messages
- [x] Stripe webhook errors only log `err.message`, not signatures or secrets
- [x] No stack traces in any API response

### 13. Secrets Management

- [x] `SESSION_SECRET` enforced in production (`crypto.ts`)
- [x] `ENCRYPTION_KEY` enforced in production — requires 64-char hex string
- [x] Dev fallback keys only used in non-production
- [x] `.env`, `*.key`, `*.pem`, `*.cert`, `secrets.json` in `.gitignore`
- [x] No hardcoded credentials in application code
- [x] Per-tenant secrets encrypted via `encryptToString` in database

### 14. Security Logging

- [x] Structured JSON logging to separate files (security.log, access.log, error.log)
- [x] User IDs hashed before logging (`hashForLog`)
- [x] Sensitive field redaction (password, token, secret, apiKey, authorization, cookie, session)
- [x] Log rotation (10MB max, 5 rotated files)
- [x] Dedicated log functions: `logAuthAttempt`, `logLogout`, `logAccessDenied`, `logRateLimit`, etc.
- [x] String truncation for long values (>200 chars)
- [ ] Dashboard routes use structured security logger instead of `console.error` — *low priority, server-side only*

### 15. Dependency & Supply Chain Security

- [ ] `npm audit` runs in CI/CD with `--audit-level=high` — *add to CI pipeline when created*
- [x] Dependabot configured for automated weekly dependency updates (`.github/dependabot.yml`)
- [ ] `npm ci` (not `npm install`) used in CI for reproducible builds — *add to CI pipeline*
- [x] `.npmrc` configured with `ignore-scripts=true`
- [x] Minimal dependency count (15 production dependencies)
- [x] `isomorphic-dompurify` pinned to compatible version (2.24.0)

### 16. SSRF Prevention

- [x] `safeFetch()` utility validates URLs before server-side requests (`src/lib/security/ssrf.ts`)
- [x] Private IP range blocking (127.x, 10.x, 172.16-31.x, 192.168.x, 169.254.x, fc/fd IPv6)
- [x] DNS resolution check prevents DNS rebinding attacks
- [x] Redirect following disabled (`redirect: 'manual'`) to prevent redirect-to-internal-IP attacks
- [x] Applied to all Discord bot attachment downloads (ticket, panel, reply commands)

### 17. Next.js Specific

- [x] Security-critical auth checks in Server Components and API routes, not just middleware (defense in depth)
- [x] `x-middleware-subrequest` header stripped in middleware (CVE-2025-29927)
- [x] No `NEXT_PUBLIC_` prefix on sensitive environment variables
- [x] `next/image` remote patterns restricted to known sources
- [x] `poweredByHeader: false`
- [x] `server-only` package enforces build-time errors if server modules imported in client components (`auth.ts`, `crypto.ts`, `db/client.ts`)
- [ ] Server Action inputs validated with schema validator (e.g., Zod) — *no Server Actions in codebase currently*
- [ ] React Taint APIs for preventing sensitive objects reaching client — *experimental, not yet stable*

---

## Remaining Infrastructure Items

These require infrastructure/ops changes, not code changes:

- **Database RLS**: Add PostgreSQL Row-Level Security policies for tenant isolation defense-in-depth
- **Database role**: Create minimum-privilege DB user (no CREATE/DROP/ALTER)
- **Database credentials**: Establish rotation schedule
- **Redis rate limiting**: Replace in-memory store for multi-instance deployments
- **CI pipeline**: Add `npm audit --audit-level=high` and `npm ci` to build pipeline

---

## Rules for New Code

1. **Every state-changing endpoint** (POST/PUT/DELETE/PATCH) must validate CSRF token via `validateCsrfRequest(request)` or go through `requireAuth(request)`.
2. **Every authenticated endpoint** must call `isAuthenticated()` or `getSession()` and return 401 on failure.
3. **Every tenant-scoped query** must include `tenantId` derived from authenticated session, never from user input.
4. **Every file upload** must use `verifyFileSignature()` + `sanitizeFilename()` from `@/lib/security/uploads`.
5. **Every outbound fetch of user-provided URLs** must use `safeFetch()` from `@/lib/security/ssrf`.
6. **Every user-facing error response** must use generic messages — never expose stack traces, file paths, or query details.
7. **Every new API route** must be added to the appropriate rate limit category in `getRateLimitType()` in middleware.
8. **Every new dependency** must be evaluated for: age >60 days, active maintenance, minimal transitive deps, no known CVEs.
9. **Never use** `$queryRawUnsafe`, `$executeRawUnsafe`, `eval()`, `Function()`, `child_process.exec()` with user input, or `dangerouslySetInnerHTML` without DOMPurify.
10. **Never log** tokens, passwords, API keys, session cookies, or unredacted user IDs.
11. **Never trust** client-supplied MIME types, filenames, prices, or tenant identifiers without server-side validation.
12. **Never import** `@/lib/auth`, `@/lib/security/*`, or `@/lib/db/*` in client components — they use `server-only`.
