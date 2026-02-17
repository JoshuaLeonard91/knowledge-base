# Security Audit Report — Full Codebase Review

**Date:** 2026-02-17
**Methodology:** Vibecoder security review (OWASP-focused) + automated sub-agent analysis
**Scope:** All API routes, middleware, Discord bot, integrations, CMS layer, dependencies, configuration
**Stack:** Next.js 16.1.6 + React 19 + TypeScript + Tailwind CSS 4, Prisma/PostgreSQL, Discord.js 14.25.1, Stripe, Jira, Hygraph CMS

---

## Executive Summary

| Severity | Count |
|----------|-------|
| Critical | 0 |
| High | 0 |
| Medium | 1 |
| Low | 2 |
| Informational | 3 |

The codebase demonstrates strong security posture across all OWASP categories. No critical or high-severity vulnerabilities were identified. One medium defense-in-depth issue and two low-severity hardening opportunities were found and fixed.

---

## Findings

### FINDING-001: Tenant Context Fallback in Integration GET Routes

**Severity:** Medium (defense-in-depth)
**Status:** FIXED
**Files:**
- `src/app/api/dashboard/integrations/hygraph/route.ts` (line 64-66)
- `src/app/api/dashboard/integrations/discord-bot/route.ts` (line 51-53)
- `src/app/api/dashboard/settings/theme/route.ts` (line 41-43)

**Description:**
Two integration GET routes used a fallback `|| user.tenants[0]` when the subdomain tenant context didn't match any of the user's tenants. If `tenantContext` exists but `find()` returns `undefined`, the code silently fell back to the user's first tenant instead of returning 403.

**Vulnerable pattern:**
```typescript
const tenant = tenantContext
  ? user.tenants.find(t => t.slug === tenantContext.slug) || user.tenants[0]
  : user.tenants[0];
```

**Correct pattern** (already used by the Jira route):
```typescript
const tenant = tenantContext
  ? user.tenants.find(t => t.slug === tenantContext.slug)
  : user.tenants[0];

if (!tenant) {
  return NextResponse.json(
    { error: 'Tenant access denied' },
    { status: 403, headers: securityHeaders }
  );
}
```

**Current mitigations:**
1. Session cookies use `__Host-` prefix in production (subdomain-isolated)
2. `user.tenants` only returns tenants owned by the authenticated user
3. System currently enforces one tenant per user

**Impact:** If multi-tenant-per-user is enabled in the future, a user on one tenant's subdomain could silently see another of their own tenant's integration config. Not a cross-user leak, but an inconsistency with the Jira route's correct pattern.

**Fix:** Removed the `|| user.tenants[0]` fallback and added explicit 403 check in both routes.

---

### FINDING-002: CSP img-src Uses https: Wildcard

**Severity:** Low
**Status:** FIXED
**File:** `src/middleware.ts` (line 277)

**Description:**
The CSP `img-src` directive included `https:` which allows loading images from any HTTPS origin, making the explicit CDN domain allowlist redundant.

**Before:**
```
img-src 'self' data: https: blob: https://cdn.discordapp.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com
```

**After:**
```
img-src 'self' data: blob: https://cdn.discordapp.com https://lh3.googleusercontent.com https://avatars.githubusercontent.com https://*.graphassets.com https://media.graphassets.com
```

**Impact:** Very low. Images cannot execute scripts. The `script-src` is properly locked down with nonces. The primary risk was theoretical data exfiltration via image loading if XSS were achieved (which CSP already prevents).

**Fix:** Replaced `https:` wildcard with explicit Hygraph CDN domains (`*.graphassets.com`, `media.graphassets.com`).

---

### FINDING-003: Stripe Webhook Routes Skip All Middleware Headers

**Severity:** Low
**Status:** FIXED
**File:** `src/middleware.ts` (lines 319-321)

**Description:**
Stripe and checkout webhook routes bypassed middleware entirely via early return. This was intentional (to preserve raw body for signature verification), but meant no security headers were applied to webhook responses.

**Before:**
```typescript
if (pathname === '/api/stripe/webhook' || pathname === '/api/checkout/webhook') {
  return NextResponse.next();
}
```

**After:**
```typescript
if (pathname === '/api/stripe/webhook' || pathname === '/api/checkout/webhook') {
  const response = NextResponse.next();
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Cache-Control', 'no-store, private');
  return response;
}
```

**Impact:** Very low. Webhook routes return JSON (not HTML), so CSP and framing headers are irrelevant. Stripe controls request rates. Signature verification prevents unauthorized access.

**Fix:** Added `X-Content-Type-Options: nosniff` and `Cache-Control: no-store, private` to the bypass path.

---

## Informational Notes

### INFO-001: CSP script-src includes 'unsafe-inline'

**File:** `src/middleware.ts` (line 274)

The CSP includes `'unsafe-inline'` as a backward-compatibility fallback for browsers that don't support nonces. Modern browsers ignore `'unsafe-inline'` when a nonce or `'strict-dynamic'` is present. This is the [Google-recommended CSP pattern](https://web.dev/strict-csp/) and is not a vulnerability.

### INFO-002: CSP style-src requires 'unsafe-inline'

**File:** `src/middleware.ts` (lines 275-276)

Both `style-src` and `style-src-elem` allow `'unsafe-inline'`, which is required by Next.js + Tailwind CSS. Style-based XSS is mitigated by the `filterInlineStyles()` function in `src/lib/sanitize.ts` which blocks `javascript:`, `expression()`, `url()`, and `@import` patterns in CMS content.

