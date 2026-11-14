// ==========================================
// ÜRETİM DOSYALARINI HAZIRLAMA (yalnızca tarayıcı)
//
// Sipariş detayındaki "İndir" düğmesi ile üretim ekranındaki
// "Klasöre kaydet" aynı işi yapar: aracı müşterinin kaydıyla
// kurar, çıktı düğmelerine basar ve dosyaları toplar. Ortak
// kısım burada durur ki iki yerde iki ayrı davranış oluşmasın.
// ==========================================

import type { TasarimAraci } from "@/lib/tasarim/catalog";
import type { TasarimDosyasi, TasarimSecimi } from "@/lib/tasarim/order";
import type { KaydedilecekDosya } from "@/lib/tasarim/kaydet";
import type { AracArayuzu } from "./kopru";

export interface IndirilecekSiparis {
  id: string;
  no: string;
  musteri: string;
  eposta: string;
  telefon: string | null;
  not: string | null;
  tarih: string;
}

export interface IndirilecekKalem {
  id: string;
  adet: number;
  birimFiyat: number;
  secimler: TasarimSecimi[];
  dosyalar: TasarimDosyasi[];
  durum: Record<string, unknown> | null;
  olcum: { kutleG: number | null; sureSaat: number | null };
}

const bekle = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

/** Ölçüm bu orandan fazla saparsa model siparişteki model değildir */
const OLCUM_PAYI = 0.03;

export interface KurulumSonucu {
  /** Modelin filamenti siparişteki değerle tutuyor mu */
  tutuyor: boolean;
  siparisG: number | null;
  modelG: number | null;
}

/**
 * Aracı müşterinin kaydıyla kurar ve modelin gerçekten yeniden
 * üretildiğini doğrular.
 *
 * Alanları yazmak yetmez: araç modeli bir sonraki çizimde kuruyor
 * ve sekme arka plandaysa hiç kurmayabiliyor. O durumda STL eski
 * (varsayılan) geometriden çıkardı. Filament miktarı yalnızca model
 * yeniden kurulunca değiştiği için, siparişteki değerle tutana
 * kadar beklenir; tutmuyorsa çağıran taraf uyarır.
 */
export async function modeliKur(
  arayuz: AracArayuzu,
  kalem: IndirilecekKalem
): Promise<KurulumSonucu> {
  if (kalem.durum) {
    try {
      await arayuz.yukle(kalem.durum);
    } catch {
      /* aşağıdaki ölçüm karşılaştırması farkı yakalar */
    }
  }

  const siparisG = kalem.olcum.kutleG;
  let modelG: number | null = null;

  // Karşılaştıracak ölçüm yoksa (eski kayıt) modelin oturması beklenir
  if (!siparisG) {
    await bekle(1500);
    return { tutuyor: true, siparisG: null, modelG: arayuz.paket().olcum.kutleG ?? null };
  }

  for (let deneme = 0; deneme < 40; deneme += 1) {
    modelG = arayuz.paket().olcum.kutleG ?? null;
    if (modelG && Math.abs(modelG - siparisG) / Math.max(modelG, siparisG) <= OLCUM_PAYI) {
      // Bir çizim daha: ölçüm yazıldı, geometri de yerinde olsun
      await bekle(250);
      return { tutuyor: true, siparisG, modelG };
    }
    await bekle(300);
  }
  return { tutuyor: false, siparisG, modelG };
}

/** Müşterinin seçimlerini ve sipariş bilgisini düz metin dosyası yapar */
export function bilgiDosyasi(
  arac: TasarimAraci,
  siparis: IndirilecekSiparis,
  kalem: IndirilecekKalem
): KaydedilecekDosya {
  const satirlar = [
    `Sipariş: ${siparis.no}`,
    `Tarih: ${new Date(siparis.tarih).toLocaleString("tr-TR")}`,
    `Müşteri: ${siparis.musteri}`,
    `E-posta: ${siparis.eposta}`,
    siparis.telefon ? `Telefon: ${siparis.telefon}` : null,
    "",
    `Ürün: ${arac.ad}`,
    `Adet: ${kalem.adet}`,
    `Birim fiyat: ${kalem.birimFiyat.toFixed(2)} TL`,
    kalem.olcum.kutleG ? `Filament: ${kalem.olcum.kutleG} g` : null,
    kalem.olcum.sureSaat ? `Baskı süresi: ${kalem.olcum.sureSaat} saat` : null,
    arac.ekMaliyetAciklamasi ? `Birlikte gider: ${arac.ekMaliyetAciklamasi}` : null,
    "",
    "MÜŞTERİNİN SEÇİMLERİ",
    "--------------------",
    ...(kalem.secimler.length > 0
      ? kalem.secimler.map((s) => `${s.ad}: ${s.deger}`)
      : ["Müşteri ürünü değiştirmeden ekledi; varsayılan yapılandırma."]),
    ...(kalem.dosyalar.length > 0
      ? ["", "MÜŞTERİNİN DOSYALARI", "--------------------", ...kalem.dosyalar.map((d) => `${d.ad}${d.url ? ` — ${d.url}` : ""}`)]
      : []),
    ...(siparis.not ? ["", "SİPARİŞ NOTU", "------------", siparis.not] : []),
  ].filter((s): s is string => s !== null);

  // BOM: Windows Not Defteri Türkçe karakterleri doğru göstersin
  return {
    ad: "siparis-bilgisi.txt",
    blob: new Blob(["﻿" + satirlar.join("\r\n") + "\r\n"], {
      type: "text/plain;charset=utf-8",
    }),
  };
}

/**
 * Basılacak parçaları ve imalat belgelerini araçtan toplar; yanına
 * sipariş bilgisini ve müşterinin yüklediği dosyaları koyar.
 */
export async function uretimDosyalari(
  arayuz: AracArayuzu,
  arac: TasarimAraci,
  siparis: IndirilecekSiparis,
  kalem: IndirilecekKalem
): Promise<KaydedilecekDosya[]> {
  const seciciler = arac.ciktilar
    .filter((c) => c.tur === "stl" || c.tur === "belge")
    .map((c) => c.sec);
  const dosyalar: KaydedilecekDosya[] = await arayuz.topla(seciciler);

  dosyalar.push(bilgiDosyasi(arac, siparis, kalem));

  // Müşterinin fotoğrafı ya da modeli: klasörde elinin altında olsun.
  // İndirilemezse bağlantısı bilgi dosyasında zaten yazıyor.
  for (const d of kalem.dosyalar) {
    if (!d.url) continue;
    try {
      const yanit = await fetch(d.url);
      if (yanit.ok) dosyalar.push({ ad: `musteri - ${d.ad}`, blob: await yanit.blob() });
    } catch {
      /* bağlantı bilgi dosyasında */
    }
  }
  return dosyalar;
}

/** Araçtan gelen dosyaların içinde basılacak parça var mı */
export function stlVarMi(dosyalar: KaydedilecekDosya[]): boolean {
  return dosyalar.some((d) => /\.stl$/i.test(d.ad));
}
