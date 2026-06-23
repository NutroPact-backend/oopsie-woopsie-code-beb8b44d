# Phase 2 — P1 Hardening Plan (revised: nothing removed)

**Guiding principle:** Har item me feature/option pehle jaisa hi rahega. Sirf **harden** karna hai — secrets browser tak na jaaye, endpoints pe auth/rate-limit add ho, races close ho, RLS ke saath server-fn double-defence ho. Koi tab, koi field, koi capability **delete nahi hogi**.

---

## Group A — Secret leak hardening (zero feature change)

### A-1 Payment gateway secrets (Razorpay/PhonePe/PayU/Stripe)
- **Backend me secrets waise hi rahenge** — `admin_secrets`/`site_settings` me store, server functions me use.
- Admin UI (`PaymentGatewaysTab.tsx`) me sirf 2 chhote change:
  1. Edit form load karte time secret fields ko masked placeholder (`••••••••••••`) se fill karna — actual value browser tak na bheje.
  2. Save ke time: agar field empty/unchanged hai → backend purani value rakhe; agar user ne nayi value type ki tabhi update ho.
- Active/Deactivate toggle, gateway switch, test/live mode — sab waise hi chalega.
- **Server fn:** new `getMaskedGatewayConfig` (returns non-secret fields + `hasSecret: true/false`), existing `updateGatewayConfig` me "skip if blank" logic.

### A-2 LinkedIn/Pinterest/Twitter/Reddit/Quora pixel IDs
- Pixels active rahenge — sirf fire timing fix:
- `__root.tsx` me consent-gated init: `consent === "granted"` ke baad hi pixel script load ho. Pehle se gated GA/FB ki tarah.
- Cookie banner se opt-in karte hi pixels start ho jayenge.

### A-3 Internal `trackVisit()` / `trackSiteEvent()` consent gating
- Tracking band nahi — sirf consent ke baad fire ho (GDPR compliance ke liye).
- Default state `denied`, banner accept ke baad `granted`.

---

## Group B — Auth & rate-limit on existing endpoints (no removal)

### B-1 Invoice & order-tracking endpoints
- `/orders/:id/invoice` aur `/orders/:id/tracking` pe auth check add karna: ya to logged-in owner, ya signed time-limited token (jo email/SMS me bhejte hain).
- Endpoint khud rahega, UI flow same — bas guest randomly invoice nahi dekh sakega.

### B-2 Order creation rate-limit
- Pehle se mojud `rateLimit("coupon_validate")` jaisa hi pattern: order creation pe `rateLimit("order_create", { perIp: 20, perUser: 10, windowSec: 300 })`.
- Normal customers ko zero impact.

### B-3 Rate-limiter fail-closed (payment/login/coupon paths)
- Aaj DB error pe limiter `allowed: true` return karta hai → attacker DB flood karke bypass kar sakta hai.
- Sirf payment/login/coupon paths ke liye fail-closed (`allowed: false`); analytics/read paths fail-open hi rahenge.

---

## Group C — Race & idempotency hardening (data integrity)

### C-1 Order number entropy 4→16 hex
- `order_number` format same dikhega (`ORD-XXXXXXXX-XXXX`), sirf suffix length badhega — guess karna 4 billion guna mushkil.

### C-2 Razorpay + PhonePe webhook idempotency
- Naya choti table `webhook_events` (already exists — use kar lenge) me processed `event_id` store karke duplicate skip.
- Duplicate refund / duplicate credit nahi hoga.

### C-3 Subscription cron dedup
- `subscriptions` row pe `last_run_at` check + unique constraint `(subscription_id, interval_index)` so overlapping cron runs duplicate order na bana saken.

---

## Group D — Admin tabs ko server-fn pattern me wrap (additive)

13 tabs aaj direct browser `supabase` se mutations karte hain (CategoriesTab, BrandsTab, FlavorsTab, SizesTab, BulkImportTab, InventoryTab, AccountingTab, OrderBulkOpsTab, AbandonedCartsTab, Customer360Tab, ReviewsModerationTab, OffersTab, DimensionsTab) + 9 content tabs (Homepage/Nav/Footer/Pages/Blog/About/Contact/FAQ/GlobalReviews).

- **Nothing removed.** Har tab, har field, har button waisa rahega.
- Sirf write operations ko `createServerFn` + `requireSupabaseAuth` + `assertAdmin()` ke through route karna — RLS plus server-side admin check (defense in depth).
- Read operations browser supabase se hi chal sakte hain (RLS already protect karta hai).

**Itna bada change ek turn me nahi** — Group D ko Phase 2.5 me alag se karenge tab-by-tab, taaki har tab independently test ho sake.

---

## Group E — Bug fixes (no feature change)

### E-1 Review field mismatch
- Admin "verify" aur "feature/pin" buttons aaj `verified`/`pinned` column update karte hain par DB me column name `is_verified`/`is_featured` hai → silent no-op.
- Column names fix → buttons kaam karne lagenge.

### E-2 Review "helpful" vote
- Aaj button click karta hai, toast dikhta hai, par DB me kuch nahi badalta.
- `increment_review_helpful` RPC already exists (DB me dekha) — bas API call wire karna hai.

### E-3 `@ts-nocheck` removal
- Sirf un files se hatana jahan koi real type error nahi (mostly clean files me). Jahan type errors aayenge wahaan separate turn me fix karenge. **Koi runtime behaviour change nahi.**

---

## Out of scope (informational — feature decisions)

Ye baad me alag se discuss karenge:
- 2FA mandatory enforcement (aaj optional warning hai)
- Server-side cart persistence (naya feature)
- Wholesale discount integration (B2B flow design)

---

## Status (June 23, 2026)

| # | Item | Status |
|---|---|---|
| 1 | `webhook_events` + subscription unique constraint migration | ✅ |
| 2 | `rate-limit.ts` `failClosed` option | ✅ |
| 3 | coupon/login/contact/track-order `failClosed: true` | ✅ |
| 4 | Order entropy 16 hex (`NP{ts}-{8 bytes hex}`) | ✅ |
| 5 | Razorpay + PhonePe webhook idempotency (`webhook_events` dedup) | ✅ |
| 6 | Subscription cron `period_key` dedup | ✅ |
| 7 | Invoice + tracking owner/admin auth gate | ✅ |
| 8 | Pixels + `trackVisit` consent-gated | ✅ |
| 9 | Payment gateway secrets — server masks, skip-blank on save | ✅ |
| 10 | `PaymentGatewaysTab.tsx` masked UX | ✅ |
| 11 | Reviews — `is_verified` + `data.pinned` mapping, helpful RPC wired | ✅ |
| 12 | `@ts-nocheck` selective removal | ⏸ deferred (cosmetic) |
| B-2 | Order creation rate-limit + server-fn refactor | ✅ `src/lib/orders-create.functions.ts` (`placeOrder`), `/orders` API delegates to it; per-IP 20/5min + per-user 10/5min, fail-closed |

## Next phase (Phase 2.5 — when ready)

- Group D: 13 admin tabs + 9 content tabs → server-fn pattern with `assertAdmin()`.
- Server-side price recompute in `placeOrder`: re-fetch each item's price from `products`, recompute subtotal, ignore client-declared `subtotal`/`total` (today the client is still trusted for line-item pricing — discounts/wholesale are already server-computed).
