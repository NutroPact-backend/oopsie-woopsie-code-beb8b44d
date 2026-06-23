# NutroPact — Round 3 Repair Plan

Maine saari 10 uploaded audit/wiring files padh li (COMPREHENSIVE_WIRING_MAP, DEEP_BACKEND_AUDIT, FULL_AUDIT, MIGRATION, NATIVE, 2DAY, MASTER, backend_to_ui_wiring, security_audit_repairs, gemini-code). Total **56 unresolved issues** mile (pichle round me jo fix ho gaye unko exclude kiya).

Itne saare issues ek hi turn me fix karna safe nahi — build tootega aur regression aayegi. Isliye 3 phases me karunga. **Iss plan me sirf Phase 1 (P0) execute hoga** — uske baad Phase 2/3 ke liye dobara approval lunga.

---

## Phase 1 — P0 Critical (iss turn me)

Ye 6 issues immediate exploit / money-loss risk hain.

| # | Issue | Fix |
|---|---|---|
| P0-01 | ChatWidget XSS — `dangerouslySetInnerHTML` AI response render karta hai bina sanitize kiye | `DOMPurify.sanitize()` add karna `ChatWidget.tsx:279` me |
| P0-02 | Chatbot prompt injection — user input seedha Gemini ko jaata hai | `chatbot.functions.ts` me input sanitization + system prompt integrity prefix + output filter |
| P0-03 | Inventory deduction missing — overselling possible | Order creation me atomic `UPDATE products SET stock = stock - qty WHERE stock >= qty` (RPC), cancel/refund pe revert |
| P0-04 | Referral double-credit race | `referrals.functions.ts` — `UPDATE ... WHERE consumed_at IS NULL` + rowcount assert |
| P0-05 | Gift card double-redeem race | `giftcards.functions.ts` — same atomic pattern |
| P0-06 | Wallet checkout race — concurrent requests double-spend balance | `wallet.functions.ts` — atomic `UPDATE user_wallets SET balance = balance - $1 WHERE user_id=$2 AND balance >= $1` via RPC |

**DB Migration (single):**
- `deduct_stock(product_id, qty)` RPC — atomic stock decrement
- `consume_referral(event_id)` RPC — atomic mark + return success
- `redeem_gift_card(code, amount)` RPC — atomic
- `debit_wallet(user_id, amount)` RPC — atomic with balance check
- All RPCs `SECURITY DEFINER`, `GRANT EXECUTE TO authenticated`

**Code changes:**
- `src/components/ChatWidget.tsx` — DOMPurify wrap
- `src/lib/chatbot.functions.ts` — input/output guardrails
- `src/lib/orders.functions.ts` (or wherever order created) — call `deduct_stock` RPC; rollback on payment fail
- `src/lib/referrals.functions.ts` — use `consume_referral` RPC
- `src/lib/giftcards.functions.ts` — use `redeem_gift_card` RPC
- `src/lib/wallet.functions.ts` — use `debit_wallet` RPC
- `bun add dompurify @types/dompurify`

**Verification:** Build green, ChatWidget renders sanitized HTML, RPCs visible in DB, manual concurrent-call simulation script for wallet/giftcard race confirms only 1 succeeds.

---

## Phase 2 — P1 High (next turn, after P0 verified)

14 issues. Highlights:
- Payment gateway secrets ko browser se hatana (Razorpay/PhonePe/PayU)
- Invoice/tracking endpoints pe auth lagana
- Order number entropy 4→16 hex
- Webhook idempotency (razorpay + phonepe)
- Subscription cron dedup
- Rate-limiter fail-closed
- Order endpoint pe rate-limit
- Consent gating sab pixels pe (LinkedIn/Pinterest/Twitter/Reddit/Quora + internal trackVisit)
- 13 admin tabs ko server-fn pattern me migrate (RLS sole defence problem)
- `@ts-nocheck` hatana
- Review verified/featured field mismatch fix
- Review "helpful" vote actually implement karna
- 9 content tabs (Homepage/Nav/Footer/Pages/Blog/About/Contact/FAQ/GlobalReviews) ko server-fn me

## Phase 3 — P2 + P3 (later turn)

36 issues: JWT `getUser()` switch, 2FA enforcement, CSRF headers, cron secret env-only, mass-assignment allowlist, FB CAPI dedup, crypto.randomUUID sessions, perf N+1 fixes, SEO (titles/meta/canonical/JSON-LD/hreflang), terms page date, refund page content, CSP unsafe-inline, etc.

---

## Out of Scope (informational only)
- Wholesale discount integration — needs product decision on B2B flow
- Server-side cart persistence — large refactor, separate feature request
- Bundle splitting — optimization, no functional bug

---

**Iss plan ko approve karo to Phase 1 (P0) start karta hoon.** Phase 2/3 ke liye baad me alag approval lunga.
