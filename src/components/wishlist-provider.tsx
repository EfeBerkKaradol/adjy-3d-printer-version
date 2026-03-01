"use client";

import { useSession } from "next-auth/react";
import { useEffect } from "react";
import { useWishlistStore } from "@/store/wishlistStore";

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { data: session } = useSession();
  const loadWishlist = useWishlistStore((s) => s.loadWishlist);
  const clear = useWishlistStore((s) => s.clear);
  const loaded = useWishlistStore((s) => s.loaded);

  useEffect(() => {
    if (session?.user && !loaded) {
      loadWishlist();
    } else if (!session?.user) {
      clear();
    }
  }, [session?.user, loaded, loadWishlist, clear]);

  return <>{children}</>;
}
