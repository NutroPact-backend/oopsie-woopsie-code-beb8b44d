// @ts-nocheck
/**
 * WIR-004 client glue: keep the local Zustand cart + wishlist stores in
 * sync with `user_state` for the signed-in user. Browser-only.
 *
 *  - On sign-in: pull the server snapshot and merge it with anything the
 *    user added while anonymous (server wins on duplicate keys, local-only
 *    items are kept so a guest cart isn't lost on login).
 *  - On any subsequent store mutation: debounce-push the current snapshot.
 *  - On sign-out: stop syncing; local persistence still works for guests.
 */
import { supabase } from "@/integrations/supabase/client";
import { useCartStore } from "@/store/cartStore";
import { useWishlistStore } from "@/store/wishlistStore";
import { getUserState, saveUserState } from "@/lib/user-state.functions";

let started = false;
let activeUserId: string | null = null;
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let unsubCart: (() => void) | null = null;
let unsubWishlist: (() => void) | null = null;

function cartKey(i: any) { return `${i?.id}::${i?.flavor ?? ""}::${i?.size ?? ""}`; }

function schedulePush() {
  if (!activeUserId) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    pushTimer = null;
    if (!activeUserId) return;
    try {
      await saveUserState({
        data: {
          cart: useCartStore.getState().items ?? [],
          wishlist: useWishlistStore.getState().items ?? [],
        },
      });
    } catch {
      // Best-effort — local persistence is still the source of truth.
    }
  }, 800);
}

async function hydrateFromServer() {
  if (!activeUserId) return;
  try {
    const remote = await getUserState({ data: {} });
    const localCart = useCartStore.getState().items ?? [];
    const localWish = useWishlistStore.getState().items ?? [];

    const mergedCart = [...(remote.cart ?? [])];
    const seen = new Set(mergedCart.map(cartKey));
    for (const it of localCart) if (!seen.has(cartKey(it))) mergedCart.push(it);

    const mergedWish = [...(remote.wishlist ?? [])];
    const seenW = new Set(mergedWish.map((i: any) => i?.id));
    for (const it of localWish) if (!seenW.has(it?.id)) mergedWish.push(it);

    useCartStore.setState({ items: mergedCart });
    useWishlistStore.setState({ items: mergedWish });

    // Push the merged result so the server has the union, not just its old copy.
    schedulePush();
  } catch {
    /* ignore — user keeps local state */
  }
}

function attachStoreListeners() {
  if (unsubCart) unsubCart();
  if (unsubWishlist) unsubWishlist();
  unsubCart = useCartStore.subscribe(schedulePush);
  unsubWishlist = useWishlistStore.subscribe(schedulePush);
}

function detachStoreListeners() {
  if (unsubCart) { unsubCart(); unsubCart = null; }
  if (unsubWishlist) { unsubWishlist(); unsubWishlist = null; }
  if (pushTimer) { clearTimeout(pushTimer); pushTimer = null; }
}

export function startUserStateSync() {
  if (started || typeof window === "undefined") return;
  started = true;

  supabase.auth.getUser().then(({ data }) => {
    if (data?.user?.id) {
      activeUserId = data.user.id;
      attachStoreListeners();
      hydrateFromServer();
    }
  }).catch(() => {});

  supabase.auth.onAuthStateChange((event, session) => {
    const uid = session?.user?.id ?? null;
    if (event === "SIGNED_OUT" || !uid) {
      activeUserId = null;
      detachStoreListeners();
      return;
    }
    if (uid !== activeUserId) {
      activeUserId = uid;
      attachStoreListeners();
      hydrateFromServer();
    }
  });
}