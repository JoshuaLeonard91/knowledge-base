# Hygraph Services Schema Update

This guide adds new fields to your existing Services schema for enhanced UI features.

**Prerequisite:** You should already have Service, Service Tier, and SLA Highlight models from the [Services Setup Guide](./CLIENT_HYGRAPH_SERVICES.md).

---

## New Fields Overview

| Model            | New Field                            | Purpose                                 |
| ---------------- | ------------------------------------ | --------------------------------------- |
| Service          | `priceLabel`, `buttonText`           | Price badges, custom button text        |
| Service Tier     | `accentColor`, `price`, `buttonText` | Visual differentiation, pricing display |
| SLA Highlight    | `statValue`                          | Large stat display (e.g., "99.9%")      |
| Helpful Resource | (new model)                          | CMS-driven resource links               |

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

## Step 5: Update Token Permissions

If you created the Helpful Resource model:

1. Go to **Project Settings > Access > Permanent Auth Tokens**
2. Find your token
3. Add **Read** permission for **Helpful Resource**
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

Your Services page will now show:

- Price badges on service cards
- Custom CTA button text
- Large stats in SLA section
- Colored tier cards with pricing
- CMS-driven resource links (if configured)

No code changes needed - just publish your updated content!
