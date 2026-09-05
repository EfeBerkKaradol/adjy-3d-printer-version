"use client";

import { useSyncExternalStore } from "react";

// ==========================================
// İSTEMCİ DURUMU KANCALARI
// Her ikisi de useSyncExternalStore üzerine kurulu:
// sunucu render'ı ile uyumlu bir başlangıç değeri
// verirler ve effect içinde setState çağırmazlar
// (cascading render'ı önler).
// ==========================================

const noopSubscribe = () => () => {};

/**
 * Bileşen tarayıcıda hidrasyonu tamamladı mı?
 * localStorage'dan okunan sepet gibi yalnızca istemcide
 * bilinen değerleri göstermeden önce kullanılır.
 */
export function useHydrated(): boolean {
  return useSyncExternalStore(
    noopSubscribe,
    () => true,
    () => false
  );
}

function subscribeToScroll(onChange: () => void) {
  window.addEventListener("scroll", onChange, { passive: true });
  return () => window.removeEventListener("scroll", onChange);
}

/**
 * Sayfa verilen eşikten fazla kaydırıldı mı?
 * Header'ın daralması için kullanılır; sayfa zaten
 * kaydırılmış açıldığında da (geri navigasyonu) doğru
 * değeri verir.
 */
export function useScrolled(threshold = 8): boolean {
  return useSyncExternalStore(
    subscribeToScroll,
    () => window.scrollY > threshold,
    () => false
  );
}

/**
 * Bir medya sorgusu eşleşiyor mu?
 * Sunucuda her zaman false döner; ağır bileşenleri (ör. 3D sahne)
 * yalnızca eşleşen ekranlarda MOUNT etmek için kullanılır.
 * CSS ile gizlemek yetmez: gizli bir bileşen de kodunu indirir.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const mql = window.matchMedia(query);
      mql.addEventListener("change", onChange);
      return () => mql.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false
  );
}
