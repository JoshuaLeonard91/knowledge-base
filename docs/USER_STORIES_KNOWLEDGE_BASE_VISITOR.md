# Knowledge Base - Visitor User Stories

Documentation of all implemented user stories for the Knowledge Base section targeting **Visitor** users.

---

## Overview

| #   | Priority     | User Story                                       | Status      |
| --- | ------------ | ------------------------------------------------ | ----------- |
| 1   | Must Have    | Browse categorized guides                        | Implemented |
| 2   | Must Have    | Search results ranked by relevance with snippets | Implemented |
| 3   | Must Have    | Related guides + path to contact support         | Implemented |
| 4   | Should Have  | Stable, shareable links to guides & sections     | Implemented |
| 5   | Nice to Have | Recent searches and viewed guides surfaced       | Implemented |

---

## User Story #1: Browse Categorized Guides

**As a** Visitor
**I need** to browse categorized guides
**So that I can** find practical answers quickly and independently

### Implementation

Users can browse articles organized by dynamic categories (loaded from Google Sheets or local fallback). The support hub displays category cards with article counts, and the articles page allows filtering by category.

### Files

| File                                           | Purpose                                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------- |
| `src/app/support/page.tsx`                     | Support hub with category listing                                               |
| `src/app/support/articles/page.tsx`            | Articles listing page with category filter                                      |
| `src/app/support/articles/ArticlesContent.tsx` | Client-side article filtering and display                                       |
| `src/components/support/CategoryList.tsx`      | Category grid component with icons and counts                                   |
| `src/components/support/ArticleCard.tsx`       | Individual article card component                                               |
| `src/lib/cms/index.ts`                         | CMS abstraction - `getArticles()`, `getCategories()`, `getArticlesByCategory()` |
| `src/lib/data/articles.ts`                     | Local fallback article data                                                     |
| `src/lib/google-docs/articles.ts`              | Google Docs article fetching                                                    |
| `src/lib/category-colors.ts`                   | Dynamic category badge color styling                                            |
| `src/types/index.ts`                           | `Article`, `ArticleCategory` type definitions                                   |

### API Endpoints

| Endpoint        | Method | Description                         |
| --------------- | ------ | ----------------------------------- |
| `/api/articles` | GET    | Returns all articles and categories |

---

## User Story #2: Search Results Ranked by Relevance

**As a** Visitor
**I need** search results ranked by relevance with clear snippets
**So that I can** judge which guide will solve my problem before I open it

### Implementation

Full-text search with relevance scoring based on title matches, keyword matches, and content matches. Results display title, excerpt snippet, and category badge. Search is debounced (300ms) with live dropdown results.

### Files

| File                                   | Purpose                                            |
| -------------------------------------- | -------------------------------------------------- |
| `src/components/support/SearchBar.tsx` | Search input with live dropdown results            |
| `src/lib/cms/index.ts`                 | `searchArticles()` function with relevance scoring |
| `src/lib/google-docs/articles.ts`      | Google Docs search implementation                  |
| `src/lib/data/articles.ts`             | Local fallback search implementation               |
| `src/lib/validation.ts`                | `validateSearchQuery()` - input sanitization       |
| `src/app/api/articles/search/route.ts` | Search API endpoint                                |
| `src/types/index.ts`                   | `SearchResult` type definition                     |

### API Endpoints

| Endpoint                         | Method | Description                            |
| -------------------------------- | ------ | -------------------------------------- |
| `/api/articles/search?q={query}` | GET    | Returns ranked search results (max 10) |

### Relevance Scoring Algorithm

```
Title exact match: +10 points
Title partial match: +5 points
Keyword match: +3 points per keyword
Content match: +1 point
```

---

## User Story #3: Related Guides & Path to Support

**As a** Visitor
**I need** access to suggested related guides and a clear path to contact support
**So that I can** get additional assistance when self-service isn't enough

### Implementation

Each article displays related articles based on shared category and keywords. A feedback section asks if the article was helpful, and a CTA section on the hub provides direct access to ticket submission.

### Files

