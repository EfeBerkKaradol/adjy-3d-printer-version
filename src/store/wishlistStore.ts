import { create } from "zustand";

interface WishlistStore {
  wishlistedIds: Set<string>;
  loaded: boolean;
  loadWishlist: () => Promise<void>;
  toggleWishlist: (productId: string) => Promise<boolean>;
  isWishlisted: (productId: string) => boolean;
  clear: () => void;
}

export const useWishlistStore = create<WishlistStore>()((set, get) => ({
  wishlistedIds: new Set(),
  loaded: false,

  loadWishlist: async () => {
    try {
      const res = await fetch("/api/wishlist");
      if (res.ok) {
        const data = await res.json();
        const ids = new Set<string>(
          data.wishlist.map((w: { product: { id: string } }) => w.product.id)
        );
        set({ wishlistedIds: ids, loaded: true });
      }
    } catch {
      // Sessizce devam et
    }
  },

  toggleWishlist: async (productId: string) => {
    // Optimistic update
    const currentIds = get().wishlistedIds;
    const wasWishlisted = currentIds.has(productId);
    const newIds = new Set(currentIds);

    if (wasWishlisted) {
      newIds.delete(productId);
    } else {
      newIds.add(productId);
    }
    set({ wishlistedIds: newIds });

    try {
      const res = await fetch("/api/wishlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });

      if (!res.ok) {
        // Geri al
        set({ wishlistedIds: currentIds });
        return false;
      }
      return true;
    } catch {
      // Geri al
      set({ wishlistedIds: currentIds });
      return false;
    }
  },

  isWishlisted: (productId: string) => get().wishlistedIds.has(productId),

  clear: () => set({ wishlistedIds: new Set(), loaded: false }),
}));
