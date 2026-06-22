// @ts-nocheck
// Cron-callable endpoint: generate invoices for paid/confirmed orders that
// don't have one yet, and queue an "invoice_ready" email to the customer.
//
// Call with apikey header (Supabase anon/publishable key) per project convention.
import { createFileRoute } from "@tanstack/react-router";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { buildInvoiceSnapshot } from "@/lib/invoice.shared";
import { requireCronSecret } from "@/lib/cron-auth";

async function guarded() {
  try { await requireCronSecret(); }
  catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }
  return run();
}

export const Route = createFileRoute("/api/public/auto-invoice")({
  server: {
    handlers: {
      POST: async () => guarded(),
      GET: async () => guarded(),
    },
  },
});

async function run() {
  try {
    // Load seller settings once
    const { data: settingsRow } = await supabaseAdmin
      .from("site_settings").select("settings").eq("key", "default").maybeSingle();
    const st: any = (settingsRow as any)?.settings || {};
    const gstCfg: any = st.gst || {};
    const seller = {
      legalName: gstCfg.legalName || st.siteName || "",
      address: gstCfg.address || st.address || "",
      gstin: gstCfg.gstin || st.gstin || "",
      stateCode: String(gstCfg.stateCode || "").trim(),
      email: st.email || "",
      phone: st.phone || "",
      invoicePrefix: gstCfg.invoicePrefix || "INV",
      defaultHsn: gstCfg.defaultHsn || "2106",
      defaultGstRate: Number(gstCfg.defaultGstRate ?? 5),
    };

    // Candidate orders: paid OR confirmed/processing (cod) and not yet invoiced
    const { data: orders } = await supabaseAdmin
      .from("orders")
      .select("*")
      .or("payment_status.eq.paid,order_status.in.(confirmed,processing,shipped,delivered)")
      .order("created_at", { ascending: false })
      .limit(50);

    const list = orders || [];
    if (!list.length) return Response.json({ ok: true, generated: 0, emailed: 0 });

    const nums = list.map((o: any) => o.order_number);
    const { data: existing } = await supabaseAdmin
      .from("invoices").select("order_number,invoice_number,emailed_at").in("order_number", nums);
    const existingMap = new Map((existing || []).map((i: any) => [i.order_number, i]));

    // Collect all product ids
    const pidSet = new Set<string>();
    list.forEach((o: any) => (o.items || []).forEach((it: any) => {
      const id = String(it.productId || it.id || "");
      if (id) pidSet.add(id);
    }));
    const pids = Array.from(pidSet);
    const { data: prods } = pids.length
      ? await supabaseAdmin.from("products").select("id,hsn_code,gst_rate").in("id", pids)
      : { data: [] as any[] };
    const productMap = new Map<string, { hsnCode: string; gstRate: number }>();
    (prods || []).forEach((p: any) => productMap.set(p.id,
      { hsnCode: p.hsn_code || "", gstRate: Number(p.gst_rate ?? 5) }));

    let generated = 0, emailed = 0;
    for (const ord of list) {
      let inv = existingMap.get(ord.order_number);
      if (!inv) {
        const snapshot = buildInvoiceSnapshot(ord, productMap, seller);
        const { data: numRow } = await supabaseAdmin.rpc("next_invoice_number");
        const invoiceNumber = (numRow as unknown as string) || `INV-${Date.now()}`;
        const { data: created, error } = await supabaseAdmin.from("invoices").insert({
          id: crypto.randomUUID(),
          order_id: ord.id,
          order_number: ord.order_number,
          invoice_number: invoiceNumber,
          snapshot,
        }).select().single();
        if (error) continue;
        inv = created as any;
        generated++;
      }

      // Queue invoice_ready email if not emailed yet and we have customer email
      if (inv && !inv.emailed_at && ord.customer_email) {
        const { error: qErr } = await supabaseAdmin.from("notification_queue").insert({
          user_id: ord.user_id,
          order_number: ord.order_number,
          channel: "email",
          template: "invoice_ready",
          recipient: ord.customer_email,
          payload: {
            orderNumber: ord.order_number,
            invoiceNumber: inv.invoice_number,
            customerName: ord.customer_name,
            total: ord.total,
            invoiceUrl: `/invoice/${ord.order_number}`,
          },
        });
        if (!qErr) {
          await supabaseAdmin.from("invoices").update({ emailed_at: new Date().toISOString() })
            .eq("order_number", ord.order_number);
          emailed++;
        }
      }
    }

    return Response.json({ ok: true, generated, emailed, scanned: list.length });
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