| File                                                  | Purpose                                           |
| ----------------------------------------------------- | ------------------------------------------------- |
| `src/app/support/articles/[slug]/page.tsx`            | Article detail page with related articles section |
| `src/app/support/articles/[slug]/ArticleFeedback.tsx` | "Was this helpful?" feedback component            |
| `src/components/support/ArticleCard.tsx`              | Related article card (compact variant)            |
| `src/lib/cms/index.ts`                                | `getRelatedArticles()` function                   |
| `src/app/support/page.tsx`                            | CTA section with "Contact Support" button         |
| `src/app/api/feedback/route.ts`                       | Feedback submission API                           |

### API Endpoints

| Endpoint               | Method | Description                                   |
| ---------------------- | ------ | --------------------------------------------- |
| `/api/articles/{slug}` | GET    | Returns article with related slugs            |
| `/api/feedback`        | POST   | Submit article feedback (helpful/not helpful) |

### Related Articles Algorithm

```
1. Filter articles in same category
2. Score by shared keywords
3. Exclude current article
4. Return top N results
```

---

## User Story #4: Shareable Section Links

**As a** Visitor
**I need** stable, shareable links to guides and specific sections
**So that I can** point teammates to the exact instructions

### Implementation

All article headers (h1, h2, h3) have auto-generated anchor IDs. Hovering over a header reveals a link icon button that copies the full URL with anchor to clipboard. Scroll offset accounts for fixed navbar.

### Files

| File                                             | Purpose                                                            |
| ------------------------------------------------ | ------------------------------------------------------------------ |
| `src/app/support/articles/[slug]/page.tsx`       | Header rendering with anchor IDs and `generateHeaderId()` function |
| `src/app/support/articles/[slug]/HeaderLink.tsx` | Copy-to-clipboard button component                                 |
| `src/app/globals.css`                            | `scroll-margin-top` CSS for anchor offset                          |

### Key Code

**Header ID Generation** (`page.tsx`):

```typescript
function generateHeaderId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .trim();
}
```

**Scroll Offset** (`globals.css`):

```css
[id] {
  scroll-margin-top: 100px;
}
```

### Usage

1. Navigate to any article
2. Hover over any h1/h2/h3 header
3. Click the link icon that appears
4. URL with anchor is copied to clipboard
5. Share the URL - recipient scrolls directly to that section

---

## User Story #5: Recent Searches & Viewed Guides

**As a** Visitor
**I need** recent searches and viewed guides surfaced
**So that I can** pick up where I left off

### Implementation

Browser history tracking stored in httpOnly cookies via the preferences API. Displays last 5 searches and last 5 viewed articles on the support hub. History persists across sessions and can be cleared by the user.

### Files

| File                                                     | Purpose                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| `src/lib/hooks/useHistory.ts`                            | Custom hook for history state management                    |
| `src/components/support/HistoryProvider.tsx`             | React context provider for history                          |
| `src/components/support/RecentSection.tsx`               | UI component displaying recent items                        |
| `src/components/support/SearchBar.tsx`                   | Tracks searches on result click                             |
| `src/app/support/articles/[slug]/ArticleViewTracker.tsx` | Client component tracking article views                     |
| `src/app/support/articles/[slug]/page.tsx`               | Includes ArticleViewTracker                                 |
| `src/app/support/page.tsx`                               | Includes RecentSection                                      |
| `src/app/layout.tsx`                                     | Wraps app with HistoryProvider                              |
| `src/app/api/preferences/route.ts`                       | Extended to store/retrieve history arrays                   |
| `src/types/index.ts`                                     | `SearchHistoryItem`, `ViewHistoryItem`, `UserHistory` types |

### API Endpoints

| Endpoint           | Method | Description                                  |
| ------------------ | ------ | -------------------------------------------- |
| `/api/preferences` | GET    | Returns preferences including history arrays |
| `/api/preferences` | POST   | Saves preferences including history arrays   |

### Data Structures

**Types** (`src/types/index.ts`):

```typescript
interface SearchHistoryItem {
  query: string;
  timestamp: number;
}

interface ViewHistoryItem {
  slug: string;
  title: string;
  category: string;
  timestamp: number;
}

interface UserHistory {
  recentSearches: SearchHistoryItem[];
  viewedArticles: ViewHistoryItem[];
}
```

