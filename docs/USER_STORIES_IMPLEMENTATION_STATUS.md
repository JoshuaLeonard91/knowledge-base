# User Stories - Implementation Status

Complete implementation status of all user stories with realistic AI-assisted development time estimates.

---

## Time Estimation Notes

| Estimate Type | Description |
|---------------|-------------|
| **AI Dev Time** | Actual development time with AI coding assistant (Claude) |
| **Testing Time** | Manual testing, edge cases, and QA verification |
| **Total Time** | Combined development + testing |

**Based on actual implementation data:**
- Knowledge Base #5 (Recent History): ~12 min dev + ~15 min testing
- Knowledge Base #4 (Section Links): ~4 min dev + ~10 min testing

---

## Summary Dashboard

| Area | Must Have | Should Have | Nice to Have | Total |
|------|-----------|-------------|--------------|-------|
| Knowledge Base | 3/3 | 1/1 | 1/1 | **5/5** |
| Services Page | 2/2 | 1/1 | - | **3/3** |
| Ticket Support | 1/2 | 0/1 | 0/1 | **1/4** |
| Contact Page | 0/1 | - | - | **0/1** |
| Help Me Decide | 0/1 | - | 0/1 | **0/2** |
| Testimonials | 0/1 | - | - | **0/1** |
| Direct Links | 1/2 | - | - | **1/2** |
| Leave A Tip | 0/1 | - | 0/1 | **0/2** |
| Support Optimization | - | - | 0/1 | **0/1** |
| **TOTAL** | **7/13** | **2/3** | **1/5** | **10/21** |

**Overall Progress: 48% Complete (10/21 stories)**

---

## 1. Knowledge Base (Visitor)

| # | Priority | User Story | Status | AI Dev | Testing | Total |
|---|----------|------------|--------|--------|---------|-------|
| 1 | Must Have | Browse categorized guides | **DONE** | - | - | - |
| 2 | Must Have | Search with relevance ranking & snippets | **DONE** | - | - | - |
| 3 | Must Have | Related guides + path to contact support | **DONE** | - | - | - |
| 4 | Should Have | Stable, shareable links to sections | **DONE** | 5 min | 10 min | 15 min |
| 5 | Nice to Have | Recent searches and viewed guides | **DONE** | 15 min | 15 min | 30 min |

### Story Details

#### #1: Browse Categorized Guides
**Status:** Implemented

**As a** Visitor **I need** to browse categorized guides **So that I can** find practical answers quickly and independently.

**Implementation:** Categories loaded from Hygraph CMS/local fallback, displayed on support hub and articles page with filtering.

---

#### #2: Search with Relevance Ranking
**Status:** Implemented

**As a** Visitor **I need** search results ranked by relevance with clear snippets **So that I can** judge which guide will solve my problem before I open it.

**Implementation:** Full-text search with scoring algorithm (title +10, keywords +3, content +1), debounced live dropdown.

---

#### #3: Related Guides & Support Path
**Status:** Implemented

**As a** Visitor **I need** access to suggested related guides and a clear path to contact support **So that I can** get additional assistance when self-service isn't enough.

**Implementation:** Related articles section on each article page, feedback component, CTA to ticket submission.

---

#### #4: Shareable Section Links
**Status:** Implemented

**As a** Visitor **I need** stable, shareable links to guides and specific sections **So that I can** point teammates to the exact instructions.

**Implementation:** Anchor IDs on all headers, hover-to-reveal copy button, scroll offset for navbar.

**Files:** `HeaderLink.tsx`, `page.tsx` (article), `globals.css`

---

#### #5: Recent Searches & Viewed Guides
**Status:** Implemented

**As a** Visitor **I need** recent searches and viewed guides surfaced **So that I can** pick up where I left off.

**Implementation:** History stored in httpOnly cookies, displays 5 searches + 5 articles on hub, clear history option.

**Files:** `useHistory.ts`, `HistoryProvider.tsx`, `RecentSection.tsx`, `ArticleViewTracker.tsx`, `preferences/route.ts`

---

## 2. Services Page (Prospect)

