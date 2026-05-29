// @ts-nocheck
// Daily AI insights digest — called by pg_cron at 5 AM UTC.
// Uses Gemini directly (no Lovable runtime dep) to summarize last 7 days of SEO data.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { geminiJson } from '@/lib/seo.server';
import { requireCronSecret } from '@/lib/cron-auth';

export const Route = createFileRoute('/api/public/hooks/seo-insights')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) {
          return new Response(e?.message || 'Unauthorized', { status: 401 });
        }
        const periodDays = 7;
        const since = new Date(Date.now() - periodDays * 86400_000).toISOString();
        const [gsc, kw, audit] = await Promise.all([
          supabaseAdmin.from('seo_gsc_daily').select('date,clicks,impressions,ctr,position,query,page').gte('date', since.slice(0, 10)).limit(500),
          supabaseAdmin.from('seo_tracked_keywords').select('keyword,current_volume,current_kd,current_cpc,target_url,last_checked_at').limit(200),
          supabaseAdmin.from('seo_audit_issues').select('url,issue_type,severity,message').limit(100),
        ]);
        const prompt = `You are an SEO analyst for NutroPact (Indian supplements e-commerce). Analyze the last ${periodDays} days. Return JSON: {"summary":"<2-3 sentence overview>","insights":[{"type":"opportunity|alert|win|action","severity":"high|medium|low","title":"<short>","body":"<1-2 sentences>","action_url":"<optional>"}]}. Max 8 insights, prioritize high-impact.

GSC: ${JSON.stringify((gsc.data || []).slice(0, 150))}
Keywords: ${JSON.stringify((kw.data || []).slice(0, 80))}
Audit: ${JSON.stringify((audit.data || []).slice(0, 50))}`;
        try {
          const out: any = await geminiJson(prompt);
          await supabaseAdmin.from('seo_insights').insert({
            period_days: periodDays,
            summary: out.summary || '',
            insights: Array.isArray(out.insights) ? out.insights : [],
            model: 'gemini-2.5-flash',
          });
          return Response.json({ ok: true, count: (out.insights || []).length });
        } catch (e: any) {
          return Response.json({ ok: false, error: e.message }, { status: 500 });
        }
      },
    },
  },
});
