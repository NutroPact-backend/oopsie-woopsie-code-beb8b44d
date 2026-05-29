/**
 * Public server-side conversion endpoint (FB CAPI + GA4 MP).
 * Lets external callers (cron, server scripts, third-party tools) push
 * Purchase / AddToCart / Lead events without relying on a browser pixel —
 * essential after iOS 14+ ITP and aggressive ad-blockers.
 *
 * Auth: same shared secret as dispatch-messages
 *   - Header:  Authorization: Bearer <secret>
 *   - Or query: ?secret=<secret>
 * Secret source: env MESSAGING_CRON_SECRET or site_settings.messaging.cronSecret
 *
 * POST body (JSON):
 *   { eventName, orderNumber?, value?, currency?, email?, phone?,
 *     clientId?, eventId?, sourceUrl? }
 */
import { createFileRoute } from "@tanstack/react-router";
import { z } from "zod";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { sendConversion } from "@/lib/marketing.functions";

const BodySchema = z.object({
  eventName: z.string().min(1).max(64).regex(/^[A-Za-z0-9_]+$/),
  orderNumber: z.string().max(64).optional(),
  value: z.number().min(0).max(10_000_000).optional(),
  currency: z.string().length(3).optional(),
  email: z.string().email().max(320).optional(),
  phone: z.string().max(20).optional(),
  clientId: z.string().max(64).optional(),
  eventId: z.string().max(120).optional(),
  sourceUrl: z.string().url().max(2048).optional(),
});

async function authorize(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  const token =
    (auth?.replace(/^Bearer\s+/i, "").trim() || "") || url.searchParams.get("secret") || "";
  const envSecret = process.env.MESSAGING_CRON_SECRET || "";
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "messaging")
    .maybeSingle();
  const cfgSecret = ((data?.settings as any)?.cronSecret as string) || "";
  const expected = envSecret || cfgSecret;
  if (!expected) return false;
  return !!token && token === expected;
}

export const Route = createFileRoute("/api/public/conversion")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        if (!(await authorize(request))) {
          return new Response(JSON.stringify({ error: "unauthorized" }), {
            status: 401,
            headers: { "Content-Type": "application/json" },
          });
        }
        let raw: unknown;
        try {
          raw = await request.json();
        } catch {
          return new Response(JSON.stringify({ error: "invalid_json" }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }
        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
          return new Response(
            JSON.stringify({ error: "invalid_input", details: parsed.error.flatten() }),
            { status: 400, headers: { "Content-Type": "application/json" } },
          );
        }
        const userAgent = request.headers.get("user-agent") || undefined;
        const ip =
          request.headers.get("cf-connecting-ip") ||
          request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
          undefined;

        try {
          const out = await sendConversion({
            data: { ...parsed.data, userAgent, ip },
          });
          return new Response(JSON.stringify(out), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          });
        } catch (e: any) {
          return new Response(
            JSON.stringify({ ok: false, error: e?.message || "send failed" }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }
      },
    },
  },
});
