# Unlisted Field — Multi-Tenant Compatibility Workaround

## Problem

The `unlisted` boolean field was added to the Article model in Hygraph to support
hiding articles (e.g., Privacy Policy, Terms of Service) from listings and search
while keeping them accessible by direct URL.

However, tenants who haven't added the `unlisted` field to their Hygraph Article
model yet will have **all article queries fail** because GraphQL rejects queries
that reference fields not in the schema. This causes their articles page to show
zero articles.

## Current Fix (commit `02e6a0b`)

Instead of including `unlisted` directly in article query field selections, the
client now uses a two-step approach in `src/lib/hygraph/client.ts`:

1. **`checkUnlistedSupport()`** — Sends a lightweight probe query with the
   `unlisted` field. If it succeeds, the schema supports it. If it fails, it
   doesn't. The result is cached on the client instance (persists ~5 min via
   `tenantClientCache`).

2. **`getUnlistedSlugs()`** — If the schema supports `unlisted`, queries for
   slugs where `unlisted: true`. If not supported, returns an empty Set (all
   articles visible).

3. **Article listing methods** (`getArticles`, `searchArticles`,
   `getArticlesByCategory`) run the main query (without `unlisted` in field
   selection) in parallel with `getUnlistedSlugs()`, then filter results.

## When to Remove This Workaround

Once **all tenants** have added the `unlisted` Boolean field to their Article
model in Hygraph, this workaround can be simplified back to the direct approach:

### Steps to revert:

1. **Delete this file** (`UNLISTED_FIELD_COMPAT.md`)

2. **In `src/lib/hygraph/client.ts`:**
   - Remove the `_schemaSupportsUnlisted` property
   - Remove the `checkUnlistedSupport()` method
   - Remove the `getUnlistedSlugs()` method
   - Add `unlisted` back to the field selections in all 4 article queries
     (`GetArticles`, `GetArticle`, `SearchArticles`, `GetArticlesByCategory`)
   - Replace the `Promise.all([query, getUnlistedSlugs()])` pattern with a
     single query, filtering with `.filter((article) => !article.unlisted)`
   - Optionally re-add `unlisted?: boolean` to the `HygraphArticle` interface

### Tenant checklist:

| Tenant | Has `unlisted` field? |
|--------|-----------------------|
| Main   | Yes                   |
| *(add tenants here as they update)* | |

Once all rows show "Yes", apply the revert steps above.
