# Hygraph Services Page Setup

This guide walks you through creating the optional Services page models in Hygraph. Complete this only if you want a Services page on your website.

**Prerequisite:** Complete the main [Hygraph Setup Guide](./CLIENT_HYGRAPH_SETUP.md) first.

---

## What You'll Create

- **Services** - Your service offerings (e.g., Managed Bots, Consulting)
- **Service Tiers** - Pricing/support levels (e.g., Community, Professional, Enterprise)
- **SLA Highlights** - Key metrics/benefits displayed above pricing tiers (e.g., "99.9% Uptime")
- **Helpful Resources** - Optional CMS-driven resource links section

**Note:** The Services page automatically appears when you add services, and stays hidden if you don't.

---

## IMPORTANT: API IDs Must Match Exactly

When creating fields, Hygraph generates an **API ID** from the Display Name. The API ID must match exactly what the website expects, or the data won't load.

**How to check:** After creating a field, click on it and look at the "API ID" box. It should match the expected values in the tables below.

**Example:** Display Name "Response Time" should create API ID `responseTime` (not `response_time` or `ResponseTime`)

If the API ID doesn't match, you can edit it before saving the field.

---

## Step 1: Create the Service Model

1. Go to **Schema** in the left sidebar
2. Click **+ Add** next to MODELS
3. Display Name: `Service`
4. Click **Create Model**

### Add Fields

| # | Display Name | API ID (must match) | Type | Settings |
|---|--------------|---------------------|------|----------|
| 1 | Name | `name` | Single line text | Required |
| 2 | Slug | `slug` | Slug | Required, template: `{name}` |
| 3 | Tagline | `tagline` | Single line text | - |
| 4 | Description | `description` | Multi line text | Required |
| 5 | Icon | `icon` | Single line text | - |
| 6 | Color | `color` | Single line text | - |
| 7 | Features | `features` | Single line text | Enable "Allow multiple values" |
| 8 | Related Articles | `relatedArticles` | Reference | Select "Article", Allow multiple |
| 9 | Order | `order` | Integer | - |
| 10 | Price Label | `priceLabel` | Single line text | e.g., "Starting at $99/mo" |
| 11 | Button Text | `buttonText` | Single line text | e.g., "View Plans" (default: "Get Started") |

**Note:** If `priceLabel` is left empty, no price badge appears. If `buttonText` is empty, button shows "Get Started".

---

## Step 2: Create the Service Tier Model

1. Click **+ Add** next to MODELS
2. Display Name: `Service Tier`
3. Click **Create Model**

### Add Fields

| # | Display Name | API ID (must match) | Type | Settings |
|---|--------------|---------------------|------|----------|
| 1 | Name | `name` | Single line text | Required |
| 2 | Slug | `slug` | Slug | Required, template: `{name}` |
| 3 | Description | `description` | Single line text | - |
| 4 | Features | `features` | Single line text | Enable "Allow multiple values" |
| 5 | Response Time | `responseTime` | Single line text | e.g., "48 hours", "24 hours" |
| 6 | Availability | `availability` | Single line text | e.g., "Business hours", "24/7" |
| 7 | Support Channels | `supportChannels` | Single line text | e.g., "Email & tickets" |
| 8 | Highlighted | `highlighted` | Boolean | Turn on for "recommended" tier |
| 9 | Order | `order` | Integer | Controls display order (1, 2, 3) |
| 10 | Accent Color | `accentColor` | Color | Custom color for tier card |
| 11 | Price | `price` | Single line text | e.g., "Free", "$49/mo", "Custom" |
| 12 | Button Text | `buttonText` | Single line text | e.g., "Get Started Free" (default: "Contact Sales") |

**Note:** `accentColor` adds a colored top bar and styled checkmarks. The highlighted tier always uses the primary accent color.

---

## Step 3: Create the SLA Highlight Model

1. Click **+ Add** next to MODELS
2. Display Name: `Sla Highlight`
3. Click **Create Model**

### Add Fields

| # | Display Name | API ID (must match) | Type | Settings |
|---|--------------|---------------------|------|----------|
| 1 | Title | `title` | Single line text | Required |
| 2 | Description | `description` | Single line text | Required |
| 3 | Icon | `icon` | Single line text | - |
| 4 | Order | `order` | Integer | Controls display order |
| 5 | Stat Value | `statValue` | Single line text | e.g., "99.9%", "24/7", "<4hrs" |

**Note:** If `statValue` is set, it displays as a large prominent stat instead of an icon. Great for metrics like uptime percentages or response times.

---

## Step 4: Create the Helpful Resource Model (Optional)

This creates CMS-driven resource links that appear at the bottom of the Services page. If no resources exist, the section is hidden.

1. Click **+ Add** next to MODELS
2. Display Name: `Helpful Resource`
3. Click **Create Model**

### Add Fields

