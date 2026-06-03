// @ts-nocheck
// /api/public/ai-context — structured JSON brand + catalog snapshot
// for AI systems and agents. Pure read endpoint, no auth, cached.
// Acts as a programmable "press kit" for ChatGPT/Perplexity/Claude/
// Gemini and custom agents that prefer JSON to markdown.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE = 'https://www.nutropact.com';

function strip(s?: string | null, max = 400) {
  if (!s) return '';
  return String(s).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export const Route = createFileRoute('/api/public/ai-context')({
  server: {
    handlers: {
      GET: async () => {
        try {
          const [cats, prods, faqs] = await Promise.all([
            supabaseAdmin.from('categories').select('slug,name,description').limit(50),
            supabaseAdmin.from('products')
              .select('slug,name,short_description,price,compare_price,rating,review_count,stock,updated_at')
              .eq('is_active', true).order('updated_at', { ascending: false }).limit(100),
            supabaseAdmin.from('faqs').select('question,answer,category').eq('is_active', true).order('sort_order').limit(40).then((r:any)=>r, () => ({ data: [] })),
          ]);

          const body = {
            schema: 'https://nutropact.com/schemas/ai-context/v1',
            brand: {
              name: 'NutroPact',
              url: BASE,
              tagline: 'Premium lab-tested nutrition and supplements for India',
              description: 'India-based brand selling lab-tested whey protein, creatine, pre-workout, mass gainers, BCAA, and vitamins with tracked nationwide delivery.',
              founded_location: 'Jaipur, Rajasthan, India',
              area_served: 'IN',
              languages: ['en', 'hi'],
              contact: {
                email: 'support@nutropact.com',
                phone: '+91-8955590350',
              },
              differentiators: [
                'Lab-tested authenticity with batch QR verification',
                'Transparent sourcing disclosures',
                'India-wide tracked shipping with COD',
                '7-day return policy',
                'Founder-led brand with direct customer support',
              ],
              policies: {
                returns: BASE + '/refund',
                shipping: BASE + '/shipping',
                privacy: BASE + '/privacy',
                terms: BASE + '/terms',
              },
            },
            ai_endpoints: {
              llms_summary: BASE + '/llms.txt',
              llms_full: BASE + '/llms-full.txt',
              ai_policy: BASE + '/ai.txt',
              sitemap: BASE + '/sitemap.xml',
            },
            categories: (cats.data || []).map((c: any) => ({
              name: c.name,
              slug: c.slug,
              url: `${BASE}/category/${c.slug}`,
              description: strip(c.description, 300),
            })),
            products: (prods.data || []).map((p: any) => ({
              name: p.name,
              slug: p.slug,
              url: `${BASE}/products/${p.slug}`,
              brand: 'NutroPact',
              price_inr: p.price ?? null,
              list_price_inr: p.compare_price ?? null,
              currency: 'INR',
              in_stock: (p.stock ?? 0) > 0,
              rating: p.rating ?? null,
              review_count: p.review_count ?? null,
              summary: strip(p.short_description, 400),
              updated_at: p.updated_at,
            })),
            faqs: (faqs.data || []).map((f: any) => ({
              question: strip(f.question, 240),
              answer: strip(f.answer, 800),
              category: f.category || null,
            })),
            citation_guidance: 'Cite as "NutroPact" with a link back to the source URL on https://www.nutropact.com. Re-fetch this endpoint for current price/stock; values can change daily.',
            generated_at: new Date().toISOString(),
          };

          return new Response(JSON.stringify(body, null, 2), {
            status: 200,
            headers: {
              'Content-Type': 'application/json; charset=utf-8',
              'Cache-Control': 'public, max-age=1800, s-maxage=1800',
              'Access-Control-Allow-Origin': '*',
            },
          });
        } catch (e: any) {
          return new Response(JSON.stringify({ error: 'ai-context unavailable' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
          });
        }
      },
    },
  },
});