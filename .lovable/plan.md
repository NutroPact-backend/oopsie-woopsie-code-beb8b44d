
# Audit Repair Plan — Round 2

Pichli baar `coupons.functions.ts` aur migration `20260622115855` already ban chuke hain (audit reports old snapshot pe based the). Yeh real baki issues hain jo ab fix karne hain — priority order me.

## P0 — Critical (DB + XSS)

### 1. XSS sanitization on category name (C-02)
- `src/routes/category.$slug.tsx` aur `src/lib/categories.functions.ts`: category `name`, `description` ko render karte time HTML escape karo. JSON-LD me bhi escape.
- Same audit `src/routes/p.$slug.tsx`, `products.$slug.tsx` ke head() data for unescaped fields.

### 2. Production DB cleanup (C-03)
- Migration: DELETE `categories` jin ke slug match `fxss-%`, `flng-%`, `audit-%`, `depval-%`, `dv-%` (test data).
- DELETE products jaha `price < 0` (negative-price test product).
- DELETE empty/test `product_questions`, `product_reviews` rows linked to deleted categories/products.

## P1 — RLS Hygiene

### 3. Drop orphaned policies
Single migration jo drop kare:
- `categories_public_read`, `categories_admin_write`
- `products_public_read`
- `site_settings_public_read`
- `site_events anon insert`

### 4. Tighten `categories_read` + `products_read`
- Replace `USING (true)` with `USING (active = true OR is_admin(auth.uid()))` for both tables.

### 5. `site_settings` secret exposure
- Replace `ss_read` (public) with policy that excludes sensitive keys. Simplest: change to admin-only read, then move public-needed keys (brand name, footer text) into a new `public_site_settings` view OR mark sensitive keys and create a SELECT policy `key NOT IN (sensitive set)`.
- Practical fix: keep `ss_read` to authenticated but filter via policy `key NOT LIKE '%_token%' AND key NOT LIKE '%_secret%' AND key NOT LIKE '%_api_key%'`.

## P2 — Missing security wiring

### 6. Turnstile on contact form (H-02)
- Add `TurnstileWidget` in `src/pages/ContactPage.tsx`.
- Create `submitContact` server function (`src/lib/contact.functions.ts` already exists — extend) that calls `verifyTurnstileToken` before insert.
- Wire CartPage / Coupon validate similarly if cheap.

### 7. Rate-limit wiring (H-03)
- GRANT EXECUTE on `check_rate_limit()` to `authenticated, anon`.
- Call from `validateCoupon` server fn (per-user, 30/min) and from `submitContact` (per-IP, 5/hour).

## P3 — Config hygiene

### 8. Missing permission entries
- `src/pages/admin/tab-permissions.ts`: add `sizecharts: "products.view"`, `videosections: "content.edit"`.

### 9. Dead code cleanup
- Delete `src/lib/api/example.functions.ts`.

## Out of scope (defer)
- Refactoring 13 "direct supabase" admin tabs to server functions — multi-day effort, no immediate exploit since admin RLS already gates them.
- CSP `unsafe-inline` — required by app.

## Order of execution
1. Single DB migration covering: data cleanup (#2), orphan-drop (#3), policy tighten (#4), site_settings restrict (#5), grant rate_limit (#7a).
2. Code edits in parallel: XSS escape (#1), Turnstile (#6), validateCoupon rate-limit call (#7b), permissions (#8), delete dead file (#9).
3. Verify build.
