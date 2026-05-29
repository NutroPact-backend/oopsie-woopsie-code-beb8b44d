import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import { loadShippingConfig, createShipmentForOrder, pickBestCarrier } from "@/lib/shipping.functions";
import { loadBoxes, resolveOrderItemDims, pickBox } from "@/lib/packaging.server";
import { requireCronSecret } from "@/lib/cron-auth";

const MAX_ATTEMPTS = 5;

export const Route = createFileRoute("/api/public/auto-shipment")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }
        const startedAt = Date.now();
        const url = new URL(request.url);
        const trigger = url.searchParams.get("trigger") || "cron";
        const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
          auth: { persistSession: false, autoRefreshToken: false },
        });
        const logRun = async (extra: any) => {
          try {
            await supabase.from("shipment_automation_runs").insert({
              started_at: new Date(startedAt).toISOString(),
              finished_at: new Date().toISOString(),
              duration_ms: Date.now() - startedAt,
              trigger,
              ...extra,
            });
          } catch {}
        };
        const cfg = await loadShippingConfig();
        const sShip = (cfg as any) || {};
        const auto = (sShip.automation as any) || {};
        if (auto.enabled === false) {
          await logRun({ error: "automation disabled" });
          return new Response(JSON.stringify({ ok: true, skipped: "automation disabled" }), {
            headers: { "Content-Type": "application/json" },
          });
        }

        const delayMin = Number(auto.delayMinutes) || 120;
        const priorityDelayMin = Number(auto.priorityDelayMinutes) || 10;
        const divisor = Number(auto.volumetricDivisor) || 5000;
        const origin = (cfg as any).originPincode || (cfg as any).originAddress?.pincode;
        if (!origin) {
          await logRun({ error: "Origin pincode not configured" });
          return new Response(JSON.stringify({ ok: false, error: "Origin pincode not configured" }), { status: 400 });
        }

        // Cutoff = oldest eligible age
        const now = Date.now();
        const normalCutoff = new Date(now - delayMin * 60_000).toISOString();
        const priorityCutoff = new Date(now - priorityDelayMin * 60_000).toISOString();

        const { data: orders, error } = await supabase
          .from("orders")
          .select("*")
          .in("order_status", ["confirmed", "processing"])
          .lt("auto_ship_attempts", MAX_ATTEMPTS)
          .or(`created_at.lte.${normalCutoff},and(priority_shipping.eq.true,created_at.lte.${priorityCutoff})`)
          .order("priority_shipping", { ascending: false })
          .order("created_at", { ascending: true })
          .limit(20);

        if (error) {
          await logRun({ error: error.message });
          return new Response(JSON.stringify({ ok: false, error: error.message }), { status: 500 });
        }

        // Skip already-shipped orders
        const { data: existing } = await supabase
          .from("order_tracking")
          .select("order_number")
          .in("order_number", (orders ?? []).map((o) => o.order_number));
        const skip = new Set((existing ?? []).map((x) => x.order_number));

        const boxes = await loadBoxes();
        const results: any[] = [];

        for (const order of orders ?? []) {
          if (skip.has(order.order_number)) continue;
          // Skip if payment pending for non-COD orders
          const pm = order.payment_method || "cod";
          if (pm === "prepaid" && order.payment_status !== "paid") continue;

          try {
            const dest = order.shipping_address?.pincode;
            if (!dest) throw new Error("No destination pincode");

            // 1) Resolve item dims → pick box → volumetric weight
            const itemDims = await resolveOrderItemDims(order.items || []);
            const pack = pickBox(itemDims, boxes, divisor);

            // 2) Pick cheapest (or fastest if priority) carrier
            const best = await pickBestCarrier(origin, dest, pack.chargeableWeightKg, pm, !!order.priority_shipping, cfg as any);
            if (!best) throw new Error("No carrier returned a rate");

            // 3) Create shipment with carrier (passing computed dims via order copy)
            const orderForCarrier = {
              ...order,
              _pack: pack,
              shipping_weight_grams: pack.chargeableWeightGrams,
              package_dims: pack.dims,
            };
            const r: any = await createShipmentForOrder(orderForCarrier, cfg as any, best.carrier);
            const ts = new Date().toISOString();

            await supabase.from("order_tracking").upsert(
              {
                order_id: order.id,
                order_number: order.order_number,
                courier: best.carrier,
                awb_number: r.awb || "",
                tracking_url: r.trackingUrl || "",
                current_status: "shipped",
                status_history: [{ ts, status: "shipped", source: best.carrier, courier: best.courier, rate: best.rate }],
                updated_at: ts,
                last_synced_at: ts,
              },
              { onConflict: "order_number" }
            );

            // Record expected cost for reconciliation (admin imports actual later)
            await supabase.from("shipment_charges").upsert(
              {
                order_number: order.order_number,
                courier: best.carrier,
                awb_number: r.awb || "",
                expected_weight_g: pack.chargeableWeightGrams,
                expected_charge: Number(best.rate) || 0,
                expected_box_id: pack.box?.id || "",
                raw: { courier_name: best.courier, eta_days: best.etaDays },
              },
              { onConflict: "order_number" },
            );


            await supabase
              .from("orders")
              .update({
                order_status: "shipped",
                notes: `${order.notes || ""}\n[Auto] ${best.carrier}/${best.courier} ₹${best.rate} · AWB:${r.awb} · ${pack.chargeableWeightGrams}g (${pack.box?.name || "no box"})`.trim(),
                auto_ship_last_error: null,
                updated_at: ts,
              })
              .eq("id", order.id);

            // Notify admins → pack the order
            const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
            if (admins?.length) {
              await supabase.from("user_notifications").insert(
                admins.map((a) => ({
                  user_id: a.user_id,
                  type: "success",
                  title: `📦 Pack order ${order.order_number}`,
                  body: `${best.carrier}/${best.courier} pickup booked. Box: ${pack.box?.name || "n/a"} · ${pack.chargeableWeightGrams}g · AWB ${r.awb || "—"}`,
                  link: `/admin?tab=orders&order=${order.order_number}`,
                }))
              );
            }

            results.push({ order: order.order_number, ok: true, carrier: best.carrier, courier: best.courier, rate: best.rate, awb: r.awb });
          } catch (e: any) {
            const attempts = (order.auto_ship_attempts || 0) + 1;
            await supabase
              .from("orders")
              .update({
                auto_ship_attempts: attempts,
                auto_ship_last_error: String(e.message || e).slice(0, 500),
                updated_at: new Date().toISOString(),
              })
              .eq("id", order.id);

            // Notify admins after 3 failures or at max
            if (attempts === 3 || attempts === MAX_ATTEMPTS) {
              const { data: admins } = await supabase.from("user_roles").select("user_id").eq("role", "admin");
              if (admins?.length) {
                await supabase.from("user_notifications").insert(
                  admins.map((a) => ({
                    user_id: a.user_id,
                    type: attempts >= MAX_ATTEMPTS ? "error" : "warning",
                    title: `⚠️ Auto-ship failed (${attempts}/${MAX_ATTEMPTS}): ${order.order_number}`,
                    body: String(e.message || e).slice(0, 240),
                    link: `/admin?tab=orders&order=${order.order_number}`,
                  }))
                );
              }
            }
            results.push({ order: order.order_number, ok: false, error: String(e.message || e), attempts });
          }
        }

        const booked = results.filter((r) => r.ok).length;
        const failed = results.filter((r) => !r.ok).length;
        const skipped = (orders?.length || 0) - results.length;
        await logRun({ processed: results.length, booked, failed, skipped, results });
        return new Response(JSON.stringify({ ok: true, processed: results.length, booked, failed, skipped, results }), {
          headers: { "Content-Type": "application/json" },
        });
      },
    },
  },
});