### Configuration

| Setting             | Value           |
| ------------------- | --------------- |
| Max recent searches | 5               |
| Max viewed articles | 5               |
| Save debounce       | 500ms           |
| Storage method      | httpOnly cookie |
| Cookie max age      | 1 year          |

### Features

- **Automatic Tracking**: Searches tracked on result click, views tracked on page load
- **Deduplication**: Repeated searches/views move item to top, don't create duplicates
- **Timestamps**: Shows relative time ("2h ago", "3d ago")
- **Clear History**: One-click button to clear all history
- **Privacy**: httpOnly cookies prevent XSS access to history data

---

## Complete File Index

### Core Components

| File                                           | Stories    |
| ---------------------------------------------- | ---------- |
| `src/app/support/page.tsx`                     | #1, #3, #5 |
| `src/app/support/articles/page.tsx`            | #1         |
| `src/app/support/articles/ArticlesContent.tsx` | #1         |
| `src/app/support/articles/[slug]/page.tsx`     | #3, #4, #5 |
| `src/components/support/SearchBar.tsx`         | #2, #5     |
| `src/components/support/CategoryList.tsx`      | #1         |
| `src/components/support/ArticleCard.tsx`       | #1, #3     |
| `src/components/support/RecentSection.tsx`     | #5         |
| `src/components/support/HistoryProvider.tsx`   | #5         |

### Article Page Components

| File                                                     | Stories |
| -------------------------------------------------------- | ------- |
| `src/app/support/articles/[slug]/ArticleFeedback.tsx`    | #3      |
| `src/app/support/articles/[slug]/ArticleViewTracker.tsx` | #5      |
| `src/app/support/articles/[slug]/HeaderLink.tsx`         | #4      |

### Library/Utilities

| File                              | Stories    |
| --------------------------------- | ---------- |
| `src/lib/cms/index.ts`            | #1, #2, #3 |
| `src/lib/google-docs/articles.ts` | #1, #2     |
| `src/lib/data/articles.ts`        | #1, #2     |
| `src/lib/hooks/useHistory.ts`     | #5         |
| `src/lib/validation.ts`           | #2         |
| `src/lib/category-colors.ts`      | #1, #2     |

### API Routes

| File                                   | Stories |
| -------------------------------------- | ------- |
| `src/app/api/articles/route.ts`        | #1      |
| `src/app/api/articles/search/route.ts` | #2      |
| `src/app/api/articles/[slug]/route.ts` | #3      |
| `src/app/api/feedback/route.ts`        | #3      |
| `src/app/api/preferences/route.ts`     | #5      |

### Configuration/Types

| File                  | Stories        |
| --------------------- | -------------- |
| `src/types/index.ts`  | #1, #2, #3, #5 |
| `src/app/globals.css` | #4             |
| `src/app/layout.tsx`  | #5             |

---

## Testing Checklist

### User Story #1: Browse Categorized Guides

- [x] Categories display on support hub with correct counts
- [x] Clicking category filters articles list
- [x] Article cards show title, excerpt, category badge
- [x] Empty category shows appropriate message

### User Story #2: Search Results

- [x] Search returns results after 2+ characters
- [x] Results are ranked by relevance
- [x] Snippets display under titles
- [x] Category badges show on results
- [x] "No results" message for zero matches
- [x] "View all X results" link when >5 results

### User Story #3: Related Guides & Support Path

- [x] Related articles section appears on article pages
- [x] Related articles are from same category or share keywords
- [x] Feedback component allows helpful/not helpful selection
- [x] CTA section links to ticket submission

### User Story #4: Shareable Section Links

- [x] Headers have anchor IDs in URL-safe format
- [x] Link icon appears on header hover
- [x] Clicking copies full URL with anchor
- [x] Navigating to anchor URL scrolls to section
- [ ] Scroll accounts for navbar offset

### User Story #5: Recent History

- [x] Recent section hidden when no history
- [x] Searching and clicking result adds to history
- [x] Viewing article adds to history
- [x] History persists after page refresh
- [x] Clear history button removes all items
- [x] Maximum 5 items per category
- [x] Timestamps display correctly
