# Hygraph Services Schema Update

This guide adds new fields to your existing Services schema for enhanced UI features.

**Prerequisite:** You should already have Service, Service Tier, and SLA Highlight models from the [Services Setup Guide](./CLIENT_HYGRAPH_SERVICES.md).

---

## New Fields Overview

| Model                 | New Field                            | Purpose                                    |
| --------------------- | ------------------------------------ | ------------------------------------------ |
| Service               | `priceLabel`, `buttonText`           | Price badges, custom button text           |
| Service Tier          | `accentColor`, `price`, `buttonText` | Visual differentiation, pricing display    |
| SLA Highlight         | `statValue`                          | Large stat display (e.g., "99.9%")         |
| Helpful Resource      | (new model)                          | CMS-driven resource links                  |
| Services Page Content | (new model)                          | Customizable section titles/descriptions   |
| Contact Settings      | (new model)                          | Customize contact form labels and messages |
| Inquiry Type          | (new model)                          | CMS-driven inquiry type options            |
| Footer Settings       | (new model)                          | Footer branding and legal links            |
| Footer Link           | (new model)                          | Dynamic footer navigation links            |
| Header Settings       | (new model)                          | Navbar branding (name, subtitle, logo)     |
| Nav Link              | (new model)                          | Dynamic navbar navigation links            |

---

## Step 1: Update Service Model

Go to **Schema > Service** and add these fields:

| Display Name | API ID       | Type             | Notes                                       |
| ------------ | ------------ | ---------------- | ------------------------------------------- |
| Price Label  | `priceLabel` | Single line text | e.g., "Starting at $49/mo"                  |
| Button Text  | `buttonText` | Single line text | e.g., "View Plans" (default: "Get Started") |

**Behavior:**

- `priceLabel` empty = no price badge shown
- `buttonText` empty = button shows "Get Started"

---

## Step 2: Update Service Tier Model

Go to **Schema > Service Tier** and add these fields:

| Display Name | API ID        | Type             | Notes                                               |
| ------------ | ------------- | ---------------- | --------------------------------------------------- |
| Accent Color | `accentColor` | Color            | Custom color for tier card                          |
| Price        | `price`       | Single line text | e.g., "Free", "$99/mo", "Custom"                    |
| Button Text  | `buttonText`  | Single line text | e.g., "Get Started Free" (default: "Contact Sales") |

**Behavior:**

- `accentColor` adds a colored top bar and styled checkmarks
- Highlighted tier always uses primary accent (ignores accentColor)
- `price` displays prominently below tier name

---

## Step 3: Update SLA Highlight Model

Go to **Schema > Sla Highlight** and add this field:

| Display Name | API ID      | Type             | Notes                          |
| ------------ | ----------- | ---------------- | ------------------------------ |
| Stat Value   | `statValue` | Single line text | e.g., "99.9%", "24/7", "<4hrs" |

**Behavior:**

- `statValue` set = displays as large prominent stat (no icon)
- `statValue` empty = displays icon as before

**Examples:**

| Title    | Stat Value | Result                      |
| -------- | ---------- | --------------------------- |
| Uptime   | 99.9%      | Shows "99.9%" as large text |
| Response | <4hrs      | Shows "<4hrs" as large text |
| Secure   | (empty)    | Shows Lock icon             |

---

## Step 4: Create Helpful Resource Model (Optional)

This creates a CMS-driven "Helpful Resources" section. If no entries exist, the section is hidden.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Helpful Resource`
4. Click **Add Model**

### Add Fields

| #   | Display Name | API ID        | Type             | Notes                          |
| --- | ------------ | ------------- | ---------------- | ------------------------------ |
| 1   | Title        | `title`       | Single line text | Required                       |
| 2   | Description  | `description` | Single line text | Required                       |
| 3   | Icon         | `icon`        | Single line text | e.g., "BookOpenText"           |
| 4   | URL          | `url`         | Single line text | Required. Internal or external |
| 5   | Color        | `color`       | Color            | Hover accent color             |
| 6   | Order        | `order`       | Integer          | Display order                  |

### Sample Entries

| Title          | Description       | Icon         | URL                    | Color   |
| -------------- | ----------------- | ------------ | ---------------------- | ------- |
| Knowledge Base | Browse all guides | BookOpenText | /support/articles      | #5865F2 |
| Submit Ticket  | Get support       | ArrowRight   | /support/ticket        | #F59E0B |
| Discord        | Join community    | Star         | https://discord.gg/xxx | #5865F2 |

---

## Step 5: Create Services Page Content Model (Optional)

This model lets you customize all section titles and descriptions on the Services page. If not created, sensible defaults are used.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Services Page Content`
4. Click **Add Model**

