// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * Razorpay webhook receiver. Configure in Razorpay dashboard with the
 * RAZORPAY_WEBHOOK_SECRET. Handles payment.captured / payment.failed / refund.
 */
export const Route = createFileRoute("/api/public/hooks/razorpay")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
        if (!secret) return new Response("Webhook not configured", { status: 503 });

        const signature = request.headers.get("x-razorpay-signature") || "";
        const body = await request.text();
        const expected = crypto.createHmac("sha256", secret).update(body).digest("hex");
        if (signature.length !== expected.length ||
            !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let payload: any;
        try { payload = JSON.parse(body); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const event = String(payload?.event || "");
        const payment = payload?.payload?.payment?.entity;
        const refund = payload?.payload?.refund?.entity;

        if (payment) {
          const orderNumber = payment?.notes?.order_number || payment?.receipt;
          const status = event === "payment.captured" ? "paid"
                       : event === "payment.failed" ? "failed"
                       : "attempted";

          await supabaseAdmin.from("payment_transactions").update({
            provider_payment_id: payment.id,
            status,
            raw: payload,
          }).eq("provider", "razorpay").eq("provider_order_id", payment.order_id);

          if (status === "paid" && orderNumber) {
            await supabaseAdmin.from("orders").update({
              payment_status: "paid",
              order_status: "confirmed",
            }).eq("order_number", orderNumber).neq("payment_status", "paid");
          }
        }

        if (refund && event.startsWith("refund.")) {
          await supabaseAdmin.from("payment_transactions").update({
            status: "refunded",
            raw: payload,
          }).eq("provider", "razorpay").eq("provider_payment_id", refund.payment_id);
        }

        return new Response("ok");
      },
    },
  },
});
