// @ts-nocheck
// Recover abandoned carts — called by pg_cron every 15 min.
// Auth: Supabase anon key in `apikey` header.
//
// Tiered auto-offers (escalating):
//   notify_count=0 → T1 @ 2h  — gentle nudge, no coupon
//   notify_count=1 → T2 @ 24h — 10% off (cart-specific single-use coupon)
//   notify_count=2 → T3 @ 48h — 15% off + free shipping (final reminder)
//   >72h idle      → expire
//
// Multi-channel per tier: email + in-app + whatsapp + sms (if phone) + push (if subscribed)
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireCronSecret } from '@/lib/cron-auth';

const HOURS_BEFORE_EXPIRE = 72;
const MAX_PER_RUN = 50;

type Tier = { t: 1 | 2 | 3; hours: number; discount: number; freeShip: boolean; label: string };

const TIERS: Tier[] = [
  { t: 1, hours: 2,  discount: 0,  freeShip: false, label: 'Gentle nudge' },
  { t: 2, hours: 24, discount: 10, freeShip: false, label: '10% off' },
  { t: 3, hours: 48, discount: 15, freeShip: true,  label: '15% off + free shipping' },
];

function recoveryUrl(token: string, origin: string, coupon?: string) {
  const base = `${origin}/cart?recover=${encodeURIComponent(token)}`;
  return coupon ? `${base}&coupon=${encodeURIComponent(coupon)}` : base;
}

function genCouponCode(prefix: string) {
  const r = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `${prefix}${r}`;
}

async function createCartCoupon(tier: Tier): Promise<string | null> {
  if (tier.discount <= 0) return null;
  const code = genCouponCode(tier.t === 2 ? 'BACK10-' : 'BACK15-');
  const expiresAt = new Date(Date.now() + 24 * 3600_000).toISOString();
  const { error } = await supabaseAdmin.from('coupons').insert({
    code,
    type: 'percent',
    value: tier.discount,
    label: `Cart recovery — ${tier.label}`,
    active: true,
    min_order_value: 0,
    max_discount: null,
    usage_limit: 1,
    usage_count: 0,
    expires_at: expiresAt,
  });
  if (error) { console.error('coupon insert', error); return null; }
  return code;
}

export const Route = createFileRoute('/api/public/hooks/recover-carts')({
  server: {
    handlers: {
      POST: async ({ request }) => {
        try { await requireCronSecret(); }
        catch (e: any) { return new Response(e?.message || 'Unauthorized', { status: 401 }); }

        const now = Date.now();
        const expireBefore = new Date(now - HOURS_BEFORE_EXPIRE * 3600_000).toISOString();

        // 1) Expire stale ones
        const { data: expiredRows } = await supabaseAdmin
          .from('abandoned_carts')
          .update({ status: 'expired' })
          .in('status', ['active', 'notified'])
          .lt('last_activity_at', expireBefore)
          .select('id');
        const expiredCount = expiredRows?.length ?? 0;

        const origin = new URL(request.url).origin;
        let notified = 0;
        const byTier = { 1: 0, 2: 0, 3: 0 };

        for (const tier of TIERS) {
          const cutoff = new Date(now - tier.hours * 3600_000).toISOString();
          const remaining = MAX_PER_RUN - notified;
          if (remaining <= 0) break;

          const { data: carts } = await supabaseAdmin
            .from('abandoned_carts')
            .select('*')
            .in('status', ['active', 'notified'])
            .eq('notify_count', tier.t - 1)
            .lt('last_activity_at', cutoff)
            .gt('subtotal', 0)
            .order('last_activity_at', { ascending: true })
            .limit(remaining);

          for (const c of carts ?? []) {
            const couponCode = await createCartCoupon(tier);
            const link = recoveryUrl(c.recovery_token, origin, couponCode || undefined);
            const itemsArr = (c.items as any[]) || [];
            const itemsLabel = itemsArr.slice(0, 3).map((i: any) => i.name).join(', ') || 'your selection';
            const more = itemsArr.length > 3 ? ` +${itemsArr.length - 3} more` : '';

            const offerLine = couponCode
              ? ` Use code ${couponCode} for ${tier.discount}% off${tier.freeShip ? ' + free shipping' : ''} (24h only).`
              : '';
            const body = `Aapne ${itemsLabel}${more} cart me chhoda tha.${offerLine} Wapas aaiye!`;
            const title = tier.t === 1
              ? '🛒 Aapka cart wait kar raha hai'
              : tier.t === 2
                ? `🎁 ${tier.discount}% OFF — cart wapas chahiye?`
                : `⏳ Last chance: ${tier.discount}% OFF + Free Shipping`;

            const payload = {
              cartId: c.id,
              tier: tier.t,
              customerName: c.customer_name || '',
              itemCount: c.item_count,
              subtotal: c.subtotal,
              items: itemsLabel,
              link,
              couponCode,
              discount: tier.discount,
              freeShip: tier.freeShip,
              title,
              body,
            };

            // In-app notification (if user logged in)
            if (c.user_id) {
              await supabaseAdmin.from('user_notifications').insert({
                user_id: c.user_id,
                title,
                body,
                type: 'info',
                link: '/cart',
              });
            }

            // Email
            if (c.customer_email) {
              await supabaseAdmin.from('notification_queue').insert({
                user_id: c.user_id,
                channel: 'email',
                template: 'abandoned_cart',
                recipient: c.customer_email,
                payload,
              });
            }

            // WhatsApp + SMS
            if (c.customer_phone) {
              await supabaseAdmin.from('notification_queue').insert([
                {
                  user_id: c.user_id,
                  channel: 'whatsapp',
                  template: 'abandoned_cart',
                  recipient: c.customer_phone,
                  payload,
                  status: 'pending_external',
                },
                {
                  user_id: c.user_id,
                  channel: 'sms',
                  template: 'abandoned_cart',
                  recipient: c.customer_phone,
                  payload,
                  status: 'pending_external',
                },
              ]);
            }

            // Push (web push) — queued for dispatcher to send
            if (c.user_id) {
              const { data: subs } = await supabaseAdmin
                .from('push_subscriptions')
                .select('endpoint')
                .eq('user_id', c.user_id)
                .limit(5);
              for (const s of subs ?? []) {
                await supabaseAdmin.from('notification_queue').insert({
                  user_id: c.user_id,
                  channel: 'push',
                  template: 'abandoned_cart',
                  recipient: s.endpoint,
                  payload,
                  status: 'pending_external',
                });
              }
            }

            await supabaseAdmin
              .from('abandoned_carts')
              .update({
                status: 'notified',
                notified_at: new Date().toISOString(),
                notify_count: tier.t,
              })
              .eq('id', c.id);

            notified++;
            byTier[tier.t]++;
          }
        }

        return Response.json({
          ok: true,
          notified,
          byTier,
          expired: expiredCount,
        });
      },
    },
  },
});
