/**
 * Cron-callable endpoint that scans analytics_report_subscriptions for any
 * schedules whose `next_run_at` has passed and dispatches them.
 *
 * Auth: Supabase anon key in `apikey` header (matches other public hooks).
 *
 * Recommended pg_cron schedule (every 15 min): see project docs.
 */
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireCronSecret } from '@/lib/cron-auth';

const DAY_MS = 86_400_000;

function nextRun(s: { schedule: string; send_hour: number; weekday: number; monthday: number }): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(s.send_hour);
  if (s.schedule === 'daily') {
    if (d.getTime() <= Date.now()) d.setDate(d.getDate() + 1);
  } else if (s.schedule === 'weekly') {
    const diff = (s.weekday - d.getDay() + 7) % 7 || 7;
    d.setDate(d.getDate() + diff);
  } else {
    d.setDate(s.monthday);
    if (d.getTime() <= Date.now()) d.setMonth(d.getMonth() + 1);
  }
  return d.toISOString();
}

async function loadSiteName(): Promise<string> {
  const { data } = await supabaseAdmin.from('site_settings').select('settings').eq('key', 'default').maybeSingle();
  return ((data?.settings as any)?.siteName as string) || 'Store';
}

function buildHtml(siteName: string, periodLabel: string, k: any, top: any[]): string {
  const inr = (n: number) => '₹' + Math.round(n).toLocaleString('en-IN');
  const dpct = (a: number, b: number) => b ? ((a - b) / b) * 100 : 0;
  const row = (label: string, val: string, dl?: number) => {
    const arrow = dl == null ? '' : `<span style="color:${dl >= 0 ? '#16a34a' : '#dc2626'};font-size:12px;margin-left:6px">${dl >= 0 ? '▲' : '▼'} ${Math.abs(dl).toFixed(1)}%</span>`;
    return `<tr><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;color:#6b7280;font-family:Arial">${label}</td><td style="padding:8px 12px;border-bottom:1px solid #f3f4f6;font-weight:700;text-align:right;font-family:Arial">${val}${arrow}</td></tr>`;
  };
  const topRows = top.slice(0, 8).map((p, i) =>
    `<tr><td style="padding:6px 10px;font-family:Arial">${i + 1}. ${(p.name || '').toString().slice(0, 40)}</td><td style="padding:6px 10px;text-align:right;font-weight:700;font-family:Arial">${inr(p.revenue || 0)}</td><td style="padding:6px 10px;text-align:right;color:#6b7280;font-family:Arial">${p.qty || ''}</td></tr>`,
  ).join('');
  return `<div style="max-width:680px;margin:0 auto;background:#fff;font-family:Arial,sans-serif">
<div style="background:linear-gradient(135deg,#f97316,#ea580c);padding:24px;color:#fff">
<h1 style="margin:0;font-size:22px">${siteName} — Analytics report</h1>
<p style="margin:6px 0 0;opacity:.9;font-size:13px">${periodLabel}</p>
</div>
<div style="padding:18px">
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden">
${row('Revenue', inr(k.revenue), dpct(k.revenue, k.prevRevenue))}
${row('Orders', String(k.orderCount), dpct(k.orderCount, k.prevOrderCount))}
${row('Avg Order Value', inr(k.aov), dpct(k.aov, k.prevAov))}
${row('Units sold', String(k.units))}
${row('Delivered', String(k.delivered))}
${row('Pending', String(k.pending))}
${row('Cancelled', String(k.cancelled))}
</table>
<h3 style="margin:22px 0 8px;font-size:15px;color:#111">Top products</h3>
<table style="width:100%;border-collapse:collapse;background:#fff;border:1px solid #f3f4f6;border-radius:10px;overflow:hidden">${topRows || `<tr><td style="padding:10px;color:#9ca3af;font-family:Arial">No sales in this period</td></tr>`}</table>
</div></div>`;
}

