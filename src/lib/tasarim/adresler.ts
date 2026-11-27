// Yönetim panelindeki adresler. Ayrı bir dosyada durur ki istemci
// bileşenleri de içe aktarabilsin (bildirim.ts veritabanına bağlı).

/** Sipariş kaleminin üretim ekranı */
export function uretimEkraniAdresi(orderId: string, itemId: string): string {
  return `/admin/uretim/${orderId}/${itemId}`;
}

/** Tasarım aracının siparişsiz, serbest atölye ekranı */
export function atolyeAdresi(aracId: string): string {
  return `/admin/uretim/arac/${aracId}`;
}

/**
 * Üretim ekranı açılınca kendiliğinden inecek dosya.
 *   3mf   → baskıya hazır üretim projesi (sec verilirse yalnızca o parça)
 *   dosya → aracın o düğmesinin dosyası (belge, pafta)
 */
export interface OtomatikIndirme {
  tur: "3mf" | "dosya";
  sec: string | null;
}

/** Üretim ekranı adresine "açılınca indir" isteği ekler */
export function otomatikIndirmeAdresi(temel: string, istek: OtomatikIndirme): string {
  const q = new URLSearchParams({ indir: istek.tur });
  if (istek.sec) q.set("parca", istek.sec);
  return `${temel}?${q.toString()}`;
}

/** Sayfanın arama parametrelerinden isteği okur; yoksa null */
export function otomatikIndirmeOku(
  sp: Record<string, string | string[] | undefined>
): OtomatikIndirme | null {
  const tur = typeof sp.indir === "string" ? sp.indir : null;
  if (tur !== "3mf" && tur !== "dosya") return null;
  const sec = typeof sp.parca === "string" && sp.parca ? sp.parca : null;
  if (tur === "dosya" && !sec) return null;
  return { tur, sec };
}