| # | Display Name | API ID (must match) | Type | Settings |
|---|--------------|---------------------|------|----------|
| 1 | Title | `title` | Single line text | Required |
| 2 | Description | `description` | Single line text | Required |
| 3 | Icon | `icon` | Single line text | - |
| 4 | URL | `url` | Single line text | Required. e.g., "/support/articles" or "https://..." |
| 5 | Color | `color` | Color | Accent color for hover effect |
| 6 | Order | `order` | Integer | Controls display order |

**Example entries:**
- Knowledge Base: `/support/articles`, icon: `BookOpenText`
- Submit Ticket: `/support/ticket`, icon: `ArrowRight`
- Discord Community: `https://discord.gg/yourserver`, icon: `Star`

---

## Step 5: Create the Services Page Content Model (Optional)

This lets you customize all the section titles and descriptions on the Services page without code changes. If not created, sensible defaults are used.

1. Click **+ Add** next to MODELS
2. Display Name: `Services Page Content`
3. Click **Create Model**

### Add Fields

| # | Display Name | API ID (must match) | Type | Settings |
|---|--------------|---------------------|------|----------|
| 1 | Hero Title | `heroTitle` | Single line text | e.g., "Discord Solutions That Scale" |
| 2 | Hero Subtitle | `heroSubtitle` | Multi line text | The description below the main title |
| 3 | Services Title | `servicesTitle` | Single line text | e.g., "What We Offer" |
| 4 | Services Subtitle | `servicesSubtitle` | Multi line text | Section description |
| 5 | SLA Title | `slaTitle` | Single line text | e.g., "Service Level Agreements" |
| 6 | SLA Subtitle | `slaSubtitle` | Multi line text | Section description |
| 7 | Resources Title | `resourcesTitle` | Single line text | e.g., "Helpful Resources" |
| 8 | Resources Subtitle | `resourcesSubtitle` | Single line text | Section description |
| 9 | CTA Title | `ctaTitle` | Single line text | e.g., "Ready to get started?" |
| 10 | CTA Subtitle | `ctaSubtitle` | Single line text | e.g., "Let's discuss how we can help..." |

**Note:** All fields are optional. If left empty, the website displays sensible defaults. Create only ONE entry for this model.

**Tip:** The hero title highlights the last two words with accent styling. For best results, structure your title so the last two words are impactful (e.g., "Solutions That **Scale Fast**").

---

## Step 6: Update Token Permissions

1. Go to **Project Settings** (bottom left)
2. Click **Access > Permanent Auth Tokens**
3. Find your token and add **Read** permission for:
   - Service
   - Service Tier
   - Sla Highlight
   - Helpful Resource (if you created it)
   - Services Page Content (if you created it)
4. Save changes

---

## Step 7: Add Sample Content

Go to **Content** in the sidebar and create entries for each model.

### Sample Service: Managed Bots

| Field | Value |
|-------|-------|
| Name | Managed Bots |
| Slug | (auto-fills) |
| Tagline | Let us handle everything |
| Description | Full-service bot hosting and management. We handle deployment, updates, monitoring, and support so you can focus on your community. |
| Icon | GearSix |
| Color | #10B981 |
| Order | 1 |
| Price Label | Starting at $49/mo |
| Button Text | View Plans |

**Features** (add one at a time, press Enter after each):
- 24/7 uptime monitoring
- Automatic updates & patches
- Custom configuration support
- Performance optimization
- Regular backups

Click **Publish** when done.

---

### Sample Service: Custom Development

| Field | Value |
|-------|-------|
| Name | Custom Development |
| Slug | (auto-fills) |
| Tagline | Built for your needs |
| Description | Bespoke Discord bot development tailored to your exact requirements. From moderation tools to game integrations, we build what you need. |
| Icon | Code |
| Color | #8B5CF6 |
| Order | 2 |
| Pricing | (leave empty for contact) |
| CTA Text | Start a Project |

**Features:**
- Requirements analysis
- Custom feature development
- Integration with external APIs
- Source code delivery
- Documentation included

Click **Publish** when done.

---

### Sample Service: Consulting

| Field | Value |
|-------|-------|
| Name | Consulting |
| Slug | (auto-fills) |
| Tagline | Expert guidance |
| Description | Strategic advice for your Discord community. Get expert guidance on bot selection, server setup, moderation strategies, and growth. |
| Icon | Handshake |
| Color | #F59E0B |
| Order | 3 |
| Pricing | From $150/hr |
| CTA Text | Book a Call |

**Features:**
- Server audit & review
- Bot recommendations
- Moderation best practices
- Growth strategies
- Security assessment

Click **Publish** when done.

---

### Sample Service Tiers

#### Tier 1: Community

