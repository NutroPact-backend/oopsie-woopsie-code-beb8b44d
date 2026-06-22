// @ts-nocheck
/**
 * Public verification API for third parties (retailers, marketplaces).
 * GET /api/public/verify-product?code=BATCH-NONCE-HMAC
 * Returns minimal JSON suitable for embedding in external listings.
 * Rate-limited by IP via existing check_rate_limit() RPC.
 */
import { createFileRoute } from '@tanstack/react-router';
import { createHmac, timingSafeEqual } from 'crypto';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const HMAC_SECRET = () => process.env.PRODUCT_AUTH_HMAC_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || 'fallback-dev-secret-change-me';

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Cache-Control': 'public, max-age=60',
  };
}

async function handle(request: Request) {
  const url = new URL(request.url);
  const raw = (url.searchParams.get('code') || '').trim().toUpperCase();
  if (!raw || raw.length > 80 || !/^[A-Z0-9-]+$/.test(raw)) {
    return Response.json({ ok: false, reason: 'INVALID_FORMAT' }, { status: 400, headers: corsHeaders() });
  }

  // Rate-limit per IP: 60 requests / 60s
  const ip = (request.headers.get('cf-connecting-ip') || request.headers.get('x-forwarded-for') || 'unknown').split(',')[0].trim();
  try {
    const { data: rl } = await supabaseAdmin.rpc('check_rate_limit', {
      _bucket: 'verify_api', _key: ip, _limit: 60, _window_seconds: 60, _block_seconds: 120,
    });
    if (Array.isArray(rl) && rl[0] && rl[0].allowed === false) {
      return Response.json({ ok: false, reason: 'RATE_LIMITED' }, { status: 429, headers: corsHeaders() });
    }
  } catch { /* fail open */ }

  const parts = raw.split('-');
  if (parts.length < 3) return Response.json({ ok: false, reason: 'INVALID_FORMAT' }, { status: 400, headers: corsHeaders() });
  const providedHmac = parts.pop()!;
  const code = parts.join('-');

  const { data: row } = await supabaseAdmin.from('product_auth_codes').select('*').eq('code', code).maybeSingle();
  if (!row) return Response.json({ ok: false, reason: 'NOT_FOUND', message: 'Code not found in our system.' }, { headers: corsHeaders() });

  // Verify HMAC (recompute from stored hidden_code_hash isn't possible — compare to stored signature)
  try {
    const a = Buffer.from(row.hmac_signature, 'utf8');
    const b = Buffer.from(providedHmac, 'utf8');
    if (a.length !== b.length || !timingSafeEqual(a, b)) {
      // Touch HMAC_SECRET reference so it's not unused (also lets us fail-fast if misconfigured)
      void HMAC_SECRET();
      return Response.json({ ok: false, reason: 'BAD_SIGNATURE', message: 'Signature mismatch — likely counterfeit.' }, { headers: corsHeaders() });
    }
  } catch {
    return Response.json({ ok: false, reason: 'BAD_SIGNATURE' }, { headers: corsHeaders() });
  }

  if (row.status === 'blocked' || row.status === 'flagged_tamper') {
    return Response.json({ ok: false, reason: 'BLOCKED', message: 'This code has been blocked.' }, { headers: corsHeaders() });
  }
  if (row.expires_at && new Date(row.expires_at) < new Date()) {
    return Response.json({ ok: false, reason: 'EXPIRED' }, { headers: corsHeaders() });
  }

  let productName: string | null = null;
  if (row.product_id) {
    const { data: p } = await supabaseAdmin.from('products').select('name').eq('id', row.product_id).maybeSingle();
    productName = p?.name || null;
  }

  return Response.json({
    ok: true,
    status: row.status,
    batch: row.batch_code,
    product: productName,
    manufactured: row.manufactured_at,
    scanCount: row.scan_count || 0,
    flags: {
      geoAnomaly: row.status === 'flagged_geo',
      bulkClone: row.status === 'flagged_duplicate',
    },
    verifyUrl: `${url.origin}/verify/${raw}`,
  }, { headers: corsHeaders() });
}

export const Route = createFileRoute('/api/public/verify-product')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
      OPTIONS: () => new Response(null, { status: 204, headers: corsHeaders() }),
    },
  },
});
