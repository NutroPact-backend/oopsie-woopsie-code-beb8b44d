import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const BASE = 'https://www.nutropact.com';

function esc(s: string = '') {
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

export const Route = createFileRoute('/rss.xml')({
  server: {
    handlers: {
      GET: async () => {
        let items = '';
        try {
          const { data } = await supabaseAdmin
            .from('blog_posts')
            .select('title,slug,excerpt,cover_image,published_at,updated_at,published')
            .eq('published', true)
            .order('published_at', { ascending: false })
            .limit(100);
          items = (data || []).map((p: any) => {
            const url = `${BASE}/blog/${p.slug}`;
            const date = new Date(p.published_at || p.updated_at || Date.now()).toUTCString();
            return `    <item>
      <title>${esc(p.title)}</title>
      <link>${esc(url)}</link>
      <guid isPermaLink="true">${esc(url)}</guid>
      <pubDate>${date}</pubDate>
      <description>${esc(p.excerpt || '')}</description>
      ${p.cover_image ? `<enclosure url="${esc(p.cover_image)}" type="image/jpeg" />` : ''}
    </item>`;
          }).join('\n');
        } catch {}

        const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>NutroPact Blog</title>
    <link>${BASE}/blog</link>
    <atom:link href="${BASE}/rss.xml" rel="self" type="application/rss+xml" />
    <description>Nutrition, training and supplement insights from NutroPact.</description>
    <language>en-IN</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>`;
        return new Response(xml, {
          status: 200,
          headers: {
            'Content-Type': 'application/rss+xml; charset=utf-8',
            'Cache-Control': 'public, max-age=1800, s-maxage=1800',
          },
        });
      },
    },
  },
});