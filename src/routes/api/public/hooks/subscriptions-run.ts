// @ts-nocheck
// Process due subscriptions — called by pg_cron every hour.
// Auth: Supabase anon key in `apikey` header.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { runSubscriptionOnce } from '@/lib/subscriptions.functions';
import { requireCronSecret } from '@/lib/cron-auth';

const MAX_PER_RUN = 100;

export const Route = createFileRoute('/api/public/hooks/subscriptions-run')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }

        const nowIso = new Date().toISOString();
        const { data: due } = await supabaseAdmin
          .from('subscriptions')
          .select('*')
          .eq('status', 'active')
          .lte('next_run_at', nowIso)
          .order('next_run_at', { ascending: true })
          .limit(MAX_PER_RUN);

        let created = 0;
        const errors: any[] = [];
        for (const sub of due ?? []) {
          try {
            await runSubscriptionOnce(sub);
            created++;
          } catch (e: any) {
            errors.push({ id: sub.id, error: e?.message });
          }
        }
        return Response.json({ ok: true, created, errors, pending: due?.length ?? 0 });
      },
    },
  },
});