### Add Fields

| #   | Display Name       | API ID              | Type             | Notes                                    |
| --- | ------------------ | ------------------- | ---------------- | ---------------------------------------- |
| 1   | Hero Title         | `heroTitle`         | Single line text | e.g., "Discord Solutions That Scale"     |
| 2   | Hero Subtitle      | `heroSubtitle`      | Multi line text  | Description below the main title         |
| 3   | Services Title     | `servicesTitle`     | Single line text | e.g., "What We Offer"                    |
| 4   | Services Subtitle  | `servicesSubtitle`  | Multi line text  | Section description                      |
| 5   | SLA Title          | `slaTitle`          | Single line text | e.g., "Service Level Agreements"         |
| 6   | SLA Subtitle       | `slaSubtitle`       | Multi line text  | Section description                      |
| 7   | Resources Title    | `resourcesTitle`    | Single line text | e.g., "Helpful Resources"                |
| 8   | Resources Subtitle | `resourcesSubtitle` | Single line text | Section description                      |
| 9   | CTA Title          | `ctaTitle`          | Single line text | e.g., "Ready to get started?"            |
| 10  | CTA Subtitle       | `ctaSubtitle`       | Single line text | e.g., "Let's discuss how we can help..." |

**Note:** All fields optional. Create only ONE entry. Empty fields use defaults.

**Tip:** The hero title highlights the last two words with accent color. Structure your title so the last two words are impactful.

### Sample Entry

```
Hero Title: "Premium Discord Services"
Hero Subtitle: "From bot development to server management, we deliver enterprise-grade solutions for communities of all sizes."

Services Title: "Our Services"
Services Subtitle: "Explore our comprehensive range of Discord solutions tailored to your needs."

SLA Title: "Our Commitments"
SLA Subtitle: "Reliable service backed by clear guarantees and dedicated support."

Resources Title: "Need More Help?"
Resources Subtitle: "Browse our guides and documentation."

CTA Title: "Let's Build Something Great"
CTA Subtitle: "Contact us today to discuss your Discord project."
```

---

## Step 6: Create Contact Settings Model (Optional)

This model lets you customize the contact form in the modal. If not created, sensible defaults are used.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Contact Settings`
4. Click **Add Model**

### Add Fields

| #   | Display Name              | API ID                    | Type             | Notes                                             |
| --- | ------------------------- | ------------------------- | ---------------- | ------------------------------------------------- |
| 1   | Form Title                | `formTitle`               | Single line text | Modal header, e.g., "Contact Us"                  |
| 2   | Form Subtitle             | `formSubtitle`            | Single line text | e.g., "Tell us about your needs..."               |
| 3   | Company Field Label       | `companyFieldLabel`       | Single line text | e.g., "Company", "Discord Server", "Organization" |
| 4   | Company Field Placeholder | `companyFieldPlaceholder` | Single line text | e.g., "Enter your company name"                   |
| 5   | Success Title             | `successTitle`            | Single line text | e.g., "Thank You!"                                |
| 6   | Success Message           | `successMessage`          | Multi line text  | Message shown after form submission               |
| 7   | Submit Button Text        | `submitButtonText`        | Single line text | e.g., "Send Message"                              |

**Note:** All fields optional. Create only ONE entry. Empty fields use defaults.

### Sample Entry

```
Form Title: "Get in Touch"
Form Subtitle: "Fill out the form below and our team will respond within 24 hours."

Company Field Label: "Discord Server Name"
Company Field Placeholder: "e.g., My Community Server"

Success Title: "Message Sent!"
Success Message: "Thank you for your inquiry! Our team will contact you within 1-2 business days."

Submit Button Text: "Send Message"
```

---

## Step 7: Create Inquiry Type Model (Optional)

This model lets you customize the inquiry type options in the contact form.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Inquiry Type`
4. Click **Add Model**

### Add Fields

| #   | Display Name | API ID   | Type             | Notes                                                    |
| --- | ------------ | -------- | ---------------- | -------------------------------------------------------- |
| 1   | Type ID      | `typeId` | Single line text | Required. Unique identifier (e.g., "general", "pricing") |
| 2   | Label        | `label`  | Single line text | Required. Display text shown to user                     |
| 3   | Order        | `order`  | Integer          | Display order (lower = first)                            |

