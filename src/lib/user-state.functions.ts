/**
 * WIR-004: Server-persisted cart + wishlist for authenticated users.
 *
 * The client stores (cartStore / wishlistStore) remain the canonical UI
 * state. On login + on store change we push a snapshot to `user_state`,
 * and on app boot we hydrate the stores from the server so the same user
 * sees the same cart/wishlist across devices.
 *
 * RLS scopes every row to `auth.uid()`, so a hijacked client can only
 * read/write its own row.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const ItemSchema = z.object({}).passthrough();
const PayloadSchema = z.object({
  cart: z.array(ItemSchema).max(200).default([]),
  wishlist: z.array(ItemSchema).max(500).default([]),
});

export const getUserState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data } = await supabase
      .from("user_state")
      .select("cart,wishlist,updated_at")
      .eq("user_id", userId)
      .maybeSingle();
    return {
      cart: Array.isArray(data?.cart) ? (data!.cart as any[]) : [],
      wishlist: Array.isArray(data?.wishlist) ? (data!.wishlist as any[]) : [],
      updatedAt: data?.updated_at ?? null,
    };
  });

export const saveUserState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: any) => PayloadSchema.parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { error } = await supabase
      .from("user_state")
      .upsert(
        { user_id: userId, cart: data.cart, wishlist: data.wishlist, updated_at: new Date().toISOString() },
        { onConflict: "user_id" },
      );
    if (error) throw new Error(error.message);
    return { ok: true };
  });