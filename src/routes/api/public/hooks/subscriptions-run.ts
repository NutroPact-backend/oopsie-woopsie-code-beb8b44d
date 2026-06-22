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
          .select('id')
          .eq('status', 'active')
          .lte('next_run_at', nowIso)
          .order('next_run_at', { ascending: true })
          .limit(MAX_PER_RUN);

        let created = 0;
        const errors: any[] = [];
        // Atomic per-row claim prevents duplicate orders when cron overlaps
        // or is retried. We bump next_run_at forward as a short-lived lock;
        // runSubscriptionOnce later sets it to the real next interval.
        const claimUntil = new Date(Date.now() + 5 * 60_000).toISOString();
        for (const { id } of due ?? []) {
          const { data: claimed, error: claimErr } = await supabaseAdmin
            .from('subscriptions')
            .update({ next_run_at: claimUntil })
            .eq('id', id)
            .eq('status', 'active')
            .lte('next_run_at', nowIso)
            .select('*')
            .maybeSingle();
          if (claimErr) { errors.push({ id, error: claimErr.message }); continue; }
          if (!claimed) continue; // another worker already claimed this row
          try {
            await runSubscriptionOnce(claimed);
            created++;
          } catch (e: any) {
            errors.push({ id, error: e?.message });
          }
        }
        return Response.json({ ok: true, created, errors, pending: due?.length ?? 0 });
      },
    },
  },
});
