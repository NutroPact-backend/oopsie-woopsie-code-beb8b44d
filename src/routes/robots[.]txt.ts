// @ts-nocheck
import { createFileRoute } from '@tanstack/react-router';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

const DEFAULT_ROBOTS = `User-agent: *
Allow: /

Disallow: /admin
Disallow: /admin/
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /account/
Disallow: /login
Disallow: /auth/
Disallow: /invoice/
Disallow: /modify/
Disallow: /return/

# AI crawlers — explicitly allow
User-agent: GPTBot
Allow: /
User-agent: OAI-SearchBot
Allow: /
User-agent: ChatGPT-User
Allow: /
User-agent: PerplexityBot
Allow: /
User-agent: ClaudeBot
Allow: /
User-agent: Google-Extended
Allow: /

Sitemap: /sitemap.xml
`;

export const Route = createFileRoute('/robots.txt')({
  server: {
    handlers: {
      GET: async () => {
        let body = DEFAULT_ROBOTS;
        try {
          const { data } = await supabaseAdmin
            .from('marketing_settings').select('robots_txt').eq('key', 'default').maybeSingle();
          if (data?.robots_txt && data.robots_txt.trim().length > 10) body = data.robots_txt;
        } catch {}
        return new Response(body, {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=600' },
        });
      },
    },
  },
});
