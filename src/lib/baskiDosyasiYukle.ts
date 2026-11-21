import type { BaskiDosyasi } from "./baskiDosyalari";

// ==========================================
// BASKI DOSYASI YÜKLEME (yalnızca tarayıcı, admin)
//
// Dosya tarayıcıdan doğrudan Cloudinary'ye gider; sunucu yalnızca
// imzayı verir (bkz. /api/admin/products/:id/baski-dosyalari).
// Yerel geliştirmede Cloudinary yoksa dosya sunucuya yazılır.
// ==========================================

type Hedef =
  | {
      tur: "cloudinary";
      cloudName: string;
      apiKey: string;
      timestamp: number;
      folder: string;
      signature: string;
    }
  | { tur: "yerel" }
  | null;

export interface BaskiDurumu {
  dosyalar: BaskiDosyasi[];
  hedef: Hedef;
}

function adres(productId: string) {
  return `/api/admin/products/${productId}/baski-dosyalari`;
}

export async function baskiDurumu(productId: string): Promise<BaskiDurumu> {
  const r = await fetch(adres(productId), { cache: "no-store" });
  if (!r.ok) throw new Error("Baskı dosyaları okunamadı");
  return r.json();
}

/** Tek dosyayı depoya yükler; listeye eklemez (bkz. baskiDosyalariniKaydet) */
export async function baskiDosyasiYukle(
  productId: string,
  hedef: Hedef,
  dosya: File
): Promise<BaskiDosyasi> {
  if (!hedef) throw new Error("Dosya deposu yapılandırılmamış (Cloudinary)");

  const fd = new FormData();
  fd.append("file", dosya);

  if (hedef.tur === "yerel") {
    const r = await fetch(adres(productId), { method: "POST", body: fd });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.error ?? "Yüklenemedi");
    return { ad: dosya.name, url: j.url, boyut: dosya.size };
  }

  fd.append("api_key", hedef.apiKey);
  fd.append("timestamp", String(hedef.timestamp));
  fd.append("signature", hedef.signature);
  fd.append("folder", hedef.folder);
  const r = await fetch(`https://api.cloudinary.com/v1_1/${hedef.cloudName}/raw/upload`, {
    method: "POST",
    body: fd,
  });
  if (!r.ok) throw new Error(`${dosya.name} yüklenemedi`);
  const j = await r.json();
  return { ad: dosya.name, url: j.secure_url as string, boyut: dosya.size };
}

export async function baskiDosyalariniKaydet(
  productId: string,
  dosyalar: BaskiDosyasi[]
): Promise<BaskiDosyasi[]> {
  const r = await fetch(adres(productId), {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ dosyalar }),
  });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error ?? "Kaydedilemedi");
  return j.dosyalar;
}

/**
 * Yeni dosyaları yükler ve listeye ekler. Aynı adlı dosya varsa
 * yenisiyle değiştirilir (parçanın düzeltilmiş hâli).
 */
export async function baskiDosyalariniEkle(
  productId: string,
  yeniler: File[],
  ilerleme?: (sira: number, toplam: number, ad: string) => void
): Promise<BaskiDosyasi[]> {
  const { dosyalar, hedef } = await baskiDurumu(productId);
  const yuklenen: BaskiDosyasi[] = [];
  for (const [i, f] of yeniler.entries()) {
    ilerleme?.(i + 1, yeniler.length, f.name);
    yuklenen.push(await baskiDosyasiYukle(productId, hedef, f));
  }
  const adlar = new Set(yuklenen.map((d) => d.ad.toLowerCase()));
  return baskiDosyalariniKaydet(productId, [
    ...dosyalar.filter((d) => !adlar.has(d.ad.toLowerCase())),
    ...yuklenen,
  ]);
}

/** Dosyayı indirir — başka kökenden gelen adreste de özgün adıyla */
export async function baskiDosyasiAl(d: BaskiDosyasi): Promise<Blob> {
  const r = await fetch(d.url);
  if (!r.ok) throw new Error(`${d.ad} indirilemedi`);
  return r.blob();
}

export function blobIndir(blob: Blob, ad: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