| # | Priority | User Story | Status | AI Dev | Testing | Total |
|---|----------|------------|--------|--------|---------|-------|
| 6 | Must Have | Clear services page (managed services, consulting, SLAs) | **DONE** | 15 min | 10 min | 25 min |
| 7 | Must Have | Contact button on services page → form | **DONE** | 10 min | 5 min | 15 min |
| 8 | Should Have | Links from services to guides & testimonials | **DONE** | 5 min | 5 min | 10 min |

### Story Details

#### #6: Services Page
**Status:** Implemented

**As a** Prospect **I need** a clear services page that lists managed services, consulting, and SLAs **So that I can** quickly decide which offering matches needs.

**Implementation:** Created `/support/services/page.tsx` with service cards, SLA tiers (Community/Professional/Enterprise), SLA highlights, and pricing tiers. Services include Managed Bots, Consulting, Priority Support, and Custom Development.

**Files:** `services/page.tsx`, `src/data/services.ts`

---

#### #7: Services Contact Button
**Status:** Implemented

**As a** Prospect **I need** a contact button on the services page that opens a form **So that I can** start a conversation about potential onboarding or general information.

**Implementation:** Created `ServiceContactModal.tsx` with inquiry form including name, email, company, service selection, inquiry type, and message. Integrates with Jira if configured, otherwise logs inquiries.

**Files:** `ServiceContactModal.tsx`, `api/service-inquiry/route.ts`

---

#### #8: Service Links to Guides
**Status:** Implemented

**As a** Prospect **I need** links from each service to relevant guides and testimonials **So that I can** assess implementation effort and outcomes.

