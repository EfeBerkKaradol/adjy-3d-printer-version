"use client";

import { useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { useCartStore } from "@/store/cartStore";

/**
 * CartSyncProvider
 *
 * Session değişikliklerini dinler ve sepet store'unu
 * aktif kullanıcıya göre günceller.
 *
 * - Login → Kullanıcıya özel sepeti yükler
 * - Logout → Guest sepete geçer
 * - Farklı kullanıcı → Yeni kullanıcının sepetini yükler
 */
export function CartSyncProvider({ children }: { children: React.ReactNode }) {
  const { data: session, status } = useSession();
  const switchUser = useCartStore((state) => state.switchUser);
  const prevUserIdRef = useRef<string | null | undefined>(undefined);

  // Eski localStorage key'ini temizle (bir kerelik migrasyon)
  useEffect(() => {
    try {
      const oldKey = "adjy-cart";
      if (localStorage.getItem(oldKey)) {
        localStorage.removeItem(oldKey);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    // Session henüz yüklenmediyse bekle
    if (status === "loading") return;

    const currentUserId = session?.user?.id ?? null;

    // İlk mount veya kullanıcı değişikliği
    if (prevUserIdRef.current !== currentUserId) {
      switchUser(currentUserId);
      prevUserIdRef.current = currentUserId;
    }
  }, [session, status, switchUser]);

  return <>{children}</>;
}
