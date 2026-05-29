# Build Plan — 5 "Itivedam+" Features (Superior + Fully Backend-Controlled)

Har feature ka rule (non-negotiable):
1. **Backend se fully customizable** (text, colors, icons, behavior — sab editable).
2. **Master ON/OFF toggle** har feature ke liye (ek click me poora feature site se hide).
3. **Granular permissions** — har feature ke liye `feature.view` + `feature.edit` + `feature.toggle` codes seed honge, taaki super_admin kisi bhi backend user ko sirf wo feature de/le sake.
4. **Lite-mode friendly** — koi feature 2G par bhi smooth chale; heavy assets lazy.
5. **No copy-paste** — superior version banayenge (extra config knobs, multi-variant support, A/B ready jaha possible).
6. **Mobile-first responsive** — sab kuch viewport-aware.

---

## Feature 1 — Header WhatsApp Icon (Smart, Multi-Number)

**Unke paas:** Single static WhatsApp icon top-right.
**Hamara superior version:**
- **Multiple WhatsApp numbers** support (Sales / Support / Wholesale) — dropdown agar >1, single icon agar 1.
- Per-number: label, prefilled message template (with `{page}`, `{product}` placeholders), business hours, fallback message agar offline.
- **Position config**: header-right / header-left / before-cart-icon.
- **Icon style**: filled / outline / brand-green / custom color + custom SVG upload.
- **Show on**: All pages / specific pages (re-use `page-keys`).
- **Hide on mobile / desktop** toggle (kyunki mobile pe already `WhatsAppFloat` hai).
- **Click tracking** → analytics event.

**Backend tab:** new `WhatsAppChannelsTab` (under Marketing/Communications).
**Permissions:** `whatsapp_channels.view`, `whatsapp_channels.edit`, `whatsapp_channels.toggle`.

---

## Feature 2 — Multi-Pack / Duration Variant Selector (Pro)

**Unke paas:** 1/2/3 Month cards with single badge.
**Hamara superior version:**
- Already variants hain — upar **"Pack Picker UI Mode"** add karna: `dropdown` (current) / `radio-cards` (new pro) / `tabs`.
- Per-variant admin fields (already partial): **badge text**, **badge color**, **badge icon**, **strike-through "MRP"**, **"You Save ₹X (Y%)"** auto-compute, **"Per day cost" auto-calc** (₹/day for X-month pack).
- **Highlight one variant** as "Recommended" with glow ring + animated chip.
- **Stock-aware**: out-of-stock pack greyed + "Notify Me" inline.
- **Per-pack offer line** (e.g. "+ Free Shaker") — editable rich text.
- Master ON/OFF: agar off → fallback to existing simple variant dropdown.

**Backend:** extend `VariantsManager.tsx` with new "Display Mode" + per-variant badge/highlight fields.
**Permissions:** `products.variants_pro.edit`, `products.variants_pro.toggle`.

---

## Feature 3 — PDP Urgency Stack (Configurable, Honest)

**Unke paas:** Hardcoded "🔥 18 pieces left" + red bar.
**Hamara superior version (NO fake urgency — real data):**
- **Low-stock widget**: shows only when `stock_count <= threshold`. Admin sets threshold per product or global default.
- **Recent purchase ticker**: "12 people bought this in last 24h" — pulls from real `orders` table (last 24h count). Admin can set min-threshold to show (e.g. show only if >5).
- **Live viewers** (optional, real via supabase realtime presence channel — opt-in).
- **Cart urgency**: "X added to cart in last hour".
- **Per widget**: ON/OFF, icon, color, text template with placeholders (`{count}`, `{hours}`), animation style (pulse / shake / none / fade).
- **Per-product override**: disable on specific products (e.g. evergreen items).
- Master ON/OFF for entire urgency stack.

**Backend tab:** new `UrgencyWidgetsTab` (under Marketing).
**Permissions:** `urgency.view`, `urgency.edit`, `urgency.toggle`.

---

## Feature 4 — Mega Menu (3-Level, Drag-Reorder, Rich)

**Unke paas:** 3-level cat → sub-cat → product flat list.
**Hamara superior version:**
- Already `NavigationTab` hai — extend to **mega-menu mode** per top-level item.
- Per top-level: choose **layout** (simple-dropdown / mega-grid-2col / mega-grid-3col / mega-grid-4col / featured-panel).
- Each column: title + list of links (categories, sub-categories, custom pages, products, external URLs).
- **Featured panel**: image + heading + CTA button + link (right side of mega menu).
- **Promo banners** inside mega menu (e.g. "Up to 50% off — Shop Now").
- **Drag-reorder** columns and items.
- **Icons per item** (lucide picker or custom upload).
- **Mobile**: auto-converts to accordion drawer.
- Per top-level: ON/OFF, "show on hover" vs "click only".

