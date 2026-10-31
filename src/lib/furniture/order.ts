// ==========================================
// SİPARİŞ TARAFINDA MOBİLYA FİYATI
//
// Sipariş API'si bütün fiyatları sunucuda yeniden hesaplar;
// tarayıcıdan gelen tutara güvenilmez. Mobilyanın veritabanında
// parametre satırı olmadığı için genel formül motoru ona
// dokunamaz — dokunsaydı müşteri hangi ölçüyü kurarsa kursun
// varsayılan fiyattan ücretlendirilirdi.
//
// Burası o boşluğu kapatıyor: sepetten gelen yapılandırma
// ürünün kendi sınırlarına göre doğrulanır, fiyat yeniden
// hesaplanır. Sınır dışı bir yapılandırma fiyatlandırılmaz,
// reddedilir — 4 metrelik kitaplık siparişi tezgâha düşmesin.
// ==========================================

import {
  modelBul,
  siraSiniri,
  sutunSiniri,
  varsayilanYapilandirma,
  MODELLER,
} from "./catalog";
import { tabanBul, TABANLAR, KULPLAR } from "./hardware";
import { MALZEMELER } from "./materials";
import { yapilandirmayiDuzelt } from "./panels";
import { fiyatiYuvarla, mobilyaFiyati } from "./pricing";
import type { GozIcerigi, MobilyaYapilandirma } from "./types";

/** Ürün bu SKU ön ekini taşıyorsa mobilya olarak fiyatlanır */
export const MOBILYA_SKU_ONEK = "MOB-";

export function mobilyaUrunuMu(sku: string | null | undefined): boolean {
  return !!sku && sku.startsWith(MOBILYA_SKU_ONEK);
}

function sayi(v: unknown, varsayilan: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : varsayilan;
}

function oturt(v: number, min: number, max: number, adim: number): number {
  const a = Math.round(v / adim) * adim;
  return Math.min(max, Math.max(min, a));
}

/**
 * Sepetten gelen ham parametreleri güvenli bir yapılandırmaya
 * çevirir. Dönen yapılandırma her zaman üretilebilir: ölçüler
 * aralığa oturtulur, sütun ve sıra montaj kurallarına çekilir,
 * tanınmayan malzeme ve donanım varsayılana düşer.
 */
export function yapilandirmayiCoz(
  ham: Record<string, unknown> | null | undefined
): { cfg: MobilyaYapilandirma; fiyat: number } | null {
  if (!ham || typeof ham !== "object") return null;
  const modelId = String(ham.modelId ?? "");
  const model = MODELLER.find((m) => m.id === modelId);
  if (!model) return null;

  const v = varsayilanYapilandirma(model);

  const genislik = oturt(
    sayi(ham.genislik, v.genislik),
    model.genislik.min,
    model.genislik.max,
    model.genislik.adim
  );
  const yukseklik = oturt(
    sayi(ham.yukseklik, v.yukseklik),
    model.yukseklik.min,
    model.yukseklik.max,
    model.yukseklik.adim
  );
  const derinlik = oturt(
    sayi(ham.derinlik, v.derinlik),
    model.derinlik.min,
    model.derinlik.max,
    model.derinlik.adim
  );

  const taban =
    model.tabanSecilebilir &&
    TABANLAR.some((t) => t.id === ham.taban)
      ? String(ham.taban)
      : v.taban;

  const sc = sutunSiniri(model, genislik);
  const sr = siraSiniri(model, yukseklik, tabanBul(taban).yukseklik);
  const sutun = Math.min(sc.max, Math.max(sc.min, sayi(ham.sutun, v.sutun)));
  const sira = Math.min(sr.max, Math.max(sr.min, sayi(ham.sira, v.sira)));

  const malzemeVarMi = (id: unknown) =>
    typeof id === "string" && MALZEMELER.some((m) => m.id === id);

  const gozler: Record<string, GozIcerigi> = {};
  if (model.gozSecilebilir && ham.gozler && typeof ham.gozler === "object") {
    for (const [anahtar, deger] of Object.entries(
      ham.gozler as Record<string, unknown>
    )) {
      if (deger === "kapak" || deger === "cekmece") gozler[anahtar] = deger;
    }
  }

  const cfg = yapilandirmayiDuzelt({
    modelId: model.id,
    genislik,
    yukseklik,
    derinlik,
    sutun,
    sira,
    gozler,
    govdeMalzeme: malzemeVarMi(ham.govdeMalzeme)
      ? String(ham.govdeMalzeme)
      : v.govdeMalzeme,
    onMalzeme: malzemeVarMi(ham.onMalzeme)
      ? String(ham.onMalzeme)
      : v.onMalzeme,
    taban,
    kulp: KULPLAR.some((k) => k.id === ham.kulp) ? String(ham.kulp) : v.kulp,
    arkaPanel:
      typeof ham.arkaPanel === "boolean" ? ham.arkaPanel : v.arkaPanel,
  });

  const fiyat = fiyatiYuvarla(
    mobilyaFiyati(cfg, { iscilikCarpani: model.iscilikCarpani }).toplam
  );
  return { cfg, fiyat };
}

/** Sipariş kaleminde ve admin panelinde okunur özet */
export function yapilandirmaOzeti(cfg: MobilyaYapilandirma): string {
  const model = MODELLER.find((m) => m.id === cfg.modelId);
  const parcalar = [
    `${cfg.genislik / 10} × ${cfg.yukseklik / 10} × ${cfg.derinlik / 10} cm`,
    `${cfg.sutun} sütun × ${cfg.sira} sıra`,
  ];
  const kapak = Object.values(cfg.gozler).filter((v) => v === "kapak").length;
  const cekmece = Object.values(cfg.gozler).filter(
    (v) => v === "cekmece"
  ).length;
  if (kapak) parcalar.push(`${kapak} kapak`);
  if (cekmece) parcalar.push(`${cekmece} çekmece`);
  return `${model?.ad ?? "Mobilya"} — ${parcalar.join(", ")}`;
}

export { modelBul };
