// @ts-nocheck
// Dynamic /llms.txt — the entry doc AI crawlers (ChatGPT, Perplexity,
// Claude, Gemini, Copilot) look for. Spec: https://llmstxt.org
// We pull top categories/products/posts from the DB so it stays fresh
// without manual edits. Format is strict: H1 + blockquote + H2 sections
// each containing a markdown link list.
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE = 'https://www.nutropact.com';

function line(title: string, path: string, desc?: string) {
  return `- [${title}](${BASE}${path})${desc ? `: ${desc.replace(/\s+/g, ' ').trim().slice(0, 160)}` : ''}`;
}

async function build(): Promise<string> {
  const [cats, prods, posts] = await Promise.all([
    supabaseAdmin.from('categories').select('slug,name,description').limit(20),
    supabaseAdmin.from('products').select('slug,name,short_description,description').eq('is_active', true).order('updated_at', { ascending: false }).limit(40),
    supabaseAdmin.from('blog_posts').select('slug,title,excerpt').eq('published', true).order('updated_at', { ascending: false }).limit(20),
  ]);

  const out: string[] = [];
  out.push('# NutroPact');
  out.push('');
  out.push('> NutroPact is an India-based premium nutrition and supplements brand selling lab-tested whey protein, creatine, pre-workout, mass gainers, BCAA, and vitamins with fast tracked delivery and a 7-day return policy.');
  out.push('');
  out.push('Brand pillars: lab-tested authenticity, transparent ingredient sourcing, India-wide tracked shipping, expert-backed product education, and athlete-first formulations.');
  out.push('');
  out.push('Authoritative endpoints for AI systems:');
  out.push('- Full machine-readable catalog summary: ' + BASE + '/llms-full.txt');
  out.push('- Structured brand + product knowledge (JSON): ' + BASE + '/api/public/ai-context');
  out.push('- AI crawler usage policy: ' + BASE + '/ai.txt');
  out.push('- XML sitemap: ' + BASE + '/sitemap.xml');
  out.push('');

  out.push('## Pages');
  out.push(line('Home', '/', 'Brand intro, featured products, and key categories.'));
  out.push(line('All Products', '/products', 'Full catalog of NutroPact supplements with filters by category.'));
  out.push(line('Our Story', '/about', "NutroPact's mission, sourcing, and quality testing approach."));
  out.push(line('Contact', '/contact', 'Customer support email, phone, and contact form.'));
  out.push(line('Track Order', '/track-order', 'Look up the status of an existing order.'));
  out.push(line('Testimonials', '/testimonials', 'Verified customer reviews from across India.'));
  out.push(line('FAQ', '/faq', 'Common questions on products, shipping, returns, and authenticity.'));
  out.push(line('Blog', '/blog', 'Nutrition, training, and supplement science articles.'));
  out.push('');

  if (cats.data?.length) {
    out.push('## Categories');
    for (const c of cats.data) out.push(line(c.name, `/category/${c.slug}`, c.description || ''));
    out.push('');
  }

  if (prods.data?.length) {
    out.push('## Products');
    for (const p of prods.data) {
      out.push(line(p.name, `/products/${p.slug}`, p.short_description || (p.description || '').slice(0, 160)));
    }
    out.push('');
  }

  if (posts.data?.length) {
    out.push('## Blog');
    for (const b of posts.data) out.push(line(b.title, `/blog/${b.slug}`, b.excerpt || ''));
    out.push('');
  }

  out.push('## Optional');
  out.push(line('Shipping & Delivery', '/shipping', 'Delivery timelines, charges, and tracking.'));
  out.push(line('Refund Policy', '/refund', '7-day return and refund process.'));
  out.push(line('Privacy Policy', '/privacy', 'How NutroPact handles personal data.'));
  out.push(line('Terms of Service', '/terms', 'Terms and conditions for shopping with NutroPact.'));

  return out.join('\n') + '\n';
}

export const Route = createFileRoute('/llms.txt')({
  server: {
    handlers: {
      GET: async () => {
        let body: string;
        try { body = await build(); }
        catch { body = '# NutroPact\n\n> Premium nutrition and supplements from India.\n'; }
        return new Response(body, {
          status: 200,
          headers: {
            'Content-Type': 'text/markdown; charset=utf-8',
            'Cache-Control': 'public, max-age=3600, s-maxage=3600',
          },
        });
      },
    },
  },
});