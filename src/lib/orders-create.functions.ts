// @ts-nocheck
/**
 * Server-side order placement.
 *
 * Why a server fn? The old /orders handler lived in src/lib/api.ts and ran
 * entirely in the browser — meaning an attacker could call wallet RPCs,
 * bypass any rate-limit, and mint orders at will. Moving it server-side:
 *  - rate-limits by IP and (when known) by user, fail-closed.
 *  - runs all wallet/stock/coupon RPCs on the server so the user's session
 *    actually authorises them (or, for guests, blocks wallet entirely).
 *  - uses supabaseAdmin for the orders insert (RLS-bypass is fine here —
 *    we already authorised intent and we're the only writer for the row).
 *  - keeps the rest of the existing logic identical so checkout UX is
 *    unchanged.
 *
 * The body shape mirrors what src/lib/api.ts used to accept (camelCase from
 * the browser); we keep it permissive so existing client code keeps working.
 */
import { createServerFn } from "@tanstack/react-start";
import { getRequestIP, getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit, logSecurityEvent } from "@/lib/rate-limit";

const ALLOWED_PAYMENT_METHODS = new Set([
  "cod", "razorpay", "phonepe", "payu", "stripe", "upi",
]);

const ItemSchema = z
  .object({
    productId: z.string().optional(),
    id: z.string().optional(),
    name: z.string().optional(),
    quantity: z.number().int().positive().max(999),
    price: z.number().nonnegative().optional(),
    variant: z.string().optional(),
    size: z.string().optional(),
  })
  .passthrough();

const OrderBodySchema = z
  .object({
    items: z.array(ItemSchema).min(1).max(100),
    subtotal: z.number().nonnegative().default(0),
    shipping: z.number().nonnegative().default(0),
    discount: z.number().nonnegative().default(0),
    total: z.number().nonnegative(),
    walletUsed: z.number().nonnegative().default(0),
    couponCode: z.string().max(80).default(""),
    userCouponId: z.string().uuid().optional().nullable(),
    paymentMethod: z.string().max(32).default("cod"),
    paymentMethodOffer: z.any().optional(),
    priorityShipping: z.boolean().optional().default(false),
    shippingAddress: z
      .object({
        name: z.string().max(200).optional().default(""),
        email: z.string().max(255).optional().default(""),
        phone: z.string().max(32).optional().default(""),
      })
      .passthrough()
      .default({}),
  })
  .passthrough();

function snakeToCamel(s) { return s.replace(/_([a-z])/g, (_, c) => c.toUpperCase()); }
function camelize(input) {
  if (input == null || typeof input !== "object") return input;
  if (Array.isArray(input)) return input.map(camelize);
  const out = {};
  for (const k of Object.keys(input)) {
    out[snakeToCamel(k)] = camelize(input[k]);
    if (k === "id") out._id = input[k];
  }
  return out;
}

