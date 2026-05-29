import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { z } from "zod";

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
          const raw = await request.json().catch(() => null);
          const data = Schema.safeParse(raw);
          if (!data.success) return new Response("bad", { status: 400 });

          const country = request.headers.get("cf-ipcountry") || null;
          await supabaseAdmin.from("site_visits").insert({
            ...data.data,
            country,
          });
          return new Response("ok", { status: 204 });
        } catch {
          return new Response("ok", { status: 204 });
        }
      },
      OPTIONS: () => new Response(null, { status: 204 }),
    },
  },
});
