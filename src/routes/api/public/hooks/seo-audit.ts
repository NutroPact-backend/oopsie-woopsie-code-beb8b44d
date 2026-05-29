// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireCronSecret } from '@/lib/cron-auth';

async function crawl(base: string, maxPages: number) {
  const issues: Array<{ url: string; type: string; severity: 'critical' | 'warning' | 'notice'; message: string; recommendation?: string }> = [];
  const visited = new Set<string>();
  const queue: string[] = [base];
  let pagesCrawled = 0;
  const origin = new URL(base).origin;

  while (queue.length > 0 && pagesCrawled < maxPages) {
    const url = queue.shift()!;
    if (visited.has(url)) continue;
    visited.add(url);
    pagesCrawled++;
    try {
      const resp = await fetch(url, { headers: { 'User-Agent': 'NutroPactSEOBot/1.0' } });
      if (!resp.ok) {
        issues.push({ url, type: 'http_error', severity: 'critical', message: `HTTP ${resp.status}` });
        continue;
      }
      const html = await resp.text();
      const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1]?.trim() || '';
      const desc = html.match(/<meta\s+name=["']description["']\s+content=["']([^"']*)["']/i)?.[1]?.trim() || '';
      const h1Count = (html.match(/<h1[\s>]/gi) || []).length;
      const canonical = html.match(/<link\s+rel=["']canonical["']\s+href=["']([^"']*)["']/i)?.[1];

      if (!title) issues.push({ url, type: 'missing_title', severity: 'critical', message: 'Missing <title>' });
      else if (title.length > 65) issues.push({ url, type: 'long_title', severity: 'warning', message: `Title too long (${title.length})` });
      if (!desc) issues.push({ url, type: 'missing_description', severity: 'critical', message: 'Missing meta description' });
      if (h1Count === 0) issues.push({ url, type: 'missing_h1', severity: 'critical', message: 'No <h1>' });
      else if (h1Count > 1) issues.push({ url, type: 'multiple_h1', severity: 'warning', message: `${h1Count} <h1> tags` });
      if (!canonical) issues.push({ url, type: 'missing_canonical', severity: 'notice', message: 'No canonical link' });

      const linkRegex = /<a[^>]+href=["']([^"']+)["']/gi;
      let m: RegExpExecArray | null;
      while ((m = linkRegex.exec(html)) !== null && queue.length < maxPages * 2) {
        try {
          const href = new URL(m[1], url).toString().split('#')[0];
          if (href.startsWith(origin) && !visited.has(href) && !/\.(jpg|png|webp|pdf|zip|svg|ico|css|js)$/i.test(href)) {
            queue.push(href);
          }
        } catch {}
      }
    } catch (e: any) {
      issues.push({ url, type: 'fetch_error', severity: 'critical', message: e.message || 'Fetch failed' });
    }
  }
  return { pagesCrawled, issues };
}

export const Route = createFileRoute('/api/public/hooks/seo-audit')({
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
        let body: any = {};
        try { body = await request.json(); } catch {}
        // SSRF guard: ignore caller-supplied baseUrl; only crawl the configured site.
        const baseUrl = process.env.SITE_BASE_URL || 'https://nutropact.com';
        try {
          const u = new URL(baseUrl);
          if (u.protocol !== 'https:' && u.protocol !== 'http:') {
            return new Response(JSON.stringify({ error: 'Invalid SITE_BASE_URL scheme' }), { status: 500 });
          }
        } catch {
          return new Response(JSON.stringify({ error: 'Invalid SITE_BASE_URL' }), { status: 500 });
        }
        const maxPages = Math.min(50, Math.max(1, Number(body.maxPages) || 20));

        const { data: run } = await supabaseAdmin
          .from('seo_audit_runs')
          .insert({ status: 'running', pages_crawled: 0, total_issues: 0, triggered_by: null } as any)
          .select().single();
        if (!run) return new Response(JSON.stringify({ error: 'run insert failed' }), { status: 500 });

        try {
          const { pagesCrawled, issues } = await crawl(baseUrl, maxPages);
          const critical = issues.filter(i => i.severity === 'critical').length;
          const warning = issues.filter(i => i.severity === 'warning').length;
          const notice = issues.filter(i => i.severity === 'notice').length;
          if (issues.length > 0) {
            await supabaseAdmin.from('seo_audit_issues').insert(
              issues.map(i => ({
                run_id: (run as any).id,
                url: i.url,
                issue_type: i.type,
                severity: i.severity,
                message: i.message,
                recommendation: i.recommendation ?? null,
              })) as any
            );
          }
          await supabaseAdmin.from('seo_audit_runs').update({
            status: 'complete',
            pages_crawled: pagesCrawled,
            total_issues: issues.length,
            critical_count: critical,
            warning_count: warning,
            notice_count: notice,
            completed_at: new Date().toISOString(),
          } as any).eq('id', (run as any).id);
          return new Response(JSON.stringify({ ok: true, runId: (run as any).id, pagesCrawled, issues: issues.length }), {
            headers: { 'Content-Type': 'application/json' },
          });
        } catch (e: any) {
          await supabaseAdmin.from('seo_audit_runs').update({
            status: 'failed', error: e.message, completed_at: new Date().toISOString(),
          } as any).eq('id', (run as any).id);
          return new Response(JSON.stringify({ error: e.message }), { status: 500 });
        }
      },
    },
  },
});
