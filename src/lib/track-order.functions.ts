import { createServerFn } from "@tanstack/react-start";
import { getRequestIP } from "@tanstack/react-start/server";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { rateLimit, logSecurityEvent } from "@/lib/rate-limit";

export const trackOrderPublic = createServerFn({ method: "POST" })
  .inputValidator((input) =>
    z
      .object({
        orderNumber: z
          .string()
          .min(1)
          .max(100)
          .regex(/^[A-Za-z0-9_-]+$/, "Invalid order number"),
      })
      .parse(input),
  )
  .handler(async ({ data }) => {
    // SEC: throttle lookups to prevent order-number enumeration. 10 lookups
    // per IP per 5 minutes, then 15-minute block. Fail-closed.
    const ip = getRequestIP({ xForwardedFor: true }) || "anon";
    const rl = await rateLimit("track_order", ip, 10, 300, 900, { failClosed: true });
    if (!rl.allowed) {
      await logSecurityEvent({
        kind: "track_order_rate_limited",
        severity: "warn",
        sourceIp: ip,
        detail: { hits: rl.hits, blockedUntil: rl.blockedUntil },
      });
      throw new Error("Too many lookups. Please try again in a few minutes.");
    }
    const { data: row, error } = await supabaseAdmin
      .from("orders")
      .select("order_number, order_status, payment_status, shipping_address, created_at, updated_at")
      .eq("order_number", data.orderNumber)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!row) return null;
    const addr = (row.shipping_address ?? {}) as { city?: string | null; state?: string | null };
    // Minimal payload: do NOT expose items, total, customer name, or pincode
    // on the unauthenticated tracking endpoint. City/state are coarse enough
    // for users to confirm they're looking at the right order.
    return {
      order_number: row.order_number,
      order_status: row.order_status,
      payment_status: row.payment_status,
      shipping_address: {
        city: addr.city ?? null,
        state: addr.state ?? null,
      },
      created_at: row.created_at,
      updated_at: row.updated_at,
    };
  });
