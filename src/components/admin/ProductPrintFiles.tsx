"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Download, FileBox, Loader2, Trash2, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  BASKI_UZANTILARI,
  baskiDosyasiMi,
  boyutYaz,
  type BaskiDosyasi,
} from "@/lib/baskiDosyalari";
import {
  baskiDosyalariniEkle,
  baskiDosyalariniKaydet,
  baskiDosyasiAl,
  baskiDurumu,
  blobIndir,
} from "@/lib/baskiDosyasiYukle";

// ==========================================
// ÜRÜNÜN BASKI DOSYALARI (admin ürün düzenleme)
//
// Hazır ürünün atölyede basılan dosyaları. Müşteri bunları
// görmez; sipariş geldiğinde sipariş ekranında indirilir.
//
// `surum` değişince liste yeniden okunur (3D dosyası yükleyici
// STL'leri buraya da kaydettiğinde).
// ==========================================

interface Props {
  productId: string;
  surum?: number;
}

export function ProductPrintFiles({ productId, surum = 0 }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dosyalar, setDosyalar] = useState<BaskiDosyasi[] | null>(null);
  const [depoVar, setDepoVar] = useState(true);
  const [islem, setIslem] = useState<string | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  const oku = useCallback(async () => {
    try {
      const d = await baskiDurumu(productId);
      setDosyalar(d.dosyalar);
      setDepoVar(!!d.hedef);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Okunamadı");
      setDosyalar([]);
    }
  }, [productId]);

  useEffect(() => {
    void oku();
  }, [oku, surum]);

  async function ekle(secilen: File[]) {
    const uygun = secilen.filter((f) => baskiDosyasiMi(f.name));
    const atlanan = secilen.length - uygun.length;
    setHata(atlanan ? `${atlanan} dosya atlandı: yalnızca ${BASKI_UZANTILARI.join(" ")}` : null);
    if (!uygun.length) return;
    try {
      const yeni = await baskiDosyalariniEkle(productId, uygun, (i, n, ad) =>
        setIslem(`Yükleniyor ${i}/${n}: ${ad}`)
      );
      setDosyalar(yeni);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Yüklenemedi");
    } finally {
      setIslem(null);
    }
  }

  async function kaldir(d: BaskiDosyasi) {
    if (!dosyalar) return;
    setIslem(`${d.ad} kaldırılıyor`);
    try {
      setDosyalar(await baskiDosyalariniKaydet(productId, dosyalar.filter((x) => x.url !== d.url)));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaldırılamadı");
    } finally {
      setIslem(null);
    }
  }

  async function indir(d: BaskiDosyasi) {
    setIslem(`${d.ad} indiriliyor`);
    try {
      blobIndir(await baskiDosyasiAl(d), d.ad);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İndirilemedi");
    } finally {
      setIslem(null);
    }
  }

  return (
    <div className="rounded-lg adjy-pixel-frame p-4" data-baski-dosyalari>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Baskı dosyaları</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Atölyede basılan dosyalar (STL, 3MF, STEP, G-code). Müşteri
            görmez; bu ürün sipariş edilince sipariş ekranından indirilir.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={!!islem || !depoVar}
        >
          <Upload className="mr-2 h-4 w-4" />
          Dosya ekle
        </Button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={BASKI_UZANTILARI.join(",")}
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            e.target.value = "";
            if (fs.length) void ekle(fs);
          }}
        />
      </div>

      {!depoVar && (
        <p className="mt-3 text-xs text-destructive">
          Dosya deposu yapılandırılmamış (CLOUDINARY_* ortam değişkenleri).
        </p>
      )}

      {dosyalar === null ? (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Okunuyor…
        </p>
      ) : dosyalar.length === 0 ? (
        <p className="mt-4 rounded-md border-2 border-dashed border-foreground/20 p-4 text-center text-sm text-muted-foreground">
          Henüz baskı dosyası yok. Bu ürün sipariş edildiğinde indirilecek
          dosyaları ekleyin.
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border text-sm">
          {dosyalar.map((d) => (
            <li key={d.url} className="flex items-center gap-3 py-2">
              <FileBox className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
              <span className="min-w-0 flex-1 truncate font-mono text-xs">{d.ad}</span>
              <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                {boyutYaz(d.boyut)}
              </span>
              <button
                type="button"
                onClick={() => indir(d)}
                disabled={!!islem}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                aria-label={`${d.ad} indir`}
              >
                <Download className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => kaldir(d)}
                disabled={!!islem}
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                aria-label={`${d.ad} kaldır`}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      {islem && (
        <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="h-3.5 w-3.5 animate-spin" /> {islem}
        </p>
      )}
      {hata && <p className="mt-3 text-xs text-destructive">{hata}</p>}
    </div>
  );
}
