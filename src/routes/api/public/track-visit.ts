// @ts-nocheck
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/origin-guard";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  session_id: z.string().min(1).max(64),
  path: z.string().min(1).max(500),
  referrer: z.string().max(500).nullable().optional(),
  device: z.enum(["mobile", "desktop", "tablet", "unknown"]).default("unknown"),
  utm_source: z.string().max(120).nullable().optional(),
  utm_medium: z.string().max(120).nullable().optional(),
  utm_campaign: z.string().max(120).nullable().optional(),
});

export const Route = createFileRoute("/api/public/track-visit")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // SEC: same-origin only + per-session throttle.
          if (!isSameOriginRequest(request)) return new Response("forbidden", { status: 403 });
          const raw = await request.json().catch(() => null);
          const data = Schema.safeParse(raw);
          if (!data.success) return new Response("bad", { status: 400 });
          const rl = await rateLimit("track_visit", data.data.session_id, 60, 60, 300);
          if (!rl.allowed) return new Response("rate_limited", { status: 429 });

          const country = request.headers.get("cf-ipcountry") || null;
          await supabaseAdmin.from("site_visits").insert({
            ...data.data,
            country,
          });
          return Response.json({ ok: true });
        } catch {
          return Response.json({ ok: true });
        }
      },
      OPTIONS: () => new Response(null, { status: 200 }),
    },
  },
});