**Implementation:** Service cards display related guides with links to article pages. Added "Helpful Resources" section linking to Knowledge Base, Submit Ticket, and Community Discord. Testimonials pending (#16).

**Files:** `services/page.tsx`, `src/data/services.ts`

---

## 3. Ticket Support

| # | Priority | User | User Story | Status | AI Dev | Testing | Total |
|---|----------|------|------------|--------|--------|---------|-------|
| 9 | Must Have | Client | Create ticket (server, topic, severity, description) | **PARTIAL** | 10 min | 10 min | 20 min |
| 10 | Must Have | Manager | SLA bucket mapping based on options | **NOT DONE** | 20 min | 20 min | 40 min |
| 11 | Should Have | Client | Update ticket with logs/comments, receive status | **NOT DONE** | 30 min | 25 min | 55 min |
| 12 | Nice to Have | Client | Submit RFC/RFI with delivery window | **NOT DONE** | 20 min | 15 min | 35 min |

### Story Details

#### #9: Create Incident Ticket
**Status:** Partial - Missing severity field

**As a** Client **I need** to create a ticket for an incident with fields for server, topic, severity, and description **So that I can** get support to triage and meet SLA expectations.

**Current State:** Has server ID, subject/topic, description. Missing: severity dropdown.

**Required Work:**
- Add severity field to `TicketForm.tsx`
- Add severity to `TicketSubmission` type
- Update `/api/ticket` to include severity
- Map severity to Jira priority

---

#### #10: SLA Bucket Mapping
**Status:** Not Implemented

**As a** Support Manager **I need** tickets to map to SLA buckets automatically based on selected options **So that I can** prioritize and enforce response targets.

**Required Work:**
- Define SLA tiers (Critical, High, Medium, Low)
- Create mapping logic from severity + topic
- Update Jira integration to set SLA fields
- Add SLA indicator to ticket view

---

#### #11: Ticket Updates & Comments
**Status:** Not Implemented

**As a** Client **I need** to update ticket with logs and comments and receive status updates **So that I can** keep stakeholders informed without re-opening new tickets.

**Current State:** Can view ticket details, but no UI to add comments.

**Required Work:**
- Create comment input component
- Add file attachment support
- Implement `/api/tickets/[id]/comments` endpoint
- Add status change notifications

---

#### #12: RFC/RFI Submission
**Status:** Not Implemented

**As a** Client **I need** to submit an RFC/RFI for a (managed) integration or feature with fields for server, topic, preferred delivery window, and description **So that I can** have the support team review and schedule work.

**Required Work:**
- Create RFC/RFI form variant
- Add delivery window date picker
- Create separate Jira request type
- Add RFC listing page

---

## 4. Contact Page (Visitor)

| # | Priority | User Story | Status | AI Dev | Testing | Total |
|---|----------|------------|--------|--------|---------|-------|
| 13 | Must Have | Contact page explaining tickets vs Discord vs DM | **NOT DONE** | 15 min | 10 min | 25 min |

### Story Details

#### #13: Contact Channel Guide
**Status:** Not Implemented

**As a** Visitor **I need** a contact page that explains when to use tickets, Discord, or direct messages **So that I can** choose the fastest and most appropriate channel.

**Required Work:**
- Create `/support/contact/page.tsx`
- Design channel comparison cards
- Add decision flowchart or table
- Link to each channel

---

## 5. Help Me Decide (Decision Tree)

| # | Priority | User | User Story | Status | AI Dev | Testing | Total |
|---|----------|------|------------|--------|--------|---------|-------|
| 14 | Must Have | Visitor | FAB with questions → relevant guides/services | **PARTIAL** | 20 min | 15 min | 35 min |
| 15 | Nice to Have | Manager | Analytics on flows & drop-off | **NOT DONE** | 45 min | 30 min | 75 min |

### Story Details

#### #14: Floating Action Button Decision Tree
**Status:** Partial - Tree exists but not as FAB

**As a** Visitor **I need** a floating action button that asks a few quick questions about my role and goal **So that I can** be shown the most relevant guides and services.

**Current State:** Decision tree components exist (`TreeContainer`, `TreeNode`, `TreeProgress`) but not exposed as floating button.

**Required Work:**
- Create FAB component with icon
- Add modal/drawer for tree display
- Position fixed bottom-right
- Add open/close animation

---

#### #15: Decision Tree Analytics
**Status:** Not Implemented

**As a** Support Manager **I need** analytics on which flows users choose and where they drop off **So that I can** refine the questions and content mapping.

**Required Work:**
- Add analytics event tracking
- Create analytics dashboard page
- Track: node visits, completions, drop-offs
- Integrate with analytics provider or custom DB

---

## 6. Testimonials (Visitor)

| # | Priority | User Story | Status | AI Dev | Testing | Total |
|---|----------|------------|--------|--------|---------|-------|
| 16 | Must Have | Rotating testimonials with client name/role | **NOT DONE** | 20 min | 15 min | 35 min |

### Story Details

#### #16: Testimonials Section
**Status:** Not Implemented

**As a** Visitor **I need** to see short, rotating testimonials on the services page with client name and role **So that I can** gauge credibility quickly.

**Required Work:**
- Create `Testimonials.tsx` carousel component
- Create testimonials data file
- Add auto-rotation with pause on hover
- Include avatar, name, role, quote

---

## 7. Direct Link to Guide Headers

| # | Priority | User | User Story | Status | AI Dev | Testing | Total |
|---|----------|------|------------|--------|--------|---------|-------|
| 17 | Must Have | Visitor | Copy link to specific guide header | **DONE** | - | - | - |
| 18 | Must Have | Manager | Copy link to specific guide header | **DONE** | - | - | - |

### Story Details

#### #17 & #18: Direct Section Links
**Status:** Implemented (same feature for both users)

**As a** Visitor/Manager **I need** to copy a direct link to a specific guide header **So that I can** point teammates/customers to the exact instructions.

**Implementation:** Covered by Knowledge Base #4.

---

## 8. Leave A Tip

| # | Priority | User | User Story | Status | AI Dev | Testing | Total |
|---|----------|------|------------|--------|--------|---------|-------|
| 19 | Must Have | Visitor | Prompt to leave tip after ticket resolved | **NOT DONE** | 60 min | 45 min | 105 min |
| 20 | Nice to Have | Manager | Anonymized tip metrics dashboard | **NOT DONE** | 35 min | 25 min | 60 min |

### Story Details

#### #19: Tip Prompt After Resolution
**Status:** Not Implemented

**As a** Visitor **I need** to be prompted to leave a tip after my ticket is resolved **So that I can** thank support for exceptional help.

**Required Work:**
- Integrate payment provider (Stripe/PayPal)
- Create tip modal component
- Trigger on ticket status = resolved
- Handle payment flow
- Store tip records

**Complexity:** High - requires payment integration

---

#### #20: Tip Metrics Dashboard
**Status:** Not Implemented

**As a** Support Manager **I need** to see anonymized tip metrics and totals **So that I can** understand recognition trends without exposing payer details.

**Required Work:**
- Create `/admin/tips` dashboard
- Aggregate tip data (totals, averages, trends)
- Anonymize payer information
- Add date range filters
- Create charts/visualizations

---

## 9. Support Optimization (Client)

| # | Priority | User Story | Status | AI Dev | Testing | Total |
|---|----------|------------|--------|--------|---------|-------|
| 21 | Nice to Have | Dropdown of managed integrations & topics | **PARTIAL** | 15 min | 10 min | 25 min |

### Story Details

#### #21: Integration-Specific Dropdowns
**Status:** Partial - Has subjects but not integration-specific

**As a** Client **I need** a dropdown of managed integrations and frequent topics **So that I can** quickly select the right category and provide relevant details.

**Current State:** Has subject dropdown with categories, but not specific to managed integrations.

**Required Work:**
- Add integration type selector
- Load topics based on selected integration
- Update form to show relevant fields per integration

---

## Time Estimates Summary

### Completed Work

| Story | AI Dev | Testing | Total |
|-------|--------|---------|-------|
| KB #4: Section Links | 5 min | 10 min | 15 min |
| KB #5: Recent History | 15 min | 15 min | 30 min |
| **Subtotal** | **20 min** | **25 min** | **45 min** |

### Remaining Work

| Priority | Stories | AI Dev | Testing | Total |
|----------|---------|--------|---------|-------|
| Must Have | 8 stories | 165 min | 135 min | **300 min (5 hrs)** |
| Should Have | 2 stories | 45 min | 35 min | **80 min (1.3 hrs)** |
| Nice to Have | 4 stories | 115 min | 80 min | **195 min (3.25 hrs)** |
| **TOTAL** | **14 stories** | **325 min** | **250 min** | **575 min (9.6 hrs)** |

### Recommended Implementation Order

#### Phase 1: Core Must Haves (~2.5 hrs)
| Story | Description | AI Dev | Testing |
|-------|-------------|--------|---------|
| #9 | Add severity to tickets | 10 min | 10 min |
| #13 | Contact page | 15 min | 10 min |
| #14 | FAB for decision tree | 20 min | 15 min |
| #6 | Services page | 25 min | 20 min |
| #7 | Services contact form | 15 min | 15 min |

#### Phase 2: Social Proof (~1 hr)
| Story | Description | AI Dev | Testing |
|-------|-------------|--------|---------|
| #16 | Testimonials carousel | 20 min | 15 min |
| #8 | Service → guide links | 15 min | 10 min |

#### Phase 3: Ticket Enhancements (~1.5 hrs)
| Story | Description | AI Dev | Testing |
|-------|-------------|--------|---------|
| #10 | SLA mapping | 20 min | 20 min |
| #11 | Ticket comments UI | 30 min | 25 min |

#### Phase 4: Tip System (~2.75 hrs)
| Story | Description | AI Dev | Testing |
|-------|-------------|--------|---------|
| #19 | Tip payment integration | 60 min | 45 min |
| #20 | Tip metrics dashboard | 35 min | 25 min |

#### Phase 5: Nice to Haves (~2 hrs)
| Story | Description | AI Dev | Testing |
|-------|-------------|--------|---------|
| #12 | RFC/RFI form | 20 min | 15 min |
| #15 | Decision tree analytics | 45 min | 30 min |
| #21 | Integration dropdowns | 15 min | 10 min |

---

## Notes

1. **AI Dev Times** are based on actual implementation experience with Claude AI assistant
2. **Testing Times** include manual QA, edge case verification, and basic regression testing
3. **Does not include**: Code review, deployment, documentation updates, or user acceptance testing
4. **Tip System (#19)** has highest complexity due to payment provider integration
5. **Analytics (#15)** may require additional infrastructure (database, analytics service)
