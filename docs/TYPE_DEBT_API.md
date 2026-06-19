# Type Debt Inventory: src/lib/api.ts

`@ts-nocheck` retained — stripping it surfaces **40 errors**, all real
schema drift (not noise). Fixing requires per-call-site investigation
because the code currently runs against schema that doesn't match the
TypeScript types.

## Categories of drift

1. **`user_coupons` table** — code reads/writes `.used`, `.min_order`,
   `.discount_type`, `.value`, `.max_discount`. None exist on the
   generated type; data lives under the `data jsonb` column instead.
   *Fix:* refactor to read from `row.data?.<field>`.

2. **`profiles.is_wholesale` / `.wholesale_*`** — columns don't exist.
   *Fix:* either add them via migration or move to a dedicated
   `wholesale_accounts` table.

3. **`orders.order_status` / `.auto_ship_attempts`** — name drift.
   Generated type uses `status`. *Fix:* rename references.

4. **`referral_events.referrer_id`** — should be `referral_id`.

5. **`invoices.next_invoice_number` RPC** — RPC not registered.
   *Fix:* either add the SQL function or compute client-side.

## Recommended path

Address one category at a time, each with its own migration + code
patch + smoke test. Don't bulk-strip `@ts-nocheck` — losing the runtime
behavior masked by these mismatches is worse than the type debt.