### INFO-003: In-memory rate limiting is single-instance only

**File:** `src/middleware.ts` (lines 81-97)

Rate limiting uses an in-memory Map that resets on deploy and doesn't sync across instances. This is documented in `CLAUDE.md` as an infrastructure item. For single-instance deployment (current), this is acceptable. Multi-instance deployments will require Redis.

---

## Areas Reviewed — No Issues Found

| Category | Status | Key Evidence |
|----------|--------|--------------|
| **Hardcoded Secrets** | PASS | All secrets via `process.env`. Dev fallbacks gated to non-production. Only `NEXT_PUBLIC_APP_URL` exposed to client. `.env` files gitignored. |
| **Authentication** | PASS | AES-256-GCM encrypted sessions + HMAC-SHA256. `__Host-` prefix, HttpOnly, Secure, SameSite=Lax. Idle (30min), absolute (24h), rotation (6h). |
| **CSRF Protection** | PASS | Signed double-submit cookie. CSRF bound to session ID. All POST/PUT/DELETE/PATCH validated. Webhooks exempt but signature-verified. |
| **SQL/NoSQL Injection** | PASS | No `$queryRawUnsafe` or `$executeRawUnsafe`. All Prisma ORM with validated inputs. All where clause inputs have regex/allowlist validation. |
| **XSS Prevention** | PASS | React JSX auto-escaping. All `dangerouslySetInnerHTML` sanitized with DOMPurify + strict tag/attribute/CSS allowlists. Nonce-based CSP with `strict-dynamic`. |
| **Command Injection** | PASS | No `eval()`, `Function()`, `child_process.exec()`, or shell commands anywhere in codebase. |
| **File Uploads** | PASS | Magic byte verification, UUID filenames, null byte removal, path traversal prevention, 10MB/5-file limits, MIME allowlist. Consistent across API and Discord bot. |
| **SSRF Prevention** | PASS | `safeFetch()` blocks private IPs, validates DNS, disables redirect following. Applied to all Discord attachment downloads. |
| **Open Redirect** | PASS | OAuth callbacks validate origin. `isValidCallbackUrl()` enforces relative paths, blocks `javascript:`, `data:`, `//`, `\`. |
| **Rate Limiting** | PASS | Per-endpoint tiered limits. Per-IP + per-tenant keying. Rightmost `X-Forwarded-For`. 10k hard cap. Auth routes limited before handler. |
| **Multi-Tenant Isolation** | PASS | Subdomain resolution in middleware. No cookie `domain` attribute + `__Host-` prefix. `requireTenantOwner()` with DB verification. Encrypted per-tenant secrets. |
| **Webhook Security** | PASS | Stripe: `constructEvent()`. Jira: HMAC-SHA256 + `timingSafeEqual`. Hygraph: HMAC-SHA256 structured payload. Event dedup + timestamp validation. |
| **Error Handling** | PASS | Generic messages via `createErrorResponse`. `sanitizeErrorResponse` + `stripSensitiveFields`. No stack traces in responses. |
| **Security Headers** | PASS | HSTS, nosniff (triple-layered), DENY framing, strict referrer, restrictive permissions, nonce CSP, COOP/CORP same-origin. |
| **Dependencies** | PASS | 15 production deps, all current versions. `ignore-scripts=true`. Dependabot configured. No typosquatting. |
| **Secrets Management** | PASS | `SESSION_SECRET` + `ENCRYPTION_KEY` enforced in production. Per-tenant secrets encrypted with `encryptToString`. Dev fallbacks clearly named. |
| **Privacy / Data Exposure** | PASS | No credentials returned to client. Jira users endpoint correctly filters email. Generic error messages. Sensitive fields stripped from responses. |

---

## False Positives Investigated & Dismissed

### Jira Webhook `?tenant` Parameter

Sub-agent flagged the `?tenant` query parameter in `/api/webhooks/jira` as critical tenant injection. After manual review: **false positive**.

- The parameter routes to the correct tenant's webhook config
- Authentication uses that specific tenant's webhook secret (HMAC or URL token)
- An attacker without the target tenant's secret gets 401
- An attacker can't use their own tenant's secret against another tenant
- This is a standard multi-tenant webhook routing pattern

### Jira Config GET Over-Fetching

Sub-agent flagged the Jira config GET returning fields like `cloudUrl`, `projectKey`. After review: **not a vulnerability**. These are configuration metadata (not credentials), returned only to the authenticated tenant owner, and needed by the dashboard UI for display.

### Subdomain Enumeration via check-subdomain

Sub-agent flagged subdomain enumeration. After review: **acceptable risk**. The endpoint requires authentication (line 65), is rate-limited (100/min), and subdomain existence is inherently public information (DNS resolves, pages load).

---

## Recommendations for Future Work

1. **Database RLS**: Add PostgreSQL Row-Level Security policies for tenant isolation defense-in-depth
2. **Redis rate limiting**: Replace in-memory store when scaling to multi-instance
3. **CI security pipeline**: Add `npm audit --audit-level=high` and `npm ci` to build
4. **Session freshness**: Consider requiring recent authentication for sensitive operations (tenant creation, account linking)
5. **Structured logging migration**: Replace remaining `console.error` in dashboard routes with structured security logger