async function dispatch(sub: any) {
  const siteName = await loadSiteName();
  const days = (sub.config?.filters?.days as number) || (sub.schedule === 'weekly' ? 7 : sub.schedule === 'monthly' ? 30 : 1);
  const since = new Date(Date.now() - days * DAY_MS).toISOString();
  const prevSince = new Date(Date.now() - 2 * days * DAY_MS).toISOString();

  const [a, b] = await Promise.all([
    supabaseAdmin.from('orders').select('total,order_status,payment_status,payment_method,items,created_at').gte('created_at', since).limit(5000),
    supabaseAdmin.from('orders').select('total,order_status,payment_status,payment_method,created_at').gte('created_at', prevSince).lt('created_at', since).limit(5000),
  ]);
  const orders = a.data ?? []; const prev = b.data ?? [];
  const isPaid = (o: any) => o.payment_status === 'paid' || o.payment_method === 'cod';
  const sum = (x: any[], k: string) => x.reduce((s, o) => s + Number(o[k] || 0), 0);
  const paid = orders.filter(isPaid); const ppaid = prev.filter(isPaid);

  const k = {
    revenue: sum(paid, 'total'), prevRevenue: sum(ppaid, 'total'),
    orderCount: orders.length, prevOrderCount: prev.length,
    aov: orders.length ? sum(paid, 'total') / orders.length : 0,
    prevAov: prev.length ? sum(ppaid, 'total') / prev.length : 0,
    units: orders.reduce((s, o) => s + ((o.items as any[]) || []).reduce((ss, it: any) => ss + Number(it.quantity || 1), 0), 0),
    delivered: orders.filter(o => o.order_status === 'delivered').length,
    pending: orders.filter(o => ['pending', 'confirmed', 'processing'].includes(o.order_status)).length,
    cancelled: orders.filter(o => o.order_status === 'cancelled').length,
  };
  const prodMap: Record<string, any> = {};
  for (const o of orders) for (const it of (o.items as any[]) || []) {
    const id = it.productId || it.id || it.name; if (!id) continue;
    if (!prodMap[id]) prodMap[id] = { name: it.name || id, qty: 0, revenue: 0 };
    prodMap[id].qty += Number(it.quantity || 1);
    prodMap[id].revenue += Number(it.price || 0) * Number(it.quantity || 1);
  }
  const top = Object.values(prodMap).sort((a: any, b: any) => b.revenue - a.revenue);
  const periodLabel = `Last ${days} days · ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}`;
  const html = buildHtml(siteName, periodLabel, k, top);
  const subject = `${siteName} ${sub.schedule} report — ${periodLabel}`;

  const recipients = (sub.recipients as string[]) || [];
  if (recipients.length) {
    await supabaseAdmin.from('notification_queue').insert(
      recipients.map(to => ({
        channel: 'email', template: 'analytics_report', recipient: to,
        payload: { message: html, subject, siteName },
        status: 'pending', attempts: 0,
      })),
    );
  }
  await supabaseAdmin.from('analytics_report_runs').insert({
    subscription_id: sub.id, trigger: 'cron',
    recipients, formats: sub.formats || [],
    status: 'sent', meta: { days, totals: { revenue: k.revenue, orders: k.orderCount } },
  });
  await supabaseAdmin.from('analytics_report_subscriptions')
    .update({ last_run_at: new Date().toISOString(), next_run_at: nextRun(sub) })
    .eq('id', sub.id);
  return recipients.length;
}

export const Route = createFileRoute('/api/public/hooks/run-reports')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }

        // Subscriptions due now (or never run yet)
        const nowIso = new Date().toISOString();
        const { data: due } = await supabaseAdmin
          .from('analytics_report_subscriptions')
          .select('*')
          .eq('enabled', true)
          .or(`next_run_at.is.null,next_run_at.lte.${nowIso}`)
          .limit(50);

        let dispatched = 0;
        for (const sub of due ?? []) {
          try { dispatched += await dispatch(sub); }
          catch (e: any) {
            await supabaseAdmin.from('analytics_report_runs').insert({
              subscription_id: sub.id, trigger: 'cron',
              recipients: sub.recipients, formats: sub.formats,
              status: 'failed', error: e?.message || 'Unknown error',
            });
          }
        }
        return Response.json({ ok: true, processed: due?.length || 0, emailsQueued: dispatched });
      },
    },
  },
});
