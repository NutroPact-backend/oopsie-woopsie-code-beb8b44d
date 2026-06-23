// @ts-nocheck
import { createServerFn } from '@tanstack/react-start';
import { supabaseAdmin } from '@/integrations/supabase/client.server';

// SEC: strip any HTML tags from admin-editable text fields before they
// reach SSR head() / JSON-LD / og: meta. The category page proved that a
// `<script>alert(1)</script>` name in the DB could land inside a JSON-LD
// <script> block and close it. Sanitising at the source covers every
// consumer (head meta, og tags, JSON-LD body strings, llms.txt).
function stripTags(s: string | null | undefined): string | null {
  if (s == null) return null;
  return String(s)
    .replace(/<\/?[^>]+>/g, '')      // drop HTML tags
    .replace(/[\u0000-\u001F\u007F]/g, '') // drop control chars
    .trim();
}

export type CategorySeo = {
  slug: string;
  name: string | null;
  seo_title: string | null;
  seo_description: string | null;
  description: string | null;
  image_url: string | null;
} | null;

/**
 * SSR-safe category SEO fetch. Returns just the fields needed for head()
 * so the loader payload stays small. Returns null if category does not
 * exist — head() falls back to slug-derived defaults.
 */
export const getCategorySeo = createServerFn({ method: 'GET' })
  .inputValidator((data: { slug: string }) => {
    const slug = String(data?.slug || '').trim().toLowerCase();
    if (!slug || !/^[a-z0-9-]{1,80}$/.test(slug)) {
      throw new Error('Invalid slug');
    }
    return { slug };
  })
  .handler(async ({ data }): Promise<CategorySeo> => {
    const { data: row, error } = await supabaseAdmin
      .from('categories')
      .select('slug,name,seo_title,seo_description,description,image_url')
      .eq('slug', data.slug)
      .maybeSingle();
    if (error || !row) return null;
    return {
      slug: row.slug,
      name: stripTags(row.name),
      seo_title: stripTags(row.seo_title),
      seo_description: stripTags(row.seo_description),
      description: stripTags(row.description),
      image_url: row.image_url ?? null,
    };
  });
