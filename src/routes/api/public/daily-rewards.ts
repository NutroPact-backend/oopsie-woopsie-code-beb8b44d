// @ts-nocheck
/**
 * Daily cron: birthday + anniversary wallet credits, and refresh of
 * "frequently bought together" cooccurrence cache.
 *
 * Auth: shared MESSAGING_CRON_SECRET (env or site_settings.messaging.cronSecret)
 * via Bearer or ?secret=.
 *
 * curl -X POST -H "Authorization: Bearer <secret>" \
 *   https://<host>/api/public/daily-rewards
 */
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { runOccasionRewards, refreshRecommendationsCache } from '@/lib/occasions.functions';

async function authorize(request: Request): Promise<boolean> {
  const url = new URL(request.url);
  const auth = request.headers.get('authorization') || request.headers.get('Authorization');
  const token = (auth?.replace(/^Bearer\s+/i, '').trim() || '') || url.searchParams.get('secret') || '';
  const envSecret = process.env.MESSAGING_CRON_SECRET || '';
  const { data } = await supabaseAdmin
    .from('site_settings').select('settings').eq('key', 'messaging').maybeSingle();
  const cfgSecret = ((data?.settings as any)?.cronSecret as string) || '';
  const expected = envSecret || cfgSecret;
  if (!expected) return false;
  return !!token && token === expected;
}

async function run(request: Request) {
  if (!(await authorize(request))) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401, headers: { 'Content-Type': 'application/json' },
    });
  }
  try {
    const [occ, cache] = await Promise.all([
      runOccasionRewards({ data: {} } as any).catch((e: any) => ({ error: e?.message || 'occasion failed' })),
      refreshRecommendationsCache({ data: {} } as any).catch((e: any) => ({ error: e?.message || 'cache failed' })),
    ]);
    return new Response(JSON.stringify({ ok: true, occasions: occ, recommendationsCache: cache }), {
      status: 200, headers: { 'Content-Type': 'application/json' },
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ ok: false, error: e?.message || 'failed' }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}

export const Route = createFileRoute('/api/public/daily-rewards')({
  server: {
    handlers: {
      POST: ({ request }) => run(request),
      GET: ({ request }) => run(request),
    },
  },
});
