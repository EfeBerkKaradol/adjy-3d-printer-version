// ==========================================
// SİPARİŞ KLASÖRÜNE KAYDETME (yalnızca tarayıcı)
//
// Atölye bir siparişin üretim dosyalarını indirdiğinde dosyalar
// İndirilenler'e dağılmasın: müşterinin adı ve sipariş
// numarasıyla bir klasör açılır, dosyalar onun içine yazılır.
//
//   Üretim klasörü/
//     Ayşe Yılmaz - ADJ-1794671715164-F4IL/
//       Saksi_180x150mm_K36.stl
//       Alt_Tabak_180mm_Tol0.25mm.stl
//       Imalat_Anteti_….svg
//       siparis-bilgisi.txt
//
// İki yol var:
//
//   1. Klasöre doğrudan yazma (Chrome, Edge). Atölye bir kez
//      "üretim klasörü"nü seçer; seçim tarayıcıda saklanır ve
//      sonraki siparişlerde yeniden sorulmaz (tarayıcı yalnızca
//      yazma iznini teyit ettirir).
//   2. Tarayıcı bunu desteklemiyorsa (Firefox, Safari) aynı
//      klasör yapısı tek bir ZIP olarak iner.
//
// Tarayıcı izin penceresini yalnızca kullanıcının tıklamasının
// hemen ardından açar. Bu yüzden klasör, dosyalar hazırlanmadan
// ÖNCE, tıklama anında istenir (klasoruHazirla); dosyalar
// sonradan yazılır (klasoreYaz).
// ==========================================

export interface KaydedilecekDosya {
  ad: string;
  blob: Blob;
}

/** Yazma hedefi: seçilmiş bir klasör ya da ZIP'e düşüş */
export type KayitHedefi =
  | { tur: "klasor"; kok: DizinTutamaci; kokAdi: string }
  | { tur: "zip" };

// File System Access API'nin TypeScript tanımları eksik; yalnızca
// kullanılan kısım burada.
interface DosyaTutamaci {
  createWritable(): Promise<{ write(veri: Blob): Promise<void>; close(): Promise<void> }>;
}
export interface DizinTutamaci {
  name: string;
  getDirectoryHandle(ad: string, secenek?: { create?: boolean }): Promise<DizinTutamaci>;
  getFileHandle(ad: string, secenek?: { create?: boolean }): Promise<DosyaTutamaci>;
  queryPermission?(secenek: { mode: "readwrite" }): Promise<PermissionState>;
  requestPermission?(secenek: { mode: "readwrite" }): Promise<PermissionState>;
}
type KlasorSecici = (secenek?: {
  id?: string;
  mode?: "readwrite";
  startIn?: string;
}) => Promise<DizinTutamaci>;

const VT_ADI = "adjy-uretim";
const DEPO = "ayarlar";
const ANAHTAR = "uretim-klasoru";

/** Windows ve macOS'ta dosya adında geçemeyen karakterleri atar */
export function dosyaAdiTemizle(ad: string, yedek = "adsiz"): string {
  const temiz = ad
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, " ")
    .replace(/\s+/g, " ")
    .replace(/^[.\s]+|[.\s]+$/g, "")
    .slice(0, 90);
  return temiz || yedek;
}

/** "Ayşe Yılmaz - ADJ-1794671715164-F4IL" */
export function siparisKlasoruAdi(musteri: string, siparisNo: string): string {
  return `${dosyaAdiTemizle(musteri, "Müşteri")} - ${dosyaAdiTemizle(siparisNo, "siparis")}`;
}

function klasorSecici(): KlasorSecici | null {
  const w = window as unknown as { showDirectoryPicker?: KlasorSecici };
  return typeof w.showDirectoryPicker === "function" ? w.showDirectoryPicker.bind(window) : null;
}

/** Tarayıcı klasöre doğrudan yazabiliyor mu */
export function klasoreYazilabilir(): boolean {
  return typeof window !== "undefined" && klasorSecici() !== null;
}

// ---------- seçilen klasörün saklanması (IndexedDB) ----------

function vtAc(): Promise<IDBDatabase> {
  return new Promise((tamam, hata) => {
    const istek = indexedDB.open(VT_ADI, 1);
    istek.onupgradeneeded = () => istek.result.createObjectStore(DEPO);
    istek.onsuccess = () => tamam(istek.result);
    istek.onerror = () => hata(istek.error);
  });
}

async function kayitliKlasor(): Promise<DizinTutamaci | null> {
  try {
    const vt = await vtAc();
    return await new Promise((tamam) => {
      const istek = vt.transaction(DEPO, "readonly").objectStore(DEPO).get(ANAHTAR);
      istek.onsuccess = () => tamam((istek.result as DizinTutamaci | undefined) ?? null);
      istek.onerror = () => tamam(null);
    });
  } catch {
    return null;
  }
}

