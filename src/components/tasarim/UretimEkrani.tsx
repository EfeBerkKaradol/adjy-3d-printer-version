"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import Link from "next/link";
import { useTheme } from "next-themes";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  ChevronDown,
  Copy,
  Download,
  FileText,
  FolderDown,
  Layers,
  Loader2,
  Minus,
  Paperclip,
  Plus,
} from "lucide-react";
import {
  aracUretimKaynagi,
  RENKLI_PAKET_SECICI,
  type TasarimAraci,
  type TasarimCiktisi,
} from "@/lib/tasarim/catalog";
import {
  secimlerMetni,
  secimleriTemizle,
  type TasarimDosyasi,
  type TasarimSecimi,
} from "@/lib/tasarim/order";
import { formatTRY } from "@/lib/slicer";
import {
  aracArayuzu,
  aracMesajiMi,
  aracRenkleri,
  type AracPaketi,
  type AracRengi,
  type TablaDuzeni,
  type UretimSonucu,
  type UretimTablasi,
} from "./kopru";
import {
  klasoreYaz,
  klasoruHazirla,
  siparisKlasoruAdi,
  type KayitSonucu,
} from "@/lib/tasarim/kaydet";
import { parcaDosyalari, stlVarMi, uretimDosyalari, uretimProjesi } from "./indirme";

// ==========================================
// ÜRETİM EKRANI
//
// Sipariş kalemi burada üç biçimde durur:
//
//   1. Metin — müşterinin seçtiği her şey, satır satır. Aracı
//      açmadan da ne istendiği okunur, panoya kopyalanır.
//   2. Model — araç müşterinin kaydıyla açılır ve aynı parçayı
//      yeniden kurar.
//   3. Dosya — STL, imalat anteti ve tablolar; yukarıdaki
//      düğmeler aracın kendi çıktı düğmelerine basar.
//
// Model kayıttan yeniden üretildiği için bir doğrulama da
// yapılır: araç kurulduktan sonra kendi bildirdiği seçimler
// siparişteki metinle karşılaştırılır. Tutmayan satır varsa
// (araç güncellenmiş, bir alan kaldırılmış olabilir) burada
// yazar — yanlış ölçüde bir parça basılmadan önce.
//
// Serbest kip: sipariş olmadan, Kendin Üret Atölyesi'nden açılır.
// Atölye modeli kendisi ayarlar; sol panel aracın o anki
// seçimlerini gösterir, dosyalar o anki modelden çıkar.
// ==========================================

interface Props {
  arac: TasarimAraci;
  /** Siparişe bağlı olmadan, atölyenin kendi kurduğu model */
  serbest?: boolean;
  siparis: {
    id: string;
    no: string;
    durum: string;
    odeme: string;
    not: string | null;
    tarih: string;
    musteri: string;
    eposta: string;
    telefon: string | null;
  };
  kalem: {
    id: string;
    urunAdi: string;
    adet: number;
    birimFiyat: number;
    secimler: TasarimSecimi[];
    dosyalar: TasarimDosyasi[];
    durum: Record<string, unknown> | null;
    olcum: { kutleG: number | null; sureSaat: number | null };
  };
}

type Asama = "aciliyor" | "yukleniyor" | "hazir";

/** Seçim panelinin açık gelmesi için gereken en dar pencere */
const GENIS_EKRAN = 1560;

function genislikDinle(geriCagir: () => void) {
  window.addEventListener("resize", geriCagir);
  return () => window.removeEventListener("resize", geriCagir);
}

const DUGME =
  "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm transition-colors disabled:opacity-40";

