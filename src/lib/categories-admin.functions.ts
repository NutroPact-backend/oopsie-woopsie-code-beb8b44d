/**
 * Admin server functions for category CRUD.
 * Defense-in-depth: even though RLS gates writes to admins, routing through
 * the server lets us validate input, normalize payloads, audit, and avoid
 * exposing raw PostgREST shape to the client.
 */
import { createServerFn } from '@tanstack/react-start';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { z } from 'zod';

async function assertAdmin(ctx: any) {
  const { data, error } = await ctx.supabase.rpc('is_admin', { _user_id: ctx.userId });
  if (error || !data) throw new Error('Forbidden');
}

const SlugRe = /^[a-z0-9-]{1,80}$/;

const PayloadSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().regex(SlugRe),
  description: z.string().max(4000).nullable().optional(),
  icon: z.string().max(8).nullable().optional(),
  image_url: z.string().max(2000).nullable().optional(),
  parent_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().min(-100000).max(100000).optional(),
  active: z.boolean().optional(),
  featured: z.boolean().optional(),
  seo_title: z.string().max(180).nullable().optional(),
  seo_description: z.string().max(400).nullable().optional(),
  seo_keywords: z.array(z.string().max(60)).max(50).optional(),
  visible_on_pages: z.array(z.string().max(80)).max(200).optional(),
});

export const adminCreateCategory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => PayloadSchema.parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { data: row, error } = await context.supabase.from('categories').insert(data).select('id').single();
    if (error) throw new Error(error.message);
    return { id: row.id };
  });

export const adminUpdateCategory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid(), patch: PayloadSchema.partial() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('categories').update(data.patch).eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminDeleteCategory = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('categories').delete().eq('id', data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const adminBulkUpdateCategories = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    ids: z.array(z.string().uuid()).min(1).max(500),
    patch: z.object({
      active: z.boolean().optional(),
      featured: z.boolean().optional(),
    }).refine((p) => Object.keys(p).length > 0, 'empty patch'),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('categories').update(data.patch).in('id', data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminBulkDeleteCategories = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { error } = await context.supabase.from('categories').delete().in('id', data.ids);
    if (error) throw new Error(error.message);
    return { ok: true, count: data.ids.length };
  });

export const adminReorderCategories = createServerFn({ method: 'POST' })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => z.object({
    a: z.object({ id: z.string().uuid(), sort_order: z.number().int() }),
    b: z.object({ id: z.string().uuid(), sort_order: z.number().int() }),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const r1 = await context.supabase.from('categories').update({ sort_order: data.a.sort_order }).eq('id', data.a.id);
    const r2 = await context.supabase.from('categories').update({ sort_order: data.b.sort_order }).eq('id', data.b.id);
    if (r1.error) throw new Error(r1.error.message);
    if (r2.error) throw new Error(r2.error.message);
    return { ok: true };
  });