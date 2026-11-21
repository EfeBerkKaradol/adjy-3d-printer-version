"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Download, FileBox, FolderDown, Loader2 } from "lucide-react";
import { boyutYaz, type BaskiDosyasi } from "@/lib/baskiDosyalari";
import { baskiDosyasiAl, blobIndir } from "@/lib/baskiDosyasiYukle";
import {
  klasoreYaz,
  klasoruHazirla,
  siparisKlasoruAdi,
  type KayitSonucu,
} from "@/lib/tasarim/kaydet";

// ==========================================
// SİPARİŞ DETAYINDA HAZIR ÜRÜN KALEMİ
//
// Hazır ürünün (abajur, vazo…) baskı dosyaları ürüne bir kez
// yüklenir; sipariş gelince burada indirilir. Tasarım
// ürünlerindeki gibi "Hepsini kaydet" dosyaları müşterinin adı
// ve sipariş numarasıyla açılan klasöre yazar.
// ==========================================

interface Props {
  productId: string | null;
  urunAdi: string;
  adet: number;
  dosyalar: BaskiDosyasi[];
  siparis: { no: string; musteri: string };
  /** Siparişte birden çok ürün varsa dosyaların gireceği alt klasör */
  altKlasor: string | null;
}

export function BaskiDosyalariKalemi({ productId, urunAdi, adet, dosyalar, siparis, altKlasor }: Props) {
  const [islem, setIslem] = useState<string | null>(null);
  const [sonuc, setSonuc] = useState<KayitSonucu | null>(null);
  const [hata, setHata] = useState<string | null>(null);

  async function tekIndir(d: BaskiDosyasi) {
    setHata(null);
    setIslem(d.ad);
    try {
      blobIndir(await baskiDosyasiAl(d), d.ad);
    } catch (e) {
      setHata(e instanceof Error ? e.message : "İndirilemedi");
    } finally {
      setIslem(null);
    }
  }

  async function hepsiniKaydet() {
    setHata(null);
    setSonuc(null);
    // Klasör izni tıklamanın hemen ardından istenmeli: dosyalardan önce
    const hedef = await klasoruHazirla();
    if (!hedef) return;
    try {
      const alinan = [];
      for (const [i, d] of dosyalar.entries()) {
        setIslem(`İndiriliyor ${i + 1}/${dosyalar.length}: ${d.ad}`);
        alinan.push({ ad: d.ad, blob: await baskiDosyasiAl(d) });
      }
      const bilgi = [
        `Sipariş: ${siparis.no}`,
        `Müşteri: ${siparis.musteri}`,
        `Ürün: ${urunAdi}`,
        `Adet: ${adet}`,
        "",
        "Dosyalar:",
        ...dosyalar.map((d) => `  ${d.ad}`),
      ].join("\r\n");
      alinan.push({ ad: "siparis-bilgisi.txt", blob: new Blob([bilgi], { type: "text/plain" }) });
      setIslem("Kaydediliyor");
      setSonuc(await klasoreYaz(hedef, siparisKlasoruAdi(siparis.musteri, siparis.no), altKlasor, alinan));
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi");
    } finally {
      setIslem(null);
    }
  }

  return (
    <div className="mt-3 rounded-lg bg-muted/40 p-3.5" data-baski-kalemi>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-muted-foreground">
          Baskı dosyaları{adet > 1 ? ` · ${adet} adet basılacak` : ""}
        </p>
        {dosyalar.length > 0 && (
          <button
            type="button"
            onClick={hepsiniKaydet}
            disabled={!!islem}
            className="inline-flex h-8 items-center gap-1.5 rounded-md bg-foreground px-3 text-xs font-medium text-background transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {islem ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <FolderDown className="h-3.5 w-3.5" aria-hidden />
            )}
            Hepsini sipariş klasörüne kaydet
          </button>
        )}
      </div>

      {dosyalar.length === 0 ? (
        <p className="mt-2.5 text-sm text-muted-foreground">
          Bu ürüne baskı dosyası yüklenmemiş.{" "}
          {productId && (
            <Link
              href={`/admin/products/${productId}#baski-dosyalari`}
              className="text-foreground underline underline-offset-2"
            >
              Ürün sayfasından ekleyin
            </Link>
          )}
        </p>
      ) : (
        <ul className="mt-2.5 space-y-1">
          {dosyalar.map((d) => (
            <li key={d.url}>
              <button
                type="button"
                onClick={() => tekIndir(d)}
                disabled={!!islem}
                className="group flex w-full items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-muted"
              >
                <FileBox className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                <span className="min-w-0 flex-1 truncate font-mono text-xs">{d.ad}</span>
                <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                  {boyutYaz(d.boyut)}
                </span>
                <Download
                  className="h-3.5 w-3.5 shrink-0 text-muted-foreground group-hover:text-foreground"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}

      {islem && <p className="mt-2 text-xs text-muted-foreground">{islem}</p>}
      {sonuc && (
        <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
          <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-foreground" aria-hidden />
          <span>
            {sonuc.tur === "klasor"
              ? `${sonuc.dosyalar.length} dosya kaydedildi: `
              : `${sonuc.dosyalar.length} dosya ZIP olarak indirildi: `}
            <span className="break-all font-mono">{sonuc.yer}</span>
          </span>
        </p>
      )}
      {hata && <p className="mt-2 text-xs text-destructive">{hata}</p>}
    </div>
  );
}
