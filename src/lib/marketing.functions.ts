import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { supabaseAdmin } from '@/integrations/supabase/client.server';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';

// ── Admin guard ──────────────────────────────────────────────────────────
async function ensureAdmin(userId: string) {
  const { data } = await supabaseAdmin
    .from('user_roles').select('role').eq('user_id', userId).eq('role', 'admin').maybeSingle();
  if (!data) throw new Error('Forbidden');
}

// ── Public read (for __root + storefront injection) ──────────────────────
export const getMarketingPublic = createServerFn({ method: 'GET' })
  .handler(async () => {
    const { data } = await supabaseAdmin
      .from('marketing_settings')
      .select('gsc_verification,bing_verification,pinterest_verification,yandex_verification,pinterest_tag_id,linkedin_partner_id,twitter_pixel_id,reddit_pixel_id,quora_pixel_id,og_site_name,og_default_image,twitter_site_handle,twitter_card_type,hreflang,org_legal_name,org_phone,org_address,org_same_as,ab_experiments,org_email,org_slogan,org_founding_date,org_opening_hours,ai_brand_description,ai_mission,ai_usps,ai_facts,ai_founder,ai_policy_text,ai_allow_training,ai_allow_inference,llms_intro,llms_extra_sections,geo_latitude,geo_longitude,geo_service_areas,geo_price_range,speakable_enabled')
      .eq('key', 'default').maybeSingle();
    return { config: data || {} };
  });

// ── Admin read (full) ────────────────────────────────────────────────────
export const getMarketingAdmin = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('marketing_settings').select('*').eq('key', 'default').maybeSingle();
    return { config: data || {} };
  });

// ── Save ─────────────────────────────────────────────────────────────────
export const saveMarketingSettings = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { patch: Record<string, any> }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const patch = { ...data.patch, key: 'default', updated_at: new Date().toISOString() };
    const { data: row, error } = await supabaseAdmin
      .from('marketing_settings').upsert(patch, { onConflict: 'key' }).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, config: row };
  });

// ── UTM campaigns ────────────────────────────────────────────────────────
export const listUtmCampaigns = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('utm_campaigns').select('*').order('created_at', { ascending: false }).limit(500);
    return { items: data || [] };
  });

export const saveUtmCampaign = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id?: string; row: Record<string, any> }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    const row = { ...data.row, updated_at: new Date().toISOString() };
    if (data.id) {
      const { data: r, error } = await supabaseAdmin.from('utm_campaigns').update(row).eq('id', data.id).select().single();
      if (error) throw new Error(error.message);
      return { ok: true, item: r };
    }
    const { data: r, error } = await supabaseAdmin.from('utm_campaigns').insert(row as any).select().single();
    if (error) throw new Error(error.message);
    return { ok: true, item: r };
  });

export const deleteUtmCampaign = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { id: string }) => d)
  .handler(async ({ data, context }) => {
    await ensureAdmin(context.userId);
    await supabaseAdmin.from('utm_campaigns').delete().eq('id', data.id);
    return { ok: true };
  });

// ── Server-side conversion: FB CAPI + GA4 MP ─────────────────────────────
async function sha256(s: string) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s.trim().toLowerCase()));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

export const sendConversion = createServerFn({ method: 'POST' })
  .inputValidator((d: {
    eventName: string; orderNumber?: string; value?: number; currency?: string;
    email?: string; phone?: string; clientId?: string; eventId?: string;
    sourceUrl?: string; userAgent?: string; ip?: string;
  }) => d)
  .handler(async ({ data }) => {
    const { data: cfg } = await supabaseAdmin.from('marketing_settings').select('*').eq('key', 'default').maybeSingle();
    if (!cfg) return { ok: false, error: 'no_config' };

    const eventId = data.eventId || `${data.eventName}-${data.orderNumber || ''}-${Date.now()}`;
    const results: any = {};

    // FB CAPI
    if (cfg.fb_capi_pixel_id && cfg.fb_capi_access_token) {
      const userData: any = {};
      if (data.email) userData.em = [await sha256(data.email)];
      if (data.phone) userData.ph = [await sha256(data.phone.replace(/\D/g, ''))];
      if (data.ip) userData.client_ip_address = data.ip;
      if (data.userAgent) userData.client_user_agent = data.userAgent;

      const body = {
        data: [{
          event_name: data.eventName,
          event_time: Math.floor(Date.now() / 1000),
          event_id: eventId,
          event_source_url: data.sourceUrl,
          action_source: 'website',
          user_data: userData,
          custom_data: { value: data.value ?? 0, currency: data.currency || 'INR', order_id: data.orderNumber },
        }],
        ...(cfg.fb_capi_test_event_code ? { test_event_code: cfg.fb_capi_test_event_code } : {}),
      };
      try {
        const r = await fetch(`https://graph.facebook.com/v19.0/${cfg.fb_capi_pixel_id}/events?access_token=${cfg.fb_capi_access_token}`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
        });
        const j = await r.json();
        results.fb = { ok: r.ok, response: j };
        await supabaseAdmin.from('marketing_events').insert({
          channel: 'fb_capi', event_name: data.eventName, order_number: data.orderNumber,
          value: data.value, currency: data.currency, payload: body, response: j,
          status: r.ok ? 'sent' : 'failed', error: r.ok ? '' : JSON.stringify(j),
        });
      } catch (e: any) { results.fb = { ok: false, error: e.message }; }
    }

    // GA4 MP
    if (cfg.ga4_measurement_id && cfg.ga4_api_secret) {
      const body = {
        client_id: data.clientId || crypto.randomUUID(),
        events: [{
          name: data.eventName,
          params: {
            value: data.value ?? 0, currency: data.currency || 'INR',
            transaction_id: data.orderNumber, engagement_time_msec: 100,
          },
        }],
      };
      try {
        const r = await fetch(`https://www.google-analytics.com/mp/collect?measurement_id=${cfg.ga4_measurement_id}&api_secret=${cfg.ga4_api_secret}`, {
          method: 'POST', body: JSON.stringify(body),
        });
        results.ga4 = { ok: r.ok, status: r.status };
        await supabaseAdmin.from('marketing_events').insert({
          channel: 'ga4_mp', event_name: data.eventName, order_number: data.orderNumber,
          value: data.value, currency: data.currency, payload: body,
          response: { status: r.status }, status: r.ok ? 'sent' : 'failed',
        });
      } catch (e: any) { results.ga4 = { ok: false, error: e.message }; }
    }

    return { ok: true, eventId, results };
  });

