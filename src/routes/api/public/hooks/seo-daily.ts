// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { semrushCsv, csvToObjects, gscFetch } from '@/lib/seo.server';
import { requireCronSecret } from '@/lib/cron-auth';

const DB = 'in';

async function refreshKeywords() {
  const { data: kws } = await supabaseAdmin
    .from('seo_tracked_keywords')
    .select('id, keyword, database')
    .limit(200);
  if (!kws || kws.length === 0) return { updated: 0 };
  let updated = 0;
  for (const k of kws as any[]) {
    try {
      const r = await semrushCsv({
        type: 'phrase_this',
        phrase: k.keyword,
        database: k.database || DB,
        export_columns: 'Ph,Nq,Cp,Co,Kd',
      });
      const o = csvToObjects(r)[0];
      if (!o) continue;
      const vol = parseInt(o.Nq || '0', 10) || null;
      const cpc = parseFloat(o.Cp || '0') || null;
      const kd = parseFloat(o.Kd || '0') || null;
      await supabaseAdmin
        .from('seo_tracked_keywords')
        .update({
          current_volume: vol,
          current_cpc: cpc,
          current_kd: kd,
          last_checked_at: new Date().toISOString(),
        } as any)
        .eq('id', k.id);
      await supabaseAdmin.from('seo_keyword_history').insert({
        keyword_id: k.id,
        volume: vol,
        cpc,
        kd,
        checked_at: new Date().toISOString(),
      } as any);
      updated++;
    } catch (e) {
      // skip individual failures (e.g. Semrush quota)
    }
  }
  return { updated };
}

async function syncGsc() {
  const site = process.env.GSC_SITE_URL;
  if (!site) return { skipped: 'no_gsc_site' };
  const day = new Date(Date.now() - 3 * 86400_000).toISOString().slice(0, 10);
  const siteEnc = encodeURIComponent(site);
  try {
    const totals = await gscFetch(
      `/webmasters/v3/sites/${siteEnc}/searchAnalytics/query`,
      {
        method: 'POST',
        body: JSON.stringify({ startDate: day, endDate: day, dimensions: [] }),
      }
    );
    const row = totals.rows?.[0];
    if (!row) return { day, no_data: true };
    await supabaseAdmin.from('seo_gsc_daily').upsert(
      {
        day,
        site,
        clicks: Math.round(row.clicks || 0),
        impressions: Math.round(row.impressions || 0),
        ctr: row.ctr || 0,
        position: row.position || 0,
      } as any,
      { onConflict: 'day,site' }
    );
    return { day, clicks: row.clicks, impressions: row.impressions };
  } catch (e: any) {
    return { gsc_error: e.message };
  }
}

export const Route = createFileRoute('/api/public/hooks/seo-daily')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) {
          return new Response(JSON.stringify({ error: e?.message || 'Unauthorized' }), {
            status: 401,
            headers: { 'Content-Type': 'application/json' },
          });
        }
        const [kw, gsc] = await Promise.all([
          refreshKeywords().catch((e) => ({ error: e.message })),
          syncGsc().catch((e) => ({ error: e.message })),
        ]);
        return new Response(
          JSON.stringify({ ok: true, keywords: kw, gsc, at: new Date().toISOString() }),
          { headers: { 'Content-Type': 'application/json' } }
        );
      },
    },
  },
});