**Backend:** extend `NavigationTab.tsx` with MegaMenu builder.
**Permissions:** existing `navigation.edit` + new `navigation.megamenu.edit`, `navigation.megamenu.toggle`.

---

## Feature 5 — Express UPI "BUY NOW" in Cart Drawer (Quick Checkout)

**Unke paas:** Single static UPI quick button.
**Hamara superior version:**
- In cart drawer + cart page: **"Quick Pay" section** above normal checkout button.
- Buttons: **UPI Apps intent** (GPay / PhonePe / Paytm / BHIM) — uses Razorpay UPI Intent / PhonePe SDK already integrated.
- **Express checkout flow**: if user has 1 saved address → skip address step → direct payment.
- **Per-method**: ON/OFF, icon, label, sort order, min/max order amount eligibility, COD-eligibility check.
- **Smart default**: detects last-used method per user and pre-highlights.
- **Fail-safe**: if UPI intent fails on desktop → graceful fallback to normal checkout.
- **A/B ready**: admin can toggle "Quick Pay first" vs "Normal checkout first".
- Master ON/OFF.

**Backend tab:** new `QuickCheckoutTab` (under Payments).
**Permissions:** `quick_checkout.view`, `quick_checkout.edit`, `quick_checkout.toggle`.

---

## Cross-Cutting Work (har feature pe apply)

### Database
- Naya table: `feature_flags` (key, enabled, config jsonb, updated_by, updated_at) — single source of truth for master ON/OFF + global config per feature.
- Feature-specific tables jaha zarurat:
  - `whatsapp_channels` (id, label, number, message_template, hours, position, icon, color, show_on_pages, sort_order, enabled)
  - `urgency_widgets` (id, type, config jsonb, enabled, exclude_product_ids)
  - `quick_checkout_methods` (id, provider, label, icon, sort_order, min_order, max_order, cod_eligible, enabled)
  - Mega menu → extend existing `navigation` jsonb.
  - Variant pro fields → extend `product_variants` jsonb config column.

### Permissions Seed (new codes)
```
whatsapp_channels.view / .edit / .toggle
products.variants_pro.edit / .toggle
urgency.view / .edit / .toggle
navigation.megamenu.edit / .toggle
quick_checkout.view / .edit / .toggle
feature_flags.manage   ← master toggle control (super_admin + selected users)
```
All seeded into `permissions` table + `role_default_permissions` (admin = granted, moderator = view-only, customer = none). Auto-show in `UserPermissionsPanel` (existing UI auto-renders new codes).

### Frontend Gating
- `<FeatureFlag flag="whatsapp_header">...</FeatureFlag>` wrapper component reading from a cached `useFeatureFlags()` hook (single query, 5-min cache).
- Each feature component checks its flag before rendering — zero JS shipped if off (lazy-loaded).

### Tab Permissions
- Update `src/pages/admin/tab-permissions.ts` with 5 new tabs.
- Update `AdminPage.tsx` sidebar with new tab entries (under correct categories).

### Lite-mode
- All 5 features respect `navigator.connection.saveData` and skip animations/realtime/heavy assets accordingly.

---

## Build Order (suggested)

1. **Migration** — create `feature_flags` + per-feature tables, seed permissions, seed default flags = OFF (safe rollout).
2. **`useFeatureFlags` hook + `<FeatureFlag>` component + `featureFlags.functions.ts`** (CRUD).
3. **Feature 1: WhatsApp Channels** (smallest, validates pattern).
4. **Feature 3: Urgency Widgets** (most reusable infra).
5. **Feature 2: Variants Pro UI** (extends existing).
6. **Feature 5: Quick Checkout** (touches cart drawer + checkout).
7. **Feature 4: Mega Menu** (largest UI build).
8. **Verification pass** — har feature ka ON/OFF test, permission gate test, mobile responsive test.

---

## Out of scope (not in this plan)
- Marketplace logos footer (small, can add anytime — 5 min)
- Empty cart upsell (separate request)
- Hindi infographics on PDP images (content task, not code)
- Rating-count filter (small enhancement to existing filter)

---

**Bhai bata — yeh order theek hai ya kisi feature ko pehle banau? Ya saare 5 ek saath ek-ek karke chalu kar du?**
