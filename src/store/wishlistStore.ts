import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface WishlistItem {
  id: string;
  name: string;
  price: number;
  comparePrice?: number;
  image: string;
  slug: string;
  category?: string;
  pixels?: any;
}

interface WishlistStore {
  items: WishlistItem[];
  add: (item: WishlistItem) => void;
  remove: (id: string) => void;
  has: (id: string) => boolean;
  clear: () => void;
  count: () => number;
}

export const useWishlistStore = create<WishlistStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) => {
        if (get().items.find((i) => i.id === item.id)) return;
        set({ items: [item, ...get().items] });
      },
      remove: (id) => set({ items: get().items.filter((i) => i.id !== id) }),
      has: (id) => !!get().items.find((i) => i.id === id),
      clear: () => set({ items: [] }),
      count: () => get().items.length,
    }),
    { name: 'nutropact-wishlist' },
  ),
);
