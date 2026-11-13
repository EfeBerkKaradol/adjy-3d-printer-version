"use client";

import { useCallback, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  Boxes,
  Check,
  ChevronDown,
  Layers,
  Loader2,
  Move3d,
  Palette,
  Ruler,
  ShoppingCart,
} from "lucide-react";
import { FurnitureScene } from "./FurnitureScene";
import { FurnitureARButton } from "./FurnitureARButton";
import {
  BolmePaneli,
  IzgaraPaneli,
  MalzemeSecici,
  OlcuPaneli,
  TabanPaneli,
} from "./controls";
import {
  type MobilyaModeli,
  siraSiniri,
  sutunSiniri,
  varsayilanYapilandirma,
} from "@/lib/furniture/catalog";
import { tabanBul } from "@/lib/furniture/hardware";
import { fiyatiYuvarla, mobilyaFiyati } from "@/lib/furniture/pricing";
import { gozlerinYerlesimi, yapilandirmayiDuzelt } from "@/lib/furniture/panels";
import type {
  GozAnahtari,
  GozIcerigi,
  MobilyaYapilandirma,
} from "@/lib/furniture/types";
import { useCartStore } from "@/store/cartStore";
import { formatTRY } from "@/lib/slicer";

// ==========================================
// MOBİLYA YAPILANDIRICI
//
// Mağazadaki ürün sayfasının mobilya karşılığı. Fark şu:
// burada bakılacak hazır bir ürün yok, ürün yapılandırılırken
// var oluyor. Bu yüzden sayfa fotoğrafla değil modelle açılır
// ve kontroller en baştan açıktır — tıklanacak bir
// "özelleştir" adımı yok.
//
// Açılışta boş bir ekran değil, çalışan bir yapılandırma
// gelir. Araştırmanın en net bulgusu buydu: insan sıfırdan
// kurmak istemiyor, hazır olanı kendine göre değiştirmek
// istiyor.
//
// Fiyat her dokunuşta güncellenir ve dökümü açılabilir.
// "Neden bu kadar" sorusunun cevabı sayfanın içinde.
// ==========================================

type Grup = "olcu" | "izgara" | "bolme" | "yuzey" | "taban";

const GRUPLAR: { id: Grup; ad: string; ikon: typeof Ruler }[] = [
  { id: "olcu", ad: "Ölçü", ikon: Ruler },
  { id: "izgara", ad: "Izgara", ikon: Boxes },
  { id: "bolme", ad: "Bölme", ikon: Layers },
  { id: "yuzey", ad: "Yüzey", ikon: Palette },
  { id: "taban", ad: "Taban", ikon: Move3d },
];

interface Props {
  model: MobilyaModeli;
  /** Sepetin bağlanacağı veritabanı ürünü */
  urunId: string;
  odaId: string;
  odaAdi: string;
}

