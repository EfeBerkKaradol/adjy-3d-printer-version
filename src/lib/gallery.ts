// ==========================================
// ÜRÜN GALERİSİ
// `gallery` kolonu serbest JSON; yalnızca dolu metinler alınır.
// Kartlarda üzerine gelince gösterilen ikinci görsel de buradan:
// kapak karesinden farklı ilk galeri görseli.
// ==========================================

export function readGallery(gallery: unknown): string[] {
  if (!Array.isArray(gallery)) return [];
  return gallery.filter((g): g is string => typeof g === "string" && g.length > 0);
}

/** Kapaktan farklı ilk galeri görseli; yoksa null */
export function secondImageOf(thumbnailUrl: string | null, gallery: unknown): string | null {
  return readGallery(gallery).find((g) => g !== thumbnailUrl) ?? null;
}
