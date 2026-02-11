# Schema Compatibility — Multi-Tenant Workarounds

Tracks fields added to the main Hygraph schema that may not exist on tenant
schemas yet. GraphQL rejects queries that reference missing fields, which breaks
entire pages. These workarounds detect field support at runtime and fall back
gracefully.

**File:** `src/lib/hygraph/client.ts`

---

## 1. Article `unlisted` field

**Purpose:** Hides articles (e.g., Privacy Policy, Terms of Service) from
listings and search while keeping them accessible by direct URL.

**Workaround (commit `02e6a0b`):**
- `_schemaSupportsUnlisted` — cached boolean, probed once per client instance
- `checkUnlistedSupport()` — lightweight probe query with `unlisted` field
- `getUnlistedSlugs()` — fetches slugs where `unlisted: true`, returns empty
  Set if field unsupported (all articles visible)
- Article listing methods (`getArticles`, `searchArticles`,
  `getArticlesByCategory`) run main query without `unlisted` in field selection,
  filter via `getUnlistedSlugs()` in parallel

**To revert:**
- Remove `_schemaSupportsUnlisted` property
- Remove `checkUnlistedSupport()` and `getUnlistedSlugs()` methods
- Add `unlisted` back to all 4 article query field selections
- Replace `Promise.all([query, getUnlistedSlugs()])` with single query +
  `.filter((article) => !article.unlisted)`
- Re-add `unlisted?: boolean` to `HygraphArticle` interface

---

## 2. ArticleCategory `color` field

**Purpose:** CMS-driven hex color for category icons and hover effects (replaces
hardcoded color mappings).

**Workaround:**
- `_schemaSupportsColor` — cached boolean on client instance
- `getCategories()` tries the query with `color { hex }` first
- If it fails and `_schemaSupportsColor` is null (first attempt), sets flag to
  `false` and retries without `color { hex }`
- Categories without color fall back to the hash-based color assignment in
  `src/lib/category-colors.ts`

**To revert:**
- Remove `_schemaSupportsColor` property
- Simplify `getCategories()` back to a single query with `color { hex }`

---

## Tenant Checklist

| Tenant | Has `unlisted` (Article)? | Has `color` (ArticleCategory)? |
|--------|---------------------------|--------------------------------|
| Main   | Yes                       | Yes                            |
| *(add tenants here as they update)* | | |

Once all tenants have both fields, delete this file and apply the revert steps.