| Field | Value |
|-------|-------|
| Name | Community |
| Description | Perfect for small servers getting started |
| Response Time | 48 hours |
| Availability | Business hours |
| Support Channels | Email & tickets |
| Highlighted | No |
| Order | 1 |
| Accent Color | (optional - leave empty or #10B981 for green) |
| Price | Free |
| CTA Text | Get Started Free |

**Features** (add one at a time, press Enter after each):
- Email support
- Knowledge base access
- Community forums

Click **Publish** when done.

---

#### Tier 2: Professional (Recommended)

| Field | Value |
|-------|-------|
| Name | Professional |
| Description | For growing communities that need more |
| Response Time | 24 hours |
| Availability | Extended hours |
| Support Channels | Email, tickets & chat |
| Highlighted | Yes |
| Order | 2 |
| Accent Color | (leave empty - highlighted tiers use primary accent) |
| Price | $99/mo |
| CTA Text | Get Started |

**Features** (add one at a time, press Enter after each):
- Priority email support
- Live chat support
- Dedicated account manager
- Monthly check-ins

Click **Publish** when done.

---

#### Tier 3: Enterprise

| Field | Value |
|-------|-------|
| Name | Enterprise |
| Description | Maximum support for large communities |
| Response Time | 4 hours |
| Availability | 24/7 |
| Support Channels | All channels + phone |
| Highlighted | No |
| Order | 3 |
| Accent Color | #8B5CF6 (purple - optional visual differentiation) |
| Price | Custom |
| CTA Text | Contact Sales |

**Features** (add one at a time, press Enter after each):
- 24/7 phone support
- Dedicated support team
- Custom SLA terms
- Quarterly business reviews
- On-call emergency support

Click **Publish** when done.

---

### Sample SLA Highlights

Create 3-5 highlights that appear above the pricing tiers. Create each as a separate entry:

| Title | Description | Icon | Value | Order |
|-------|-------------|------|-------|-------|
| Fast Response | Quick turnaround on all requests | Clock | <4hrs | 1 |
| Uptime | Reliable service guaranteed | Shield | 99.9% | 2 |
| Secure | Enterprise-grade security | Lock | (empty) | 3 |
| Scalable | Grows with your community | ChartLine | (empty) | 4 |
| Dedicated Support | Real humans, real help | Headset | 24/7 | 5 |

**Tip:** When `value` is set (like "99.9%" or "24/7"), it displays as a large prominent number instead of an icon. Leave `value` empty to show the icon instead.

Click **Publish** on each highlight when done.

---

## Available Icons

Use these exact names in Icon fields:

**General:**
`Wrench`, `GearSix`, `Gear`, `Lightning`, `Rocket`, `Target`

**People & Support:**
`Users`, `User`, `Headset`, `ChatCircleDots`, `Handshake`, `Phone`

**Security & Trust:**
`Shield`, `Lock`, `CheckCircle`

**Business:**
`Code`, `CreditCard`, `ChartLine`, `Database`, `Globe`

**Communication:**
`EnvelopeSimple`, `Question`, `FileText`, `Heart`, `Plug`, `Clock`

---

## Color Suggestions

Use hex color codes for the Color field:

| Color | Hex Code | Good For |
|-------|----------|----------|
| Green | #10B981 | Success, growth, managed services |
| Purple | #8B5CF6 | Premium, development, creative |
| Orange | #F59E0B | Attention, consulting, warnings |
| Blue | #3B82F6 | Trust, professional, integrations |
| Red | #EF4444 | Urgent, important, alerts |
| Pink | #EC4899 | Community, social, engagement |
| Cyan | #06B6D4 | Technical, modern, analytics |

---

## Testing Your Services Page

1. Make sure all content is **Published** (not Draft)
2. Visit your website at `/support/services`
3. Verify:
   - All services appear with correct icons and colors
   - Service tiers display in order with the highlighted tier marked
   - SLA highlights appear above the tiers
   - "Contact Us" buttons open the contact modal
   - Services link appears in the Support Hub quick actions

---

## Removing the Services Page

To hide the Services page:

1. Go to **Content > Service** in Hygraph
2. Either:
   - **Unpublish** all services (keeps data, hides page)
   - **Delete** all services (removes data completely)

The Services page and link will automatically disappear from your website.

---

## Troubleshooting

### Services page shows 404

**Possible causes:**
- Content not published - Go to Content, find your entries, click **Publish**
- Token missing permissions - Add **Read** permission for Service, ServiceTier, and SlaHighlight
- No services created - Create at least one Service entry

### Service Tiers not showing

**Most common cause:** Field API IDs don't match expected values.

Check these fields in your ServiceTier model:
- `responseTime` (not `response_time` or `ResponseTime`)
- `supportChannels` (not `support_channels`)
- `highlighted` (not `isHighlighted`)

To fix: Go to Schema > Service Tier, click on the field, and check/edit the API ID.

### "Our Services" link not appearing in Support Hub

The link only appears when services exist. Make sure:
1. At least one Service entry exists
2. The Service entry is **Published** (not Draft)
3. Your token has **Read** permission for Service

### Icons not displaying correctly

Make sure you're using exact icon names from the Available Icons list. Common mistakes:
- `Gearsix` should be `GearSix` (capital S)
- `clock` should be `Clock` (capital C)
- `check` should be `CheckCircle`

### Colors not applying

Use hex color codes with the `#` symbol:
- Correct: `#10B981`
- Wrong: `10B981` or `green`

---

## Need Help?

- [Hygraph Documentation](https://hygraph.com/docs)
- [Main Setup Guide](./CLIENT_HYGRAPH_SETUP.md)