export function FurnitureConfigurator({ model, urunId, odaId, odaAdi }: Props) {
  const router = useRouter();
  const addItem = useCartStore((s) => s.addItem);

  const [cfg, setCfg] = useState<MobilyaYapilandirma>(() =>
    varsayilanYapilandirma(model)
  );
  const [grup, setGrup] = useState<Grup>("olcu");
  const [seciliGoz, setSeciliGoz] = useState<GozAnahtari | null>(null);
  const [dokumAcik, setDokumAcik] = useState(false);
  const [eklendi, setEklendi] = useState(false);
  const [ekleniyor, setEkleniyor] = useState(false);

  /**
   * Her değişiklik montaj kurallarından geçer. Genişlik
   * büyüyünce sütun sayısı yetmiyorsa kendiliğinden artar;
   * ızgaradan düşen gözlerin kaydı silinir. Böylece
   * kullanıcı geçersiz bir mobilya kuramaz.
   */
  const guncelle = useCallback(
    (yama: Partial<MobilyaYapilandirma>) => {
      setCfg((onceki) => {
        const y = { ...onceki, ...yama };
        const ty = tabanBul(y.taban).yukseklik;
        const sc = sutunSiniri(model, y.genislik);
        const sr = siraSiniri(model, y.yukseklik, ty);
        y.sutun = Math.min(sc.max, Math.max(sc.min, y.sutun));
        y.sira = Math.min(sr.max, Math.max(sr.min, y.sira));
        if (!model.gozSecilebilir) y.gozler = {};
        return yapilandirmayiDuzelt(y);
      });
    },
    [model]
  );

  // Izgaradan düşen göz seçili kalmasın
  const gozler = useMemo(() => gozlerinYerlesimi(cfg), [cfg]);
  const gecerliSecim =
    seciliGoz && gozler.some((g) => g.anahtar === seciliGoz) ? seciliGoz : null;

  const dokum = useMemo(
    () => mobilyaFiyati(cfg, { iscilikCarpani: model.iscilikCarpani }),
    [cfg, model.iscilikCarpani]
  );
  const fiyat = fiyatiYuvarla(dokum.toplam);

  const icerikDegistir = useCallback(
    (anahtar: GozAnahtari, icerik: GozIcerigi) => {
      setCfg((o) => {
        const g = { ...o.gozler };
        if (icerik === "bos") delete g[anahtar];
        else g[anahtar] = icerik;
        return { ...o, gozler: g };
      });
    },
    []
  );

  const hepsiYap = useCallback(
    (icerik: GozIcerigi) => {
      setCfg((o) => {
        if (icerik === "bos") return { ...o, gozler: {} };
        const g: Record<string, GozIcerigi> = {};
        for (const goz of gozlerinYerlesimi(o)) g[goz.anahtar] = icerik;
        return { ...o, gozler: g };
      });
    },
    []
  );

  const olcuMetni = `${cfg.genislik / 10} × ${cfg.yukseklik / 10} × ${cfg.derinlik / 10} cm`;

  function sepeteEkle() {
    setEkleniyor(true);
    addItem({
      product: {
        id: urunId,
        name: `${model.ad} — ${olcuMetni}`,
        basePrice: fiyat,
        thumbnailUrl: null,
      },
      customization: {
        id: null,
        // Yapılandırmanın tamamı taşınır: sipariş sonrası
        // atölye kesim listesini buradan üretiyor.
        parameters: {
          ...cfg,
          ozet: olcuMetni,
          sutunSira: model.izgaraSecilebilir
            ? `${cfg.sutun} sütun × ${cfg.sira} sıra`
            : cfg.sira >= 2
              ? "alt raflı"
              : "alt rafsız",
          panelSayisi: dokum.panelSayisi,
          levhaAlani: Number(dokum.levhaAlani.toFixed(2)),
        },
      },
      quantity: 1,
      calculatedPrice: fiyat,
    });
    setEklendi(true);
    setEkleniyor(false);
    setTimeout(() => setEklendi(false), 2400);
    router.refresh();
  }

  return (
    <div className="lg:grid lg:h-[calc(100vh-4rem)] lg:grid-cols-[1fr_26rem] lg:overflow-hidden">
      {/* ---------- SAHNE ---------- */}
      <div className="relative bg-gradient-to-b from-muted/40 to-muted/70">
        <div className="absolute left-4 top-4 z-10 flex items-center gap-2">
          <Link
            href={`/mobilya/${odaId}`}
            className="inline-flex h-9 items-center gap-1.5 rounded-full bg-background/90 px-3 text-sm backdrop-blur transition-colors hover:bg-background"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden />
            {odaAdi}
          </Link>
          <h1 className="truncate rounded-full bg-background/90 px-3 py-1.5 text-sm font-medium backdrop-blur lg:hidden">
            {model.ad}
          </h1>
        </div>

        <div className="pointer-events-none absolute right-4 top-4 z-10 hidden rounded-xl bg-background/90 px-3.5 py-2 text-right backdrop-blur lg:block">
          <p className="text-lg font-semibold tabular-nums">{formatTRY(fiyat)}</p>
          <p className="text-[11px] text-muted-foreground">KDV ve kargo dâhil</p>
        </div>

        <FurnitureScene
          cfg={cfg}
          gozSecimi={grup === "bolme" && model.gozSecilebilir}
          seciliGoz={gecerliSecim}
          onGozSec={setSeciliGoz}
          siluet
          className="h-[34vh] w-full lg:h-full"
        />

        <p className="pointer-events-none absolute bottom-3 left-1/2 z-10 -translate-x-1/2 text-xs text-muted-foreground">
          {grup === "bolme" && model.gozSecilebilir
            ? "Bir göze dokunun"
            : "Sürükleyerek çevirin"}
        </p>
      </div>

      {/* ---------- KONTROLLER ---------- */}
      <aside className="flex flex-col border-t-2 border-dashed border-foreground/25 bg-background lg:border-l lg:border-t-0">
        {/* Mobilde bu blok ekranın dörtte birini yiyordu ve
            kontroller katlanın altında kalıyordu. Ürün adı
            sahnenin üstünde zaten yazıyor; açıklama da ürüne
            girmeden önce kartta okundu. */}
        <div className="hidden border-b-2 border-dashed border-foreground/25 px-5 py-4 lg:block">
          <h1 className="text-lg font-medium tracking-tight">{model.ad}</h1>
          <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
            {model.aciklama}
          </p>
        </div>

        {/* Grup seçici — başparmağın ulaştığı yerde, yatay */}
        <div className="sticky top-0 z-10 flex gap-1 overflow-x-auto border-b-2 border-dashed border-foreground/25 bg-background px-3 py-2.5">
          {GRUPLAR.filter(
            (g) =>
              (g.id !== "bolme" || model.gozSecilebilir) &&
              (g.id !== "izgara" || model.izgaraSecilebilir)
          ).map((g) => {
            const Ikon = g.ikon;
            const aktif = grup === g.id;
            return (
              <button
                key={g.id}
                type="button"
                onClick={() => setGrup(g.id)}
                aria-pressed={aktif}
                className={`flex shrink-0 flex-col items-center gap-1 rounded-lg px-3.5 py-2 text-xs transition-colors ${
                  aktif
                    ? "bg-foreground text-background"
                    : "text-muted-foreground hover:bg-muted"
                }`}
              >
                <Ikon className="h-4 w-4" aria-hidden />
                {g.id === "taban" && model.tur === "masa" ? "Ayak" : g.ad}
              </button>
            );
          })}
        </div>

        <div className="flex-1 overflow-y-auto px-5 pb-44 pt-5 lg:pb-5">
          {grup === "olcu" && (
            <OlcuPaneli cfg={cfg} model={model} onDegis={guncelle} />
          )}
          {grup === "izgara" && model.izgaraSecilebilir && (
            <IzgaraPaneli cfg={cfg} model={model} onDegis={guncelle} />
          )}
          {grup === "bolme" && model.gozSecilebilir && (
            <BolmePaneli
              cfg={cfg}
              seciliGoz={gecerliSecim}
              onIcerikDegistir={icerikDegistir}
              onHepsi={hepsiYap}
              onKulp={(id) => guncelle({ kulp: id })}
            />
          )}
          {grup === "yuzey" && (
            <div className="space-y-7">
              <MalzemeSecici
                etiket="Gövde"
                deger={cfg.govdeMalzeme}
                onChange={(id) =>
                  guncelle(
                    // Ön yüzey gövdeyle aynıysa birlikte değişir:
                    // çoğu kişi iki ayrı renk istemiyor, isteyen
                    // aşağıdan ayırabiliyor.
                    cfg.onMalzeme === cfg.govdeMalzeme
                      ? { govdeMalzeme: id, onMalzeme: id }
                      : { govdeMalzeme: id }
                  )
                }
              />
              {Object.values(cfg.gozler).some((v) => v !== "bos") && (
                <div className="border-t-2 border-dashed border-foreground/25 pt-6">
                  <MalzemeSecici
                    etiket="Kapak ve çekmece yüzeyi"
                    deger={cfg.onMalzeme}
                    onChange={(id) => guncelle({ onMalzeme: id })}
                  />
                </div>
              )}
            </div>
          )}
          {grup === "taban" && (
            <TabanPaneli
              cfg={cfg}
              model={model}
              onTaban={(id) => guncelle({ taban: id })}
              onArkaPanel={(v) => guncelle({ arkaPanel: v })}
              onAltRaf={(v) => guncelle({ sira: v ? 2 : 1 })}
            />
          )}
        </div>

        {/* ---------- FİYAT VE SEPET ---------- */}
        {/* Mobilde sepet düğmesi sayfanın dibinde kalıyordu; ölçüyü
            değiştiren kişi fiyatı görmek için her seferinde aşağı
            kaydırmak zorundaydı. Araştırmanın en net bulgusu
            buydu: sepet, modelin dibinde durmalı. */}
        <div className="fixed inset-x-0 bottom-0 z-20 border-t-2 border-dashed border-foreground/25 bg-background px-5 py-4 lg:static lg:z-auto">
          <button
            type="button"
            onClick={() => setDokumAcik((a) => !a)}
            aria-expanded={dokumAcik}
            className="flex w-full items-baseline justify-between gap-3 text-left"
          >
            <span>
              <span className="block text-xl font-semibold tabular-nums">
                {formatTRY(fiyat)}
              </span>
              <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                Fiyat nasıl oluşuyor
                <ChevronDown
                  className={`h-3 w-3 transition-transform ${dokumAcik ? "rotate-180" : ""}`}
                  aria-hidden
                />
              </span>
            </span>
            <span className="text-right text-xs tabular-nums text-muted-foreground">
              {olcuMetni}
              <br />
              {/* Masanın sütunu ve sırası yok; "1 sütun × 1 sıra"
                  yazmak anlamsız bir bilgi olurdu. */}
              {model.izgaraSecilebilir
                ? `${cfg.sutun} sütun × ${cfg.sira} sıra`
                : cfg.sira >= 2
                  ? "alt raflı"
                  : "alt rafsız"}
            </span>
          </button>

          {dokumAcik && (
            <dl className="mt-3 max-h-[42vh] space-y-1.5 overflow-y-auto rounded-lg bg-muted/50 p-3 text-xs lg:max-h-none">
              {dokum.satirlar.map((s) => (
                <div key={s.ad} className="flex justify-between gap-3">
                  <dt className="text-muted-foreground">
                    {s.ad}
                    {s.not && (
                      <span className="block text-[11px] opacity-70">{s.not}</span>
                    )}
                  </dt>
                  <dd className="shrink-0 tabular-nums">
                    {formatTRY(s.tutar)}
                  </dd>
                </div>
              ))}
              <div className="flex justify-between gap-3 border-t-2 border-dashed border-foreground/25 pt-1.5">
                <dt className="text-muted-foreground">Üretim ve kâr payı</dt>
                <dd className="shrink-0 tabular-nums">
                  {formatTRY(dokum.listeFiyat - dokum.dogrudanMaliyet)}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-muted-foreground">KDV %20</dt>
                <dd className="shrink-0 tabular-nums">{formatTRY(dokum.kdv)}</dd>
              </div>
              <p className="pt-1.5 leading-relaxed text-muted-foreground">
                {dokum.panelSayisi} parça, {dokum.levhaAlani.toFixed(2)} m²
                levha. Fiyat kesim listesinden hesaplanıyor — ölçü değişince
                hangi parçanın büyüdüğü belli olduğu için fiyat da ona göre
                değişiyor.
              </p>
            </dl>
          )}

          <div className="mt-3.5 flex items-stretch gap-2.5 lg:flex-col">
            <button
              type="button"
              onClick={sepeteEkle}
              disabled={ekleniyor}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-foreground py-3.5 text-base font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
            >
              {ekleniyor ? (
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden />
              ) : eklendi ? (
                <>
                  <Check className="h-5 w-5" aria-hidden />
                  Sepete eklendi
                </>
              ) : (
                <>
                  <ShoppingCart className="h-5 w-5 shrink-0" aria-hidden />
                  <span className="truncate">
                    Sepete ekle
                    <span className="hidden lg:inline"> — {formatTRY(fiyat)}</span>
                  </span>
                </>
              )}
            </button>
            <div className="w-36 shrink-0 lg:w-full">
              <FurnitureARButton cfg={cfg} ad={model.ad} />
            </div>
          </div>

          <p className="mt-3 hidden text-xs leading-relaxed text-muted-foreground lg:block">
            Sipariş sonrası üretilir, teslim süresi 3–4 hafta. Montaj talimatı
            ve gerekli donanım kutudan çıkar.
          </p>
        </div>
      </aside>
    </div>
  );
}