async function klasoruSakla(tutamac: DizinTutamaci | null): Promise<void> {
  try {
    const vt = await vtAc();
    await new Promise<void>((tamam) => {
      const islem = vt.transaction(DEPO, "readwrite");
      if (tutamac) islem.objectStore(DEPO).put(tutamac, ANAHTAR);
      else islem.objectStore(DEPO).delete(ANAHTAR);
      islem.oncomplete = () => tamam();
      islem.onerror = () => tamam();
    });
  } catch {
    /* saklanamazsa bir dahaki sefer yeniden sorulur */
  }
}

/** Daha önce seçilmiş üretim klasörünün adı — yoksa null */
export async function kayitliKlasorAdi(): Promise<string | null> {
  if (!klasoreYazilabilir()) return null;
  return (await kayitliKlasor())?.name ?? null;
}

/** Üretim klasörü seçimini unutturur; bir sonraki indirmede yeniden sorulur */
export async function klasoruUnut(): Promise<void> {
  await klasoruSakla(null);
}

/**
 * Yazma hedefini hazırlar. MUTLAKA tıklama işleyicisinin içinden,
 * başka bir şey beklemeden çağrılmalı: tarayıcı klasör ve izin
 * pencerelerini yalnızca kullanıcı etkileşiminin hemen ardından açar.
 *
 * Kullanıcı klasör seçmekten vazgeçerse null döner.
 */
export async function klasoruHazirla(yeniSec = false): Promise<KayitHedefi | null> {
  const sec = klasorSecici();
  if (!sec) return { tur: "zip" };

  if (!yeniSec) {
    const kayitli = await kayitliKlasor();
    if (kayitli) {
      try {
        let izin = (await kayitli.queryPermission?.({ mode: "readwrite" })) ?? "granted";
        if (izin !== "granted") {
          izin = (await kayitli.requestPermission?.({ mode: "readwrite" })) ?? "denied";
        }
        if (izin === "granted") return { tur: "klasor", kok: kayitli, kokAdi: kayitli.name };
      } catch {
        /* klasör silinmiş ya da izin verilemedi: yeniden seçtir */
      }
    }
  }

  try {
    const kok = await sec({ id: "adjy-uretim", mode: "readwrite", startIn: "documents" });
    await klasoruSakla(kok);
    return { tur: "klasor", kok, kokAdi: kok.name };
  } catch (e) {
    // Kullanıcı pencereyi kapattı
    if (e instanceof DOMException && e.name === "AbortError") return null;
    // Pencere açılamadı (ör. etkileşim süresi doldu): ZIP'e düş
    return { tur: "zip" };
  }
}

/** Aynı klasöre iki kez inen dosya üstüne yazmasın diye adları ayırır */
function adlariAyir(dosyalar: KaydedilecekDosya[]): KaydedilecekDosya[] {
  const sayac = new Map<string, number>();
  return dosyalar.map((d) => {
    const temiz = dosyaAdiTemizle(d.ad, "dosya");
    const kac = sayac.get(temiz.toLowerCase()) ?? 0;
    sayac.set(temiz.toLowerCase(), kac + 1);
    if (kac === 0) return { ad: temiz, blob: d.blob };
    const nokta = temiz.lastIndexOf(".");
    const ad =
      nokta > 0
        ? `${temiz.slice(0, nokta)} (${kac + 1})${temiz.slice(nokta)}`
        : `${temiz} (${kac + 1})`;
    return { ad, blob: d.blob };
  });
}

export interface KayitSonucu {
  tur: "klasor" | "zip";
  /** Kullanıcıya gösterilecek yol: "Üretim/Ayşe Yılmaz - ADJ-…" ya da ZIP adı */
  yer: string;
  dosyalar: string[];
}

/**
 * Dosyaları sipariş klasörüne yazar.
 *
 * `altKlasor` verilirse (siparişte birden çok tasarım ürünü varsa)
 * dosyalar sipariş klasörünün içinde o alt klasöre girer.
 */
export async function klasoreYaz(
  hedef: KayitHedefi,
  klasorAdi: string,
  altKlasor: string | null,
  dosyalar: KaydedilecekDosya[]
): Promise<KayitSonucu> {
  const ayrik = adlariAyir(dosyalar);
  const alt = altKlasor ? dosyaAdiTemizle(altKlasor, "urun") : null;

  if (hedef.tur === "klasor") {
    let dizin = await hedef.kok.getDirectoryHandle(klasorAdi, { create: true });
    if (alt) dizin = await dizin.getDirectoryHandle(alt, { create: true });
    for (const d of ayrik) {
      const dosya = await dizin.getFileHandle(d.ad, { create: true });
      const yazici = await dosya.createWritable();
      await yazici.write(d.blob);
      await yazici.close();
    }
    return {
      tur: "klasor",
      yer: [hedef.kokAdi, klasorAdi, alt].filter(Boolean).join("/"),
      dosyalar: ayrik.map((d) => d.ad),
    };
  }

  const onEk = [klasorAdi, alt].filter(Boolean).join("/");
  const zip = await zipOlustur(ayrik.map((d) => ({ ad: `${onEk}/${d.ad}`, blob: d.blob })));
  const zipAdi = `${klasorAdi}${alt ? ` - ${alt}` : ""}.zip`;
  const adres = URL.createObjectURL(zip);
  const a = document.createElement("a");
  a.href = adres;
  a.download = zipAdi;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(adres), 4000);
  return { tur: "zip", yer: zipAdi, dosyalar: ayrik.map((d) => d.ad) };
}