### Sample Entries

| Type ID | Label               | Order |
| ------- | ------------------- | ----- |
| general | General Inquiry     | 1     |
| pricing | Pricing Information | 2     |
| demo    | Request a Demo      | 3     |
| support | Support Question    | 4     |

**Behavior:**

- The first inquiry type (by order) is selected by default
- If no inquiry types are configured, defaults are used
- Keep to 4 or fewer types for best UI appearance (2x2 grid)

---

## Step 8: Create Footer Settings Model (Optional)

This model lets you customize the footer branding and links across all pages. If not created, sensible defaults are used.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Footer Settings`
4. Click **Add Model**

### Add Fields

| #   | Display Name         | API ID              | Type             | Notes                                    |
| --- | -------------------- | ------------------- | ---------------- | ---------------------------------------- |
| 1   | Site Name            | `siteName`          | Single line text | e.g., "Support Portal"                   |
| 2   | Tagline              | `tagline`           | Single line text | Text below logo                          |
| 3   | Logo Icon            | `logoIcon`          | Asset (Image)    | Optional custom icon                     |
| 4   | Quick Links Title    | `quickLinksTitle`   | Single line text | Default: "Quick Links"                   |
| 5   | Resources Title      | `resourcesTitle`    | Single line text | Default: "Resources"                     |
| 6   | Community Title      | `communityTitle`    | Single line text | Default: "Community"                     |
| 7   | Copyright Text       | `copyrightText`     | Single line text | e.g., "Support Portal" (year auto-added) |
| 8   | Privacy Policy URL   | `privacyPolicyUrl`  | Single line text | Internal path or external URL            |
| 9   | Terms of Service URL | `termsOfServiceUrl` | Single line text | Internal path or external URL            |

**Note:** All fields optional. Create only ONE entry. Empty fields use defaults.

### Sample Entry

```
Site Name: "My Discord Hub"
Tagline: "Premium Discord solutions for growing communities."

Quick Links Title: "Quick Links"
Resources Title: "Resources"
Community Title: "Connect"

Copyright Text: "My Discord Hub"
Privacy Policy URL: "/privacy"
Terms of Service URL: "/terms"
```

---

## Step 9: Create Footer Link Model (Optional)

This model lets you customize the footer links dynamically. Links are organized into three sections.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Footer Link`
4. Click **Add Model**

### Add Fields

| #   | Display Name | API ID     | Type             | Notes                                   |
| --- | ------------ | ---------- | ---------------- | --------------------------------------- |
| 1   | Title        | `title`    | Single line text | Required. Link text                     |
| 2   | URL          | `url`      | Single line text | Required. Internal path or external URL |
| 3   | Icon         | `icon`     | Single line text | Optional. Phosphor icon name            |
| 4   | External     | `external` | Boolean          | Shows arrow icon if true                |
| 5   | Section      | `section`  | Enumeration      | Which column to display in              |
| 6   | Order        | `order`    | Integer          | Display order within section            |

### Create Section Enumeration

For the **Section** field:

1. Field type: **Enumeration**
2. Add values:
   - `quickLinks` (Display name: "Quick Links")
   - `resources` (Display name: "Resources")
   - `community` (Display name: "Community")

### Sample Entries

| Title          | URL                      | External | Section    | Order |
| -------------- | ------------------------ | -------- | ---------- | ----- |
| Support Hub    | /support                 | false    | quickLinks | 1     |
| Knowledge Base | /support/articles        | false    | quickLinks | 2     |
| Submit Ticket  | /support/ticket          | false    | quickLinks | 3     |
| Documentation  | https://docs.example.com | true     | resources  | 1     |
| Discord Server | https://discord.gg/xxx   | true     | community  | 1     |
| Twitter        | https://twitter.com/xxx  | true     | community  | 2     |
| GitHub         | https://github.com/xxx   | true     | community  | 3     |

**Behavior:**

- Max 5 links per section recommended for best appearance
- External links automatically show an arrow icon
- Sections with no links are hidden
- If no footer links are configured, defaults are used

---

## Step 10: Create Header Settings Model (Optional)

