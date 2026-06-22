import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";
import { isSameOriginRequest } from "@/lib/origin-guard";
import { rateLimit } from "@/lib/rate-limit";

const Schema = z.object({
  session_id:   z.string().min(1).max(64),
  event_type:   z.string().min(1).max(40),
  path:         z.string().max(500).nullable().optional(),
  device:       z.enum(["mobile", "desktop", "tablet", "unknown"]).default("unknown"),
  product_id:   z.string().max(120).nullable().optional(),
  product_name: z.string().max(255).nullable().optional(),
  value:        z.number().finite().nullable().optional(),
  quantity:     z.number().int().nullable().optional(),
  meta:         z.record(z.string(), z.any()).optional().default({}),
});

export const Route = createFileRoute("/api/public/track-event")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try {
          // SEC: same-origin only — analytics beacon should never come from
          // another site. Also throttle per session to deter event flooding.
          if (!isSameOriginRequest(request)) return new Response("forbidden", { status: 403 });
          const raw = await request.json().catch(() => null);
          const parsed = Schema.safeParse(raw);
          if (!parsed.success) return new Response("bad", { status: 400 });
          const rl = await rateLimit(
            "track_event",
            parsed.data.session_id,
            120,
            60,
            300,
          );
          if (!rl.allowed) return new Response("rate_limited", { status: 429 });
          const country = request.headers.get("cf-ipcountry") || null;
          await (supabaseAdmin.from("site_events" as any) as any).insert({
            ...parsed.data,
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