// ---------- ZIP (sıkıştırmasız) ----------
//
// STL ve SVG'ler için sıkıştırma kazancı klasör yapısını taşımak
// kadar önemli değil; bağımlılık eklememek için dosyalar
// "saklanmış" (stored) olarak yazılır. Biçim: yerel başlık + veri,
// sonda merkezi dizin. Dosya adları UTF-8 (bayrak 0x0800).

let crcTablosu: Uint32Array | null = null;

function crc32(veri: Uint8Array): number {
  if (!crcTablosu) {
    crcTablosu = new Uint32Array(256);
    for (let n = 0; n < 256; n += 1) {
      let c = n;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTablosu[n] = c >>> 0;
    }
  }
  let crc = 0xffffffff;
  for (let i = 0; i < veri.length; i += 1) {
    crc = crcTablosu[(crc ^ veri[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

/** Blob yalnızca düz ArrayBuffer kabul ediyor; görünümün kendi dilimini verir */
function tampon(veri: Uint8Array): ArrayBuffer {
  return veri.buffer.slice(veri.byteOffset, veri.byteOffset + veri.byteLength) as ArrayBuffer;
}

export async function zipOlustur(dosyalar: KaydedilecekDosya[]): Promise<Blob> {
  const kodlayici = new TextEncoder();
  const parcalar: ArrayBuffer[] = [];
  const merkez: ArrayBuffer[] = [];
  let merkezBoyu = 0;
  let konum = 0;

  // DOS tarih/saat
  const t = new Date();
  const saat = (t.getHours() << 11) | (t.getMinutes() << 5) | (t.getSeconds() >> 1);
  const tarih = ((t.getFullYear() - 1980) << 9) | ((t.getMonth() + 1) << 5) | t.getDate();

  for (const d of dosyalar) {
    const ad = kodlayici.encode(d.ad);
    const veriTamponu = await d.blob.arrayBuffer();
    const veri = new Uint8Array(veriTamponu);
    const crc = crc32(veri);

    const yerel = new DataView(new ArrayBuffer(30));
    yerel.setUint32(0, 0x04034b50, true);
    yerel.setUint16(4, 20, true);
    yerel.setUint16(6, 0x0800, true);
    yerel.setUint16(8, 0, true);
    yerel.setUint16(10, saat, true);
    yerel.setUint16(12, tarih, true);
    yerel.setUint32(14, crc, true);
    yerel.setUint32(18, veri.length, true);
    yerel.setUint32(22, veri.length, true);
    yerel.setUint16(26, ad.length, true);
    yerel.setUint16(28, 0, true);
    parcalar.push(yerel.buffer as ArrayBuffer, tampon(ad), veriTamponu);

    const kayit = new DataView(new ArrayBuffer(46));
    kayit.setUint32(0, 0x02014b50, true);
    kayit.setUint16(4, 20, true);
    kayit.setUint16(6, 20, true);
    kayit.setUint16(8, 0x0800, true);
    kayit.setUint16(10, 0, true);
    kayit.setUint16(12, saat, true);
    kayit.setUint16(14, tarih, true);
    kayit.setUint32(16, crc, true);
    kayit.setUint32(20, veri.length, true);
    kayit.setUint32(24, veri.length, true);
    kayit.setUint16(28, ad.length, true);
    kayit.setUint32(42, konum, true);
    const tam = new Uint8Array(46 + ad.length);
    tam.set(new Uint8Array(kayit.buffer), 0);
    tam.set(ad, 46);
    merkez.push(tampon(tam));
    merkezBoyu += tam.length;

    konum += 30 + ad.length + veri.length;
  }

  const son = new DataView(new ArrayBuffer(22));
  son.setUint32(0, 0x06054b50, true);
  son.setUint16(8, dosyalar.length, true);
  son.setUint16(10, dosyalar.length, true);
  son.setUint32(12, merkezBoyu, true);
  son.setUint32(16, konum, true);

  return new Blob([...parcalar, ...merkez, son.buffer as ArrayBuffer], {
    type: "application/zip",
  });
}
