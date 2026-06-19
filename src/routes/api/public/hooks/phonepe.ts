// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import crypto from "crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

/**
 * PhonePe S2S callback. PhonePe posts a JSON {response: base64}
 * and an X-VERIFY header = sha256(base64 + saltKey) + "###" + saltIndex.
 *
 * Required env: PHONEPE_SALT_KEY, PHONEPE_SALT_INDEX
 */
export const Route = createFileRoute("/api/public/hooks/phonepe")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const saltKey = process.env.PHONEPE_SALT_KEY;
        const saltIndex = process.env.PHONEPE_SALT_INDEX || "1";
        if (!saltKey) return new Response("Not configured", { status: 503 });

        const xVerify = request.headers.get("x-verify") || "";
        const body = await request.text();
        let json: any;
        try { json = JSON.parse(body); }
        catch { return new Response("Invalid JSON", { status: 400 }); }

        const b64 = String(json?.response || "");
        if (!b64) return new Response("Missing response", { status: 400 });

        const expected = crypto.createHash("sha256").update(b64 + saltKey).digest("hex") + "###" + saltIndex;
        if (xVerify.length !== expected.length ||
            !crypto.timingSafeEqual(Buffer.from(xVerify), Buffer.from(expected))) {
          return new Response("Invalid signature", { status: 401 });
        }

        let decoded: any;
        try { decoded = JSON.parse(Buffer.from(b64, "base64").toString("utf-8")); }
        catch { return new Response("Invalid payload", { status: 400 }); }

        const merchantTxnId = decoded?.data?.merchantTransactionId
          || decoded?.merchantTransactionId
          || "";
        const code = String(decoded?.code || "");
        const status = code === "PAYMENT_SUCCESS" ? "paid"
                     : code === "PAYMENT_ERROR" || code === "PAYMENT_DECLINED" ? "failed"
                     : "attempted";

        // Idempotency: PhonePe retries the callback on non-2xx. Dedupe by
        // (merchantTxnId + provider txn id + code) so the same outcome is
        // processed once and retries just ack.
        const txnId = decoded?.data?.transactionId || "";
        const eventId = `${merchantTxnId}:${txnId}:${code}`;
        if (merchantTxnId && code) {
          const { error: dupErr } = await supabaseAdmin
            .from("webhook_events")
            .insert({ provider: "phonepe", event_id: eventId, event_type: code, payload: decoded });
          if (dupErr) {
            if ((dupErr as any).code === "23505") return new Response("ok (duplicate)");
            return new Response("Storage error", { status: 500 });
          }
        }

        await supabaseAdmin.from("payment_transactions").update({
          provider_payment_id: decoded?.data?.transactionId || null,
          status,
          raw: decoded,
        }).eq("provider", "phonepe").eq("provider_order_id", merchantTxnId);

        if (status === "paid" && merchantTxnId) {
          // merchantTxnId is `${orderNumber}-${suffix}`
          const orderNumber = merchantTxnId.split("-").slice(0, -1).join("-") || merchantTxnId;
          await supabaseAdmin.from("orders").update({
            payment_status: "paid",
            order_status: "confirmed",
          }).eq("order_number", orderNumber).neq("payment_status", "paid");
        }

        return new Response("ok");
      },
    },
  },
});
