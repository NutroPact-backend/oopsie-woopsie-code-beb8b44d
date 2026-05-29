import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { loadShippingConfig, trackByCarrier, type TrackResult } from "@/lib/shipping.functions";
import { requireCronSecret } from "@/lib/cron-auth";

const TERMINAL = new Set(["delivered", "rto", "cancelled"]);

export const Route = createFileRoute("/api/public/sync-tracking")({
  server: {
    handlers: {
      POST: async () => {
        try { await requireCronSecret(); }
        catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
        const cfg = await loadShippingConfig();

        const { data: rows, error } = await supabase
          .from("order_tracking")
          .select("*")
          .eq("manual_override", false)
          .not("awb_number", "is", null)
          .neq("awb_number", "")
          .not("current_status", "in", "(delivered,rto,cancelled)")
          .order("last_synced_at", { ascending: true, nullsFirst: true })
          .limit(50);

        if (error) return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });

        const results: any[] = [];
        for (const row of rows ?? []) {
          const carrier = row.courier as any;
          const c: any = (cfg.carriers as any)?.[carrier];
          if (!c?.enabled) { results.push({ order: row.order_number, skipped: "carrier disabled" }); continue; }
          try {
            const t: TrackResult = await trackByCarrier(carrier, c, row.awb_number);
            const now = new Date().toISOString();
            const history = Array.isArray(row.status_history) ? row.status_history : [];
            const last = history[history.length - 1];
            const changed = !last || last.status !== t.status;
            const newHistory = changed
              ? [...history, { ts: t.lastUpdate || now, status: t.status, label: t.statusLabel, source: carrier }]
              : history;

            await supabase.from("order_tracking").update({
              current_status: t.status,
              tracking_url: t.trackingUrl || row.tracking_url,
              status_history: newHistory,
              updated_at: now,
              last_synced_at: now,
            }).eq("id", row.id);

            if (changed && ["out_for_delivery", "delivered"].includes(t.status)) {
              await supabase.from("orders").update({
                order_status: t.status,
                updated_at: now,
              }).eq("order_number", row.order_number);
            }

            results.push({ order: row.order_number, status: t.status, changed });
          } catch (e: any) {
            results.push({ order: row.order_number, error: e.message });
          }
        }

        return new Response(JSON.stringify({ ok: true, synced: results.length, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