// ── Conversion log (admin) ───────────────────────────────────────────────
export const listConversionLog = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const { data } = await supabaseAdmin.from('marketing_events').select('*').order('created_at', { ascending: false }).limit(100);
    return { items: data || [] };
  });

// ── ROAS dashboard data ──────────────────────────────────────────────────
export const getMarketingDashboard = createServerFn({ method: 'GET' })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context.userId);
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const [{ data: camps }, { data: events }] = await Promise.all([
      supabaseAdmin.from('utm_campaigns').select('*'),
      supabaseAdmin.from('marketing_events').select('channel,status,created_at').gte('created_at', since),
    ]);
    const totalSpend = (camps || []).reduce((s, c: any) => s + Number(c.spend || 0), 0);
    const totalRevenue = (camps || []).reduce((s, c: any) => s + Number(c.revenue || 0), 0);
    const totalConv = (camps || []).reduce((s, c: any) => s + Number(c.conversions || 0), 0);
    const totalClicks = (camps || []).reduce((s, c: any) => s + Number(c.clicks || 0), 0);
    return {
      roas: totalSpend > 0 ? totalRevenue / totalSpend : 0,
      totalSpend, totalRevenue, totalConv, totalClicks,
      ctr: totalClicks > 0 ? totalConv / totalClicks : 0,
      campaigns: camps || [],
      eventsByChannel: (events || []).reduce((a: any, e: any) => {
        a[e.channel] = (a[e.channel] || 0) + 1; return a;
      }, {}),
    };
  });

// ── Browser-initiated purchase CAPI dispatch (ANL-004 dedup) ─────────────
// Called from CheckoutPage right after the client-side pixel fires. Server
// looks up the order so the browser cannot tamper with value/email, and
// uses the deterministic eventId `purchase-<orderNumber>` so FB matches it
// with the browser pixel's eventID and dedupes (no double-count).
export const dispatchPurchaseConversion = createServerFn({ method: 'POST' })
  .inputValidator((d: { orderNumber: string }) => d)
  .handler(async ({ data }) => {
    if (!data?.orderNumber) return { ok: false, error: 'order_required' };
    const { data: order } = await supabaseAdmin
      .from('orders')
      .select('order_number,total,customer_email,customer_phone,user_id')
      .eq('order_number', data.orderNumber)
      .maybeSingle();
    if (!order) return { ok: false, error: 'order_not_found' };

    const { data: cfg } = await supabaseAdmin
      .from('marketing_settings').select('*').eq('key', 'default').maybeSingle();
    if (!cfg?.fb_capi_pixel_id || !cfg?.fb_capi_access_token) {
      return { ok: true, skipped: 'fb_capi_not_configured' };
    }

    const eventId = `purchase-${order.order_number}`;
    // Idempotency: skip if we've already pushed this exact eventId
    const { data: prior } = await supabaseAdmin
      .from('marketing_events')
      .select('id')
      .eq('channel', 'fb_capi')
      .eq('order_number', order.order_number)
      .contains('payload', { data: [{ event_id: eventId }] } as any)
      .limit(1)
      .maybeSingle();
    if (prior) return { ok: true, deduped: true, eventId };

    const userData: any = {};
    if (order.customer_email) userData.em = [await sha256(order.customer_email)];
    if (order.customer_phone) userData.ph = [await sha256(String(order.customer_phone).replace(/\D/g, ''))];

    const body = {
      data: [{
        event_name: 'Purchase',
        event_time: Math.floor(Date.now() / 1000),
        event_id: eventId,
        action_source: 'website',
        user_data: userData,
        custom_data: { value: Number(order.total || 0), currency: 'INR', order_id: order.order_number },
      }],
      ...(cfg.fb_capi_test_event_code ? { test_event_code: cfg.fb_capi_test_event_code } : {}),
    };

    try {
      const r = await fetch(`https://graph.facebook.com/v19.0/${cfg.fb_capi_pixel_id}/events?access_token=${cfg.fb_capi_access_token}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      const j = await r.json();
      await supabaseAdmin.from('marketing_events').insert({
        channel: 'fb_capi', event_name: 'Purchase', order_number: order.order_number,
        value: Number(order.total || 0), currency: 'INR', payload: body, response: j,
        status: r.ok ? 'sent' : 'failed', error: r.ok ? '' : JSON.stringify(j),
      });
      return { ok: r.ok, eventId, response: j };
    } catch (e: any) {
      return { ok: false, error: e?.message || 'fetch_failed' };
    }
  });
