/**
 * Embeddable SVG trust badge for retailer pages.
 * GET /api/public/trust-badge?batch=BATCH123
 * Returns an SVG that retailers can embed via <img src="..."> in product listings.
 */
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

function svg(label: string, value: string, color: string) {
  const labelW = Math.max(60, label.length * 6.5 + 14);
  const valueW = Math.max(60, value.length * 7 + 14);
  const total = labelW + valueW;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${total}" height="28" role="img" aria-label="${label}: ${value}">
  <linearGradient id="g" x2="0" y2="100%"><stop offset="0" stop-opacity=".1" stop-color="#fff"/><stop offset="1" stop-opacity=".1"/></linearGradient>
  <clipPath id="r"><rect width="${total}" height="28" rx="4" fill="#fff"/></clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelW}" height="28" fill="#1f2937"/>
    <rect x="${labelW}" width="${valueW}" height="28" fill="${color}"/>
    <rect width="${total}" height="28" fill="url(#g)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,Segoe UI,Helvetica,Arial,sans-serif" font-size="12" font-weight="600">
    <text x="${labelW / 2}" y="19">${label}</text>
    <text x="${labelW + valueW / 2}" y="19">${value}</text>
  </g>
</svg>`;
}

async function handle(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const batchRaw = (url.searchParams.get('batch') || '').trim().toUpperCase();
  const headers = {
    'Content-Type': 'image/svg+xml; charset=utf-8',
    'Cache-Control': 'public, max-age=300',
    'Access-Control-Allow-Origin': '*',
  };

  if (!batchRaw || !/^[A-Z0-9-]{1,32}$/.test(batchRaw)) {
    return new Response(svg('ProofPack', 'invalid', '#dc2626'), { headers });
  }

  const { data: codes } = await supabaseAdmin
    .from('product_auth_codes')
    .select('status')
    .eq('batch_code', batchRaw);

  if (!codes || codes.length === 0) {
    return new Response(svg('ProofPack', 'unknown', '#6b7280'), { headers });
  }
  const flagged = codes.filter((c: any) => String(c.status).startsWith('flagged') || c.status === 'blocked').length;
  const trust = Math.round(((codes.length - flagged) / codes.length) * 100);
  const color = trust >= 95 ? '#16a34a' : trust >= 80 ? '#ca8a04' : '#dc2626';
  return new Response(svg('ProofPack', `${trust}% authentic`, color), { headers });
}

export const Route = createFileRoute('/api/public/trust-badge')({
  server: {
    handlers: {
      GET: ({ request }) => handle(request),
    },
  },
});