/** İndirme şeridinde başlıklı düğme öbeği. tekSatir: alt satıra inmez, taşarsa yana kayar */
function DosyaGrubu({
  baslik,
  className = "",
  tekSatir = false,
  children,
}: {
  baslik: string;
  className?: string;
  tekSatir?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-w-0 ${className}`}>
      <p className="mb-1.5 font-mono text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
        {baslik}
      </p>
      <div
        className={
          tekSatir
            ? "flex items-center gap-1.5 overflow-x-auto [scrollbar-width:none]"
            : "flex flex-wrap items-center gap-1.5"
        }
      >
        {children}
      </div>
    </div>
  );
}

/** Tabla listesi tek satırda: "1: Siyah · 4 parça · filament değişmez | 2: …" */
function tablaMetni(tablalar: UretimTablasi[]): string {
  return tablalar
    .map(
      (t) =>
        `${t.no}: ${t.renkler.map((r) => r.ad).join(" + ")} · ${t.parcalar.reduce((s, pc) => s + pc.adet, 0)} parça · ${
          t.degisim > 0 ? `≈ ${t.degisim} filament değişimi${t.nesneNesne ? " (nesne nesne)" : ""}` : "filament değişmez"
        }${t.tasiyor ? " (sığmıyor)" : ""}`
    )
    .join("  |  ");
}

export function UretimEkrani({ arac, siparis, kalem: siparisKalemi, serbest = false }: Props) {
  const { resolvedTheme } = useTheme();
  const cerceveRef = useRef<HTMLIFrameElement>(null);
  // Çerçevenin adresi ilk temayla bir kez belirlenir; tema sonradan
  // değişirse araç yeniden yüklenmez, köprüye haber verilir.
  const [ilkTema, setIlkTema] = useState<string | null>(null);
  if (ilkTema === null && resolvedTheme) setIlkTema(resolvedTheme);
  const kaynak = ilkTema
    ? `${aracUretimKaynagi(arac.id)}?tema=${ilkTema === "dark" ? "koyu" : "acik"}`
    : null;
  const [asama, setAsama] = useState<Asama>("aciliyor");
  const [aracPaketi, setAracPaketi] = useState<AracPaketi | null>(null);
  // Seçim paneli geniş ekranda açık gelir. Dar ekranda kapalı: araçların
  // çoğu 1180 pikselin altında tek sütuna düşüyor ve model ekranın altına
  // kayıyor — panel açıkken atölye modeli göremezdi. Kullanıcı bir kez
  // açıp kapattıktan sonra onun tercihi geçerlidir.
  const genisEkran = useSyncExternalStore(
    genislikDinle,
    () => window.innerWidth >= GENIS_EKRAN,
    () => false
  );
  const [panelTercihi, setPanelTercihi] = useState<boolean | null>(null);
  const secimlerAcik = panelTercihi ?? genisEkran;
  const [kopyalandi, setKopyalandi] = useState(false);
  const [indirilen, setIndirilen] = useState<string | null>(null);
  const [kayit, setKayit] = useState<
    { tur: "tamam"; sonuc: KayitSonucu } | { tur: "hata"; mesaj: string } | null
  >(null);
  // Üretim projesi kaç adet için kurulacak: siparişte kalemin adedi,
  // atölye kipinde elle. Son kurulan projenin tabla listesi altta yazar.
  const [uretimAdedi, setUretimAdedi] = useState(Math.max(1, siparisKalemi.adet));
  const [duzen, setDuzen] = useState<TablaDuzeni>("oto");
  const [proje, setProje] = useState<UretimSonucu | null>(null);
  const tablalar: UretimTablasi[] | null = proje?.ozet ?? null;
  const yuklendiRef = useRef(false);
  // Modelin renkleri = 3MF'teki filament yuvaları. Model her
  // değiştiğinde (atölye kipinde ayar oynanınca) yeniden okunur;
  // ağ taranır, o yüzden son değişiklikten biraz sonra.
  const [renkler, setRenkler] = useState<AracRengi[]>([]);
  useEffect(() => {
    if (asama !== "hazir") return;
    const t = setTimeout(() => setRenkler(aracRenkleri(cerceveRef.current)), 600);
    return () => clearTimeout(t);
  }, [asama, aracPaketi]);

  // Serbest kipte gösterilen ve dosyalara yazılan seçimler aracın
  // o anki hâlidir; siparişte ise müşterinin kaydı.
  const kalem = useMemo(
    () =>
      serbest
        ? {
            ...siparisKalemi,
            secimler: secimleriTemizle(aracPaketi?.ozet),
            olcum: {
              kutleG: aracPaketi?.olcum.kutleG ?? null,
              sureSaat: aracPaketi?.olcum.sureSaat ?? null,
            },
          }
        : siparisKalemi,
    [serbest, siparisKalemi, aracPaketi]
  );

  useEffect(() => {
    if (asama === "aciliyor" || !resolvedTheme) return;
    aracArayuzu(cerceveRef.current)?.tema(resolvedTheme === "dark" ? "koyu" : "acik");
  }, [asama, resolvedTheme]);

  // Araç hazır olunca müşterinin kaydı yüklenir. Kayıt yoksa
  // (ürün karttan, değiştirilmeden eklenmiş) araç zaten
  // varsayılan hâlinde açılmıştır — sipariş edilen de odur.
  const kaydiYukle = useCallback(async () => {
    if (yuklendiRef.current) return;
    const arayuz = aracArayuzu(cerceveRef.current);
    if (!arayuz) return;
    yuklendiRef.current = true;
    if (kalem.durum) {
      setAsama("yukleniyor");
      try {
        await arayuz.yukle(kalem.durum);
      } catch {
        /* doğrulama aşağıda farkı gösterir */
      }
    }
    // Model yeniden kurulurken ölçüm bir an gecikir
    await new Promise((r) => setTimeout(r, 900));
    setAracPaketi(arayuz.paket());
    setAsama("hazir");
  }, [kalem.durum]);

  useEffect(() => {
    function dinle(e: MessageEvent) {
      if (e.origin !== window.location.origin) return;
      if (!aracMesajiMi(e.data, arac.id)) return;
      if (e.data.tur === "hazir") void kaydiYukle();
      if (e.data.tur === "durum" && e.data.veri && yuklendiRef.current) {
        setAracPaketi(e.data.veri);
      }
    }
    window.addEventListener("message", dinle);
    return () => window.removeEventListener("message", dinle);
  }, [arac.id, kaydiYukle]);

  // Siparişteki metin ile aracın şu an gösterdiği karşılaştırılır.
  // Atölye kipinde araç üretici alanlarını da bildirir; yalnızca
  // müşterinin seçtiği satırlar karşılaştırmaya girer.
  const farklar = useMemo(() => {
    if (serbest || asama !== "hazir" || !aracPaketi || kalem.secimler.length === 0) return [];
    const simdi = new Map(
      secimleriTemizle(aracPaketi.ozet).map((s) => [s.ad, s.deger])
    );
    return kalem.secimler
      .filter((s) => simdi.has(s.ad) && simdi.get(s.ad) !== s.deger)
      .map((s) => ({ ad: s.ad, siparis: s.deger, arac: simdi.get(s.ad) ?? "" }));
  }, [serbest, asama, aracPaketi, kalem.secimler]);

  // Fiyat, müşterinin tarayıcısının bildirdiği filament miktarından
  // hesaplandı. Araç burada aynı modeli kurunca kendi ölçümünü yapar;
  // ikisi tutmuyorsa sipariş yanlış fiyatlanmış olabilir.
  const olcumFarki = useMemo(() => {
    const siparis = kalem.olcum.kutleG;
    const simdi = aracPaketi?.olcum.kutleG;
    if (serbest || asama !== "hazir" || !siparis || !simdi) return null;
    const oran = Math.abs(simdi - siparis) / Math.max(simdi, siparis);
    return oran > 0.15 ? { siparis, simdi } : null;
  }, [serbest, asama, aracPaketi, kalem.olcum.kutleG]);

  const indir = useCallback(
    async (cikti: TasarimCiktisi[]) => {
      const arayuz = aracArayuzu(cerceveRef.current);
      if (!arayuz) return;
      for (const c of cikti) {
        setIndirilen(c.ad);
        arayuz.tikla(c.sec);
        // Tarayıcı art arda gelen indirmeleri birleştirmesin
        await new Promise((r) => setTimeout(r, 700));
      }
      setIndirilen(null);
    },
    []
  );

  // Üretim projesi: parçalar baskı yönünde, renge göre ayrı tablalarda,
  // adet kadar dizili. Dosya bu sayfadan iner (çerçevenin içinden değil).
  const uretimIndir = useCallback(async () => {
    const arayuz = aracArayuzu(cerceveRef.current);
    if (!arayuz) return;
    setKayit(null);
    setProje(null);
    setIndirilen("Üretim projesi");
    const parcalar = await parcaDosyalari(arayuz, arac);
    const yeni = await uretimProjesi(arayuz, parcalar, uretimAdedi, duzen);
    if (!yeni) {
      setKayit({ tur: "hata", mesaj: "Araç parça STL'si vermedi; parçaları tek tek indirin" });
    } else {
      for (const d of yeni.dosyalar) {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(d.blob);
        a.download = d.ad;
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          URL.revokeObjectURL(a.href);
          a.remove();
        }, 4000);
        await new Promise((r) => setTimeout(r, 500));
      }
      setProje(yeni);
      setRenkler(yeni.renkler);
    }
    setIndirilen(null);
  }, [arac, uretimAdedi, duzen]);

  // Bütün üretim dosyaları tek seferde, "Müşteri - Sipariş No"
  // klasörüne. Klasör penceresi yalnızca tıklamanın hemen ardından
  // açılabildiği için hedef dosyalardan önce hazırlanır.
  const klasoreKaydet = useCallback(async () => {
    const arayuz = aracArayuzu(cerceveRef.current);
    if (!arayuz) return;
    const hedef = await klasoruHazirla();
    if (!hedef) return;
    setKayit(null);
    setIndirilen("Üretim dosyaları");
    try {
      const dosyalar = await uretimDosyalari(
        arayuz,
        arac,
        siparis,
        { ...kalem, adet: uretimAdedi },
        duzen
      );
      if (!stlVarMi(dosyalar)) throw new Error("Araç STL üretmedi");
      const sonuc = await klasoreYaz(
        hedef,
        siparisKlasoruAdi(siparis.musteri, siparis.no),
        null,
        dosyalar
      );
      setKayit({ tur: "tamam", sonuc });
    } catch (e) {
      setKayit({
        tur: "hata",
        mesaj: e instanceof Error && e.message ? e.message : "Dosyalar kaydedilemedi",
      });
    }
    setIndirilen(null);
  }, [arac, kalem, siparis, uretimAdedi, duzen]);

  const kopyala = useCallback(async () => {
    const baslik = [
      `Sipariş ${siparis.no} — ${arac.ad} × ${kalem.adet}`,
      `Müşteri: ${siparis.musteri}`,
      "",
    ].join("\n");
    try {
      await navigator.clipboard.writeText(baslik + secimlerMetni(kalem.secimler));
      setKopyalandi(true);
      setTimeout(() => setKopyalandi(false), 1800);
    } catch {
      /* pano izni yoksa metin ekranda zaten seçilebilir */
    }
  }, [arac.ad, kalem.adet, kalem.secimler, siparis.musteri, siparis.no]);

  const renkliPaket = arac.ciktilar.find((c) => c.sec === RENKLI_PAKET_SECICI);
  const stller = arac.ciktilar.filter(
    (c) => c.tur === "stl" && c.sec !== RENKLI_PAKET_SECICI
  );
  const belgeler = arac.ciktilar.filter((c) => c.tur === "belge");
  const digerleri = arac.ciktilar.filter((c) => c.tur === "cad");
  const hazir = asama === "hazir";

  return (
    <div className="flex h-full flex-col">
      {/* ---------- SİPARİŞ ---------- */}
      <header className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b-2 border-dashed border-foreground/25 bg-card px-4 py-3">
        <Link
          href={serbest ? "/admin/tasarim-atolyesi" : `/admin/orders/${siparis.id}`}
          className={`${DUGME} bg-muted hover:bg-accent`}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          {serbest ? "Atölye" : "Sipariş"}
        </Link>
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">
            {arac.ad}
            {!serbest && (
              <span className="ml-2 font-normal text-muted-foreground">
                × {kalem.adet} adet
              </span>
            )}
          </p>
          <p className="truncate font-mono text-xs text-muted-foreground">
            {serbest
              ? "Serbest kurulum · modeli ayarlayın, imalat dosyalarını indirin"
              : `${siparis.no} · ${siparis.musteri} · ${formatTRY(kalem.birimFiyat)}`}
          </p>
        </div>

        <div className="ml-auto flex items-center gap-2 text-xs">
          {asama !== "hazir" ? (
            <span className="inline-flex items-center gap-1.5 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {asama === "aciliyor" ? "Araç açılıyor" : "Müşterinin modeli kuruluyor"}
            </span>
          ) : serbest ? (
            <span className="inline-flex items-center gap-1.5 text-brand-lime">
              <Check className="h-3.5 w-3.5" aria-hidden />
              Atölye kipi: bütün ayarlar açık
            </span>
          ) : farklar.length > 0 ? (
            <span className="inline-flex items-center gap-1.5 text-brand-amber">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              {farklar.length} alan siparişle tutmuyor
            </span>
          ) : olcumFarki ? (
            <span className="inline-flex items-center gap-1.5 text-brand-amber">
              <AlertTriangle className="h-3.5 w-3.5" aria-hidden />
              Filament siparişte {olcumFarki.siparis} g, modelde {olcumFarki.simdi} g —
              fiyatı kontrol edin
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 text-brand-lime">
              <Check className="h-3.5 w-3.5" aria-hidden />
              {kalem.durum ? "Müşterinin modeli kuruldu" : "Varsayılan yapılandırma"}
            </span>
          )}
        </div>
      </header>

      {/* ---------- DOSYALAR ----------
          Şerit üç sabit satırdır; model kurulunca gelen renkler ya da
          indirme sonrası yazan durum hiçbir düğmenin yerini değiştirmez:
            1. üretim: adet · Üretim 3MF · filament yuvaları · Klasöre kaydet
            2. tek tek dosyalar: parçalar ve belgeler
            3. durum satırı (tek satır, sabit yükseklik) */}
      <div className="border-b-2 border-dashed border-foreground/25 bg-background px-4 py-3">
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
          <DosyaGrubu baslik="Adet">
            <div className="adjy-pixel-frame inline-flex h-9 items-stretch overflow-hidden rounded-lg bg-card">
              <button
                type="button"
                onClick={() => setUretimAdedi((n) => Math.max(1, n - 1))}
                disabled={uretimAdedi <= 1}
                aria-label="Adedi azalt"
                className="inline-flex w-9 items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Minus className="h-4 w-4" aria-hidden />
              </button>
              <input
                type="number"
                min={1}
                max={60}
                value={uretimAdedi}
                onChange={(e) =>
                  setUretimAdedi(Math.min(60, Math.max(1, Math.round(Number(e.target.value) || 1))))
                }
                aria-label="Üretim adedi"
                className="w-12 border-x-2 border-dashed border-foreground/25 bg-transparent text-center text-base font-semibold tabular-nums outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
              />
              <button
                type="button"
                onClick={() => setUretimAdedi((n) => Math.min(60, n + 1))}
                disabled={uretimAdedi >= 60}
                aria-label="Adedi artır"
                className="inline-flex w-9 items-center justify-center hover:bg-muted disabled:opacity-40"
              >
                <Plus className="h-4 w-4" aria-hidden />
              </button>
            </div>
          </DosyaGrubu>

          <DosyaGrubu baslik="Tabla düzeni">
            <select
              value={duzen}
              onChange={(e) => setDuzen(e.target.value as TablaDuzeni)}
              aria-label="Tabla düzeni"
              title="Otomatik: tek tablaya sığıyor ve filament değişimi az kalıyorsa tek tabla; değilse renge göre ayrı tablalar"
              className="adjy-pixel-frame h-9 rounded-lg bg-card px-2 text-sm outline-none"
            >
              <option value="oto">Otomatik</option>
              <option value="tek">Tek tabla</option>
              <option value="ayri">Renge göre ayrı</option>
            </select>
          </DosyaGrubu>

          <DosyaGrubu baslik="Üretim">
            <button
              type="button"
              disabled={!hazir || !!indirilen}
              onClick={uretimIndir}
              title="Dilimleyici projesi: parçalar baskı yönünde, renge göre ayrı tablalarda, adet kadar dizili"
              className={`${DUGME} bg-foreground font-medium text-background hover:opacity-90`}
            >
              <Layers className="h-4 w-4" aria-hidden />
              Üretim 3MF · {uretimAdedi} adet
            </button>
          </DosyaGrubu>

          {/* Yeri hep ayrılmış: renkler gelince düğmeler kaymaz */}
          <DosyaGrubu
            baslik="Filament yuvaları"
            className="order-last w-full sm:order-none sm:w-auto sm:flex-1"
            tekSatir
          >
            {renkler.length > 0 ? (
              renkler.map((r) => (
                <span
                  key={r.no}
                  title={`Filament ${r.no}: ${r.ad} ${r.hex}`}
                  className="adjy-pixel-box inline-flex h-9 shrink-0 items-center gap-1.5 bg-card px-2 font-mono text-[11px] tabular-nums"
                >
                  <span
                    className="h-3.5 w-3.5 rounded-full border border-foreground/30"
                    style={{ backgroundColor: r.hex }}
                    aria-hidden
                  />
                  {r.no} {r.ad}
                </span>
              ))
            ) : (
              <span className="inline-flex h-9 items-center font-mono text-[11px] text-muted-foreground">
                Model kurulunca listelenir
              </span>
            )}
          </DosyaGrubu>

          <DosyaGrubu baslik="Hepsi">
            <button
              type="button"
              disabled={!hazir || !!indirilen}
              onClick={klasoreKaydet}
              title="Üretim projesi, parça STL'leri, belgeler ve sipariş bilgisi tek klasöre"
              className={`${DUGME} adjy-pixel-frame font-medium hover:bg-muted`}
            >
              <FolderDown className="h-4 w-4" aria-hidden />
              Klasöre kaydet
            </button>
          </DosyaGrubu>
        </div>

        <div className="mt-3 flex flex-wrap items-end gap-x-6 gap-y-3">
          {(stller.length > 0 || renkliPaket) && (
            <DosyaGrubu baslik="Parçalar · STL">
              {stller.map((c) => (
                <button
                  key={c.sec}
                  type="button"
                  disabled={!hazir || !!indirilen}
                  onClick={() => indir([c])}
                  className={`${DUGME} adjy-pixel-frame hover:bg-muted`}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  {c.ad.replace(/\s*\(?STL\)?$/i, "")}
                </button>
              ))}
              {renkliPaket && (
                <button
                  type="button"
                  disabled={!hazir || !!indirilen}
                  onClick={() => indir([renkliPaket])}
                  title="Modelin ekrandaki (montajlı) duruşu: her renk ayrı STL + renk listesi"
                  className={`${DUGME} text-muted-foreground hover:bg-muted hover:text-foreground`}
                >
                  <Download className="h-4 w-4" aria-hidden />
                  Renk STL&apos;leri
                </button>
              )}
            </DosyaGrubu>
          )}

          {(belgeler.length > 0 || digerleri.length > 0) && (
            <DosyaGrubu baslik="Belgeler">
              {belgeler.map((c) => (
                <button
                  key={c.sec}
                  type="button"
                  disabled={!hazir || !!indirilen}
                  onClick={() => indir([c])}
                  className={`${DUGME} text-muted-foreground hover:bg-muted hover:text-foreground`}
                >
                  <FileText className="h-4 w-4" aria-hidden />
                  {c.ad}
                </button>
              ))}
              {digerleri.length > 0 && (
                <details className="relative">
                  <summary
                    className={`${DUGME} cursor-pointer list-none text-muted-foreground hover:bg-muted hover:text-foreground`}
                  >
                    Diğer biçimler
                    <ChevronDown className="h-3.5 w-3.5" aria-hidden />
                  </summary>
                  <div className="absolute left-0 top-full z-30 mt-1 flex min-w-56 flex-col rounded-lg bg-popover p-1 adjy-pixel-frame">
                    {digerleri.map((c) => (
                      <button
                        key={c.sec}
                        type="button"
                        disabled={!hazir || !!indirilen}
                        onClick={() => indir([c])}
                        className="rounded-md px-3 py-2 text-left text-sm hover:bg-muted disabled:opacity-40"
                      >
                        {c.ad}
                      </button>
                    ))}
                  </div>
                </details>
              )}
            </DosyaGrubu>
          )}
        </div>

        {/* Durum: tek satır, sabit yükseklik; uzun metin kesilir (tamamı ipucunda) */}
        <div className="mt-2 flex h-5 items-center overflow-hidden text-xs text-muted-foreground">
          {indirilen ? (
            <span className="inline-flex items-center gap-1.5">
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
              {indirilen} hazırlanıyor
            </span>
          ) : kayit?.tur === "tamam" ? (
            <span className="inline-flex min-w-0 items-center gap-1.5 text-brand-lime">
              <Check className="h-3.5 w-3.5 shrink-0" aria-hidden />
              <span className="truncate">
                {kayit.sonuc.dosyalar.length} dosya → {kayit.sonuc.yer}
              </span>
            </span>
          ) : kayit?.tur === "hata" ? (
            <span role="alert" className="truncate text-destructive">
              {kayit.mesaj}
            </span>
          ) : tablalar ? (
            <span className="inline-flex min-w-0 items-center gap-1.5" title={tablaMetni(tablalar)}>
              <Check className="h-3.5 w-3.5 shrink-0 text-brand-lime" aria-hidden />
              <span className="truncate">
                <span className="text-brand-lime">{tablalar.length} tabla</span> · {tablaMetni(tablalar)}
                {proje?.tekTablaDegisimi != null &&
                  ` · tek tablada ≈ ${proje.tekTablaDegisimi} filament değişimi olurdu`}
              </span>
            </span>
          ) : (
            <span className="truncate">
              Üretim 3MF: parçalar baskı yönünde, {uretimAdedi} adet dizili. Tek tablaya sığıyorsa
              tek tabla; sığmıyorsa renge göre ayrı tablalar (filament değişmez).
            </span>
          )}
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {/* ---------- MÜŞTERİNİN SEÇİMLERİ (METİN) ---------- */}
        <aside
          className={`shrink-0 border-b-2 border-dashed border-foreground/25 bg-card lg:border-b-0 lg:border-r-2 ${
            secimlerAcik ? "lg:w-80" : "lg:w-12"
          }`}
        >
          <div className="flex items-center justify-between gap-2 px-3 py-2.5">
            <button
              type="button"
              onClick={() => setPanelTercihi(!secimlerAcik)}
              aria-expanded={secimlerAcik}
              aria-label={serbest ? "Şu anki ayarları aç ya da kapat" : "Müşterinin seçimlerini aç ya da kapat"}
              className="inline-flex items-center gap-1.5 text-sm font-medium"
            >
              <ChevronDown
                className={`h-4 w-4 transition-transform ${
                  secimlerAcik ? "" : "-rotate-90"
                }`}
                aria-hidden
              />
              {secimlerAcik && (serbest ? "Şu anki ayarlar" : "Müşterinin seçimleri")}
            </button>
            {secimlerAcik && kalem.secimler.length > 0 && (
              <button
                type="button"
                onClick={kopyala}
                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                {kopyalandi ? (
                  <Check className="h-3.5 w-3.5" aria-hidden />
                ) : (
                  <Copy className="h-3.5 w-3.5" aria-hidden />
                )}
                {kopyalandi ? "Kopyalandı" : "Kopyala"}
              </button>
            )}
          </div>

          {secimlerAcik && (
            <div className="max-h-[32vh] overflow-y-auto px-3 pb-4 lg:max-h-none lg:h-[calc(100%-2.75rem)]">
              {farklar.length > 0 && (
                <div className="mb-3 rounded-lg bg-brand-amber/10 p-2.5 text-xs">
                  <p className="font-medium text-brand-amber">
                    Araç bu alanları siparişteki gibi kuramadı
                  </p>
                  <ul className="mt-1.5 space-y-1 text-muted-foreground">
                    {farklar.map((f) => (
                      <li key={f.ad}>
                        {f.ad}: siparişte <b className="text-foreground">{f.siparis}</b>,
                        araçta {f.arac}
                      </li>
                    ))}
                  </ul>
                  <p className="mt-1.5 text-muted-foreground">
                    Basmadan önce alanı araçta elle düzeltin; doğru olan
                    siparişteki değerdir.
                  </p>
                </div>
              )}

              {kalem.secimler.length === 0 ? (
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {serbest ? "Araç açılınca ayarlar burada listelenir." : <>Müşteri ürünü değiştirmeden ekledi. Araç varsayılan
                  yapılandırmayla açılır; basılacak olan odur.</>}
                </p>
              ) : (
                <dl className="space-y-2 text-sm">
                  {kalem.secimler.map((s) => (
                    <div key={s.ad}>
                      <dt className="text-xs text-muted-foreground">{s.ad}</dt>
                      <dd className="break-words font-medium tabular-nums">{s.deger}</dd>
                    </div>
                  ))}
                </dl>
              )}

              {kalem.dosyalar.length > 0 && (
                <div className="mt-4 border-t-2 border-dashed border-foreground/25 pt-3">
                  <p className="mb-1.5 text-xs text-muted-foreground">Müşterinin dosyaları</p>
                  <ul className="space-y-1.5 text-sm">
                    {kalem.dosyalar.map((d) => (
                      <li key={`${d.ad}-${d.url}`} className="flex items-center gap-1.5">
                        <Paperclip className="h-3.5 w-3.5 shrink-0 text-muted-foreground" aria-hidden />
                        {d.url ? (
                          <a
                            href={d.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="truncate underline underline-offset-2"
                          >
                            {d.ad}
                          </a>
                        ) : (
                          <span className="truncate text-muted-foreground">
                            {d.ad} (yüklenmemiş)
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <dl className="mt-4 space-y-1 border-t-2 border-dashed border-foreground/25 pt-3 text-xs text-muted-foreground">
                {kalem.olcum.kutleG && (
                  <div className="flex justify-between gap-3">
                    <dt>{serbest ? "Filament" : "Filament (siparişte)"}</dt>
                    <dd className="tabular-nums">{kalem.olcum.kutleG} g</dd>
                  </div>
                )}
                {kalem.olcum.sureSaat && (
                  <div className="flex justify-between gap-3">
                    <dt>{serbest ? "Baskı süresi" : "Baskı süresi (siparişte)"}</dt>
                    <dd className="tabular-nums">{kalem.olcum.sureSaat} saat</dd>
                  </div>
                )}
                {!serbest && hazir && aracPaketi?.olcum.kutleG && (
                  <div className="flex justify-between gap-3">
                    <dt>Filament (araçta şimdi)</dt>
                    <dd className="tabular-nums">{aracPaketi.olcum.kutleG} g</dd>
                  </div>
                )}
                {!serbest && siparis.telefon && (
                  <div className="flex justify-between gap-3">
                    <dt>Telefon</dt>
                    <dd>{siparis.telefon}</dd>
                  </div>
                )}
                {!serbest && (
                  <div className="flex justify-between gap-3">
                    <dt>E-posta</dt>
                    <dd className="truncate">{siparis.eposta}</dd>
                  </div>
                )}
                {!serbest && siparis.not && (
                  <div className="pt-1.5">
                    <dt>Sipariş notu</dt>
                    <dd className="mt-0.5 text-foreground">{siparis.not}</dd>
                  </div>
                )}
              </dl>
            </div>
          )}
        </aside>

        {/* ---------- ARAÇ (ÜRETİCİ KİPİ) ---------- */}
        <div className="relative min-h-[60vh] flex-1 bg-surface-2 lg:min-h-0">
          {kaynak && (
            <iframe
              ref={cerceveRef}
              src={kaynak}
              title={`${arac.ad} — üretim aracı`}
              className="absolute inset-0 h-full w-full border-0"
              allow="clipboard-write"
            />
          )}
          {asama !== "hazir" && (
            <div
              role="status"
              className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-surface-2/90 text-sm text-muted-foreground"
            >
              <Loader2 className="h-7 w-7 animate-spin" aria-hidden />
              {asama === "aciliyor" ? "Araç açılıyor" : "Müşterinin modeli kuruluyor"}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