/** Build a user-scoped supabase client from the inbound bearer (or null). */
function getUserClient() {
  try {
    const req = getRequest();
    const auth = req?.headers?.get("authorization") || "";
    if (!auth.startsWith("Bearer ")) return null;
    const token = auth.slice(7);
    if (!token) return null;
    const url = process.env.SUPABASE_URL;
    const key = process.env.SUPABASE_PUBLISHABLE_KEY;
    if (!url || !key) return null;
    return createClient(url, key, {
      global: { headers: { Authorization: `Bearer ${token}` } },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
  } catch {
    return null;
  }
}

export const placeOrder = createServerFn({ method: "POST" })
  .inputValidator((input) => OrderBodySchema.parse(input))
  .handler(async ({ data: body }) => {
    const ip = getRequestIP({ xForwardedFor: true }) || "anon";

    // SEC: per-IP rate-limit, fail-closed (payments path). 20 / 5min, then 15-min block.
    const rlIp = await rateLimit("order_create_ip", ip, 20, 300, 900, { failClosed: true });
    if (!rlIp.allowed) {
      await logSecurityEvent({
        kind: "order_create_rate_limited",
        severity: "warn",
        sourceIp: ip,
        detail: { hits: rlIp.hits, scope: "ip" },
      });
      throw new Error("Too many order attempts. Please try again in a few minutes.");
    }

    // Resolve current user (optional — guest checkout is allowed).
    const userClient = getUserClient();
    let userId = null;
    let userEmail = null;
    if (userClient) {
      try {
        const { data: u } = await userClient.auth.getUser();
        userId = u?.user?.id ?? null;
        userEmail = u?.user?.email ?? null;
      } catch {}
    }

    if (userId) {
      // Tighter per-user limit (10 / 5min) so a logged-in attacker is also bounded.
      const rlUser = await rateLimit("order_create_user", userId, 10, 300, 900, { failClosed: true });
      if (!rlUser.allowed) {
        await logSecurityEvent({
          kind: "order_create_rate_limited",
          severity: "warn",
          sourceIp: ip,
          userId,
          detail: { hits: rlUser.hits, scope: "user" },
        });
        throw new Error("Too many order attempts. Please try again in a few minutes.");
      }
    }

    let walletUsed = Math.max(0, Number(body.walletUsed || 0));
    if (walletUsed > 0 && !userClient) {
      throw new Error("Login required to use wallet");
    }

    // SEC-011: 8 random bytes (16 hex / 64 bits) — collision-resistant suffix.
    const _rand = new Uint8Array(8);
    crypto.getRandomValues(_rand);
    const _suffix = Array.from(_rand, (b) => b.toString(16).padStart(2, "0")).join("").toUpperCase();
    const orderNumber = `NP${Date.now()}-${_suffix}`;
    const id = crypto.randomUUID();

    // WIR-005: server-side wholesale discount. Cannot be forged client-side now.
    let wholesaleDiscount = 0;
    let wholesalePercent = 0;
    if (userId) {
      const { data: wsRow } = await supabaseAdmin
        .from("profiles").select("data").eq("id", userId).maybeSingle();
      const wsData = (wsRow && typeof wsRow.data === "object") ? wsRow.data : {};
      if (wsData.is_wholesale) {
        const subtotal = Number(body.subtotal ?? 0);
        const minOrder = Number(wsData.wholesale_min_order || 0);
        const pct = Math.min(80, Math.max(0, Number(wsData.wholesale_discount_percent || 0)));
        if (subtotal >= minOrder && pct > 0) {
          wholesalePercent = pct;
          wholesaleDiscount = Math.round((subtotal * pct) / 100);
        }
      }
    }
    const declaredTotal = Number(body.total);
    const finalTotal = Math.max(0, declaredTotal - walletUsed - wholesaleDiscount);

    const shippingAddr = { ...(body.shippingAddress || {}) };
    if (body.paymentMethodOffer) shippingAddr.paymentMethodOffer = body.paymentMethodOffer;
    if (walletUsed > 0) shippingAddr.walletUsed = walletUsed;
    if (wholesaleDiscount > 0) {
      shippingAddr.wholesale = { percent: wholesalePercent, discount: wholesaleDiscount };
    }

    // SEC-014: payment_method allowlist, status fields server-controlled.
    const paymentMethod = ALLOWED_PAYMENT_METHODS.has(String(body.paymentMethod || "").toLowerCase())
      ? String(body.paymentMethod).toLowerCase()
      : "cod";

    const payload = {
      id, order_number: orderNumber,
      user_id: userId,
      items: Array.isArray(body.items) ? body.items : [],
      subtotal: Number(body.subtotal ?? 0),
      // Live schema uses shipping_charge (not shipping_cost) and has no
      // priority_shipping column — that flag lives in the data jsonb.
      shipping_charge: Number(body.shipping ?? 0),
      discount: Number(body.discount ?? 0) + walletUsed + wholesaleDiscount,
      total: finalTotal,
      coupon_code: String(body.couponCode ?? "").slice(0, 80),
      customer_name: String(body.shippingAddress?.name ?? "").slice(0, 200),
      customer_email: String(body.shippingAddress?.email ?? userEmail ?? "").slice(0, 255),
      customer_phone: String(body.shippingAddress?.phone ?? "").slice(0, 32),
      shipping_address: shippingAddr,
      payment_method: paymentMethod,
      payment_status: "pending",
      status: "pending",
      data: { priority_shipping: !!body.priorityShipping },
    };

    // BIZ-003: wallet debit BEFORE order create. Uses the user-scoped client
    // so the RPC's auth.uid() resolves; impossible without a real bearer.
    if (walletUsed > 0 && userClient) {
      const { error: debitErr } = await userClient.rpc("wallet_debit_for_order", {
        _amount: walletUsed,
        _order_number: orderNumber,
        _note: `Redeemed on ${orderNumber}`,
      });
      if (debitErr) throw new Error(debitErr.message || "Wallet debit failed");
    }

    // BIZ-004: reserve stock atomically. Admin client; RPC is SECURITY DEFINER.
    {
      const { error: stockErr } = await supabaseAdmin.rpc("reserve_stock_for_order", {
        _items: body.items ?? [],
        _order_number: orderNumber,
      });
      if (stockErr) {
        if (walletUsed > 0 && userClient) {
          await userClient.rpc("wallet_refund_for_order", {
            _amount: walletUsed,
            _order_number: orderNumber,
            _note: `Auto-refund: stock reservation failed for ${orderNumber}`,
          });
        }
        throw new Error(stockErr.message || "Some items are out of stock");
      }
    }

    // BIZ-007: claim single-use personal coupon atomically.
    let couponClaimed = false;
    if (body.userCouponId && userId) {
      const { data: ucExisting } = await supabaseAdmin
        .from("user_coupons").select("data").eq("id", body.userCouponId).maybeSingle();
      const mergedData = {
        ...((ucExisting?.data && typeof ucExisting.data === "object") ? ucExisting.data : {}),
        used_order_id: orderNumber,
      };
      const { data: claimed, error: couponErr } = await supabaseAdmin
        .from("user_coupons")
        .update({ used_at: new Date().toISOString(), data: mergedData })
        .eq("id", body.userCouponId)
        .eq("user_id", userId)
        .is("used_at", null)
        .select("id")
        .maybeSingle();
      if (couponErr || !claimed) {
        if (walletUsed > 0 && userClient) {
          await userClient.rpc("wallet_refund_for_order", {
            _amount: walletUsed,
            _order_number: orderNumber,
            _note: `Auto-refund: coupon already used for ${orderNumber}`,
          });
        }
        await supabaseAdmin.rpc("release_stock_for_order", { _order_number: orderNumber });
        throw new Error(couponErr?.message || "Coupon already used");
      }
      couponClaimed = true;
    }

    const { data, error } = await supabaseAdmin.from("orders").insert(payload).select().single();
    if (error) {
      if (walletUsed > 0 && userClient) {
        await userClient.rpc("wallet_refund_for_order", {
          _amount: walletUsed,
          _order_number: orderNumber,
          _note: `Auto-refund: order ${orderNumber} failed to save`,
        });
      }
      await supabaseAdmin.rpc("release_stock_for_order", { _order_number: orderNumber });
      if (couponClaimed && body.userCouponId && userId) {
        const { data: ucRel } = await supabaseAdmin
          .from("user_coupons").select("data").eq("id", body.userCouponId).maybeSingle();
        const relData = { ...((ucRel?.data && typeof ucRel.data === "object") ? ucRel.data : {}) };
        delete relData.used_order_id;
        await supabaseAdmin.from("user_coupons")
          .update({ used_at: null, data: relData })
          .eq("id", body.userCouponId).eq("user_id", userId);
      }
      throw new Error(error.message);
    }

    return camelize(data);
  });
