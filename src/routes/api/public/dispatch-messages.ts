/**
 * Public cron endpoint to drain the notification_queue. Protected by a
 * shared secret stored in `site_settings.messaging.cronSecret` or env
 * `MESSAGING_CRON_SECRET`. Designed to be hit every minute by pg_cron,
 * GitHub Actions, cron-job.org, or any external scheduler.
 *
 * curl -X POST -H "Authorization: Bearer <secret>" \
 *   https://<host>/api/public/dispatch-messages
 */
import { createFileRoute } from "@tanstack/react-router";
import { dispatchMessages } from "@/lib/messaging.functions";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

async function authorize(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const querySecret = url.searchParams.get("secret") || "";
  const auth = request.headers.get("authorization") || request.headers.get("Authorization");
  const headerToken = auth?.replace(/^Bearer\s+/i, "").trim() || "";
  const token = headerToken || querySecret;
  const envSecret = process.env.MESSAGING_CRON_SECRET || "";
  const { data } = await supabaseAdmin
    .from("site_settings")
    .select("settings")
    .eq("key", "messaging")
    .maybeSingle();
  const cfgSecret = ((data?.settings as any)?.cronSecret as string) || "";
  const expected = envSecret || cfgSecret;
  if (!expected) return false; // refuse if no secret set — prevents accidental open endpoint
  return !!token && token === expected;
}

async function run(request: Request) {
  if (!(await authorize(request))) {
    return new Response(JSON.stringify({ error: "unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const result = await dispatchMessages({ data: {} });
    return new Response(JSON.stringify({ ok: true, ...result }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || "dispatch failed" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export const Route = createFileRoute("/api/public/dispatch-messages")({
  server: {
    handlers: {
      POST: ({ request }) => run(request),
      GET: ({ request }) => run(request),
    },
  },
});
