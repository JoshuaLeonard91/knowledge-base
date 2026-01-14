# Hygraph Services Page Setup

This guide walks you through creating the optional Services page models in Hygraph. Complete this only if you want a Services page on your website.

**Prerequisite:** Complete the main [Hygraph Setup Guide](./CLIENT_HYGRAPH_SETUP.md) first.

---

## What You'll Create

- **Services** - Your service offerings (e.g., Managed Bots, Consulting)
- **Service Tiers** - Pricing/support levels (e.g., Community, Professional, Enterprise)
- **SLA Highlights** - Key benefits displayed above pricing tiers

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

---

## Step 4: Update Token Permissions

1. Go to **Project Settings** (bottom left)
2. Click **Access > Permanent Auth Tokens**
3. Find your token and add **Read** permission for:
   - Service
   - Service Tier
   - Sla Highlight
4. Save changes

---

## Step 5: Add Sample Content

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

| Title | Description | Icon | Order |
|-------|-------------|------|-------|
| Fast Response | Quick turnaround on all requests | Clock | 1 |
| 99.9% Uptime | Reliable service guaranteed | Shield | 2 |
| Secure | Enterprise-grade security | Lock | 3 |
| Scalable | Grows with your community | ChartLine | 4 |
| Dedicated Support | Real humans, real help | Headset | 5 |

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
