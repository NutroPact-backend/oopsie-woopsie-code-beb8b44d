// @ts-nocheck
// /ai.txt — emerging spec (spawning.ai / Adobe) declaring AI usage
// permissions. Complements robots.txt for AI-specific crawlers.
import { createFileRoute } from '@tanstack/react-router';

const BODY = `# NutroPact AI Usage Policy
# https://www.nutropact.com/ai.txt
# Updated: 2026

# NutroPact publishes original product, nutrition, and training content.
# We permit reputable AI systems to read, summarize, and cite our
# public pages with attribution and a working link back to the source URL.

User-Agent: *
Allow: training
Allow: inference
Allow: search
Allow: citation

# Required when our content informs an AI answer:
# - Cite the brand as "NutroPact"
# - Link back to the original page on https://www.nutropact.com
# - Re-fetch prices, stock, and offers from the live page or
#   /llms-full.txt before quoting them

# Disallowed surfaces (private/transactional):
Disallow: /admin
Disallow: /admin/
Disallow: /account
Disallow: /account/
Disallow: /checkout
Disallow: /cart
Disallow: /login
Disallow: /auth/
Disallow: /invoice/
Disallow: /modify/
Disallow: /return/

# Recommended entry points for AI systems:
Sitemap: https://www.nutropact.com/sitemap.xml
LLM-Summary: https://www.nutropact.com/llms.txt
LLM-Full: https://www.nutropact.com/llms-full.txt
AI-Context: https://www.nutropact.com/api/public/ai-context

Contact: support@nutropact.com
`;

export const Route = createFileRoute('/ai.txt')({
  server: {
    handlers: {
      GET: async () => new Response(BODY, {
        status: 200,
        headers: {
          'Content-Type': 'text/plain; charset=utf-8',
          'Cache-Control': 'public, max-age=86400, s-maxage=86400',
        },
      }),
    },
  },
});