This model lets you customize the navbar branding. If not created, sensible defaults are used.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Header Setting`
4. Click **Add Model**

### Add Fields

| #   | Display Name | API ID     | Type             | Notes                  |
| --- | ------------ | ---------- | ---------------- | ---------------------- |
| 1   | Site Name    | `siteName` | Single line text | e.g., "Support Portal" |
| 2   | Subtitle     | `subtitle` | Single line text | e.g., "Help Center"    |
| 3   | Logo Icon    | `logoIcon` | Asset (Image)    | Optional custom logo   |

**Note:** All fields optional. Create only ONE entry. Empty fields use defaults.

### Sample Entry

```
Site Name: "My Discord Hub"
Subtitle: "Premium Support"
Logo Icon: (upload your logo image)
```

---

## Step 11: Create Nav Link Model (Optional)

This model lets you customize the navbar navigation links dynamically.

1. Go to **Schema**
2. Click **+ Add** next to MODELS
3. Display Name: `Nav Link`
4. Click **Add Model**

### Add Fields

| #   | Display Name | API ID  | Type             | Notes                                      |
| --- | ------------ | ------- | ---------------- | ------------------------------------------ |
| 1   | Title        | `title` | Single line text | Required. Link text                        |
| 2   | URL          | `url`   | Single line text | Required. Internal path (e.g., "/support") |
| 3   | Icon         | `icon`  | Single line text | Phosphor icon name (see list below)        |
| 4   | Order        | `order` | Integer          | Display order (lower = first)              |

### Available Icons

Use these exact names in the Icon field:

- `House` - Home icon
- `BookOpenText` - Articles/documentation
- `Briefcase` - Services/business
- `PaperPlaneTilt` - Submit/send
- `Gear` - Settings
- `Question` - Help/FAQ
- `ChatCircle` - Chat/messages
- `Envelope` - Email/contact
- `Users` - Team/community
- `Star` - Featured/favorites
- `Shield` - Security
- `Code` - Developer/API
- `Wrench` - Tools/settings
- `Article` - Blog/news

### Sample Entries

| Title         | URL               | Icon           | Order |
| ------------- | ----------------- | -------------- | ----- |
| Support Hub   | /support          | House          | 1     |
| Articles      | /support/articles | BookOpenText   | 2     |
| Services      | /support/services | Briefcase      | 3     |
| Submit Ticket | /support/ticket   | PaperPlaneTilt | 4     |

**Behavior:**

- Max 4-5 links recommended for best navbar appearance
- If no nav links are configured, defaults are used
- Icons are optional but recommended for visual consistency

---

## Step 12: Update Token Permissions

If you created new models:

1. Go to **Project Settings > Access > Permanent Auth Tokens**
2. Find your token
3. Add **Read** permission for:
   - Helpful Resource (if created)
   - Services Page Content (if created)
   - Contact Settings (if created)
   - Inquiry Type (if created)
   - Footer Settings (if created)
   - Footer Link (if created)
   - Header Settings (if created)
   - Nav Link (if created)
4. Save

---

## Update Your Content

After adding the fields, update your existing content:

### Services

```
Managed Bots:
  - Price Label: "Starting at $49/mo"
  - Button Text: "View Plans"

Custom Development:
  - Price Label: (leave empty)
  - Button Text: "Start a Project"

Consulting:
  - Price Label: "From $150/hr"
  - Button Text: "Book a Call"
```

### Service Tiers

```
Community:
  - Price: "Free"
  - Button Text: "Get Started Free"
  - Accent Color: #10B981 (green)

Professional:
  - Price: "$99/mo"
  - Button Text: "Get Started"
  - Accent Color: (leave empty - uses primary)

Enterprise:
  - Price: "Custom"
  - Button Text: "Contact Sales"
  - Accent Color: #8B5CF6 (purple)
```

### SLA Highlights

```
Fast Response:
  - Stat Value: "<4hrs"

Uptime:
  - Stat Value: "99.9%"

Secure:
  - Stat Value: (empty - shows icon)

Dedicated Support:
  - Stat Value: "24/7"
```

---

## That's It!

Your site will now show:

- Price badges on service cards
- Custom CTA button text
- Large stats in SLA section
- Colored tier cards with pricing
- CMS-driven resource links (if configured)
- Custom section titles and descriptions (if configured)
- Customized contact form labels and messages (if configured)
- CMS-driven inquiry type options (if configured)
- Custom footer branding and links (if configured)
- Custom navbar branding and navigation (if configured)

No code changes needed - just publish your updated content!
