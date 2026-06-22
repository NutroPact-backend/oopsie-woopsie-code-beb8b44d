import { createServerFn } from "@tanstack/react-start";

type ValidateInput = { code: string; subtotal: number };

function calcDiscount(subtotal: number, type: string, value: number, maxDiscount: number | null) {
  const raw = type === "percent" ? Math.round((subtotal * value) / 100) : value;
  return maxDiscount ? Math.min(raw, maxDiscount) : raw;
}

/**
 * Server-side coupon validation.
 * - Uses service-role client so private/staff-only codes still resolve
 *   (they're hidden from the client by RLS).
 * - Only returns the minimum fields the cart needs — never exposes
 *   usage_count, internal flags, or full row.
 */
export const validateCoupon = createServerFn({ method: "POST" })
  .inputValidator((data: ValidateInput) => {
    const code = String(data?.code ?? "").trim().toUpperCase();
    const subtotal = Math.max(0, Number(data?.subtotal ?? 0));
    if (!code) throw new Error("Coupon code required");
    return { code, subtotal };
  })
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("coupons")
      .select(
        "code,type,value,label,min_order_value,max_discount,expires_at,valid_from,valid_until,active,usage_limit,used_count"
      )
      .ilike("code", data.code)
      .maybeSingle();

    if (error || !row || !row.active) {
      return { ok: false as const, error: "Invalid coupon code" };
    }

    const now = new Date();
    if (row.valid_from && new Date(row.valid_from) > now) {
      return { ok: false as const, error: "This coupon is not active yet" };
    }
    const expiry = row.expires_at || row.valid_until;
    if (expiry && new Date(expiry) < now) {
      return { ok: false as const, error: "This coupon has expired" };
    }
    if (row.usage_limit != null && (row.used_count ?? 0) >= row.usage_limit) {
      return { ok: false as const, error: "This coupon has reached its usage limit" };
    }
    const min = Number(row.min_order_value || 0);
    if (data.subtotal < min) {
      return { ok: false as const, error: `Minimum order ₹${min} required for this coupon` };
    }

    const type = String(row.type || "flat");
    const value = Number(row.value || 0);
    const maxDiscount = row.max_discount != null ? Number(row.max_discount) : null;
    const discount = calcDiscount(data.subtotal, type, value, maxDiscount);

    return {
      ok: true as const,
      coupon: {
        code: row.code,
        type,
        value,
        label: row.label || "",
        min_order_value: min,
        max_discount: maxDiscount ?? undefined,
      },
      discount,
    };
  });