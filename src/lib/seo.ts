// ==========================================
// ARAMA GÖRÜNÜRLÜĞÜ
//
// Başlık ve açıklamaların tek yerden üretilmesi için.
//
// İki kural var:
//
// 1) Başlık kısa kalır. Google ~60 karakterden sonrasını
//    kesiyor; şablonun eklediği " | ADJY" de buna dahil.
//    Kesilen başlık, içine kelime tıkılmış başlıktan daha
//    çok zarar veriyor.
//
// 2) Anahtar kelime açıklamaya girer, başlığa değil.
//    Açıklama hem arama sonucunda okunur hem de tıklama
//    kararını verdirir; "3D baskı duvar rafı" gibi ifadeler
//    orada doğal bir cümlenin parçası olarak durur.
// ==========================================

import { familyFor, familyLabel } from "./materialFamily";
import { formatCmValue } from "./units";

/** Başlık + şablon eki toplamda bunu aşmamalı */
const TITLE_BUDGET = 52;

export function clampTitle(value: string, budget = TITLE_BUDGET): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= budget) return clean;
  // Kelimenin ortasından kesme — son tam kelimede dur
  const cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  return (lastSpace > budget * 0.6 ? cut.slice(0, lastSpace) : cut).trim();
}

export function clampDescription(value: string, budget = 158): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= budget) return clean;
  const cut = clean.slice(0, budget);
  const lastSpace = cut.lastIndexOf(" ");
  return `${(lastSpace > 100 ? cut.slice(0, lastSpace) : cut).trim()}…`;
}

export interface ProductSeoInput {
  name: string;
  description: string | null;
  basePrice: number;
  categoryName: string;
  materialType: string | null;
  /** Ölçü aralığı olan parametreler (mm cinsinden) */
  dimensions: Array<{ label: string; minMm: number; maxMm: number }>;
}

/**
 * Ürün başlığı.
 *
 * Ürünün kendi adı öne alınır — marka aramasında aranan odur.
 * Ardından ayırt edici tek bir nitelik gelir: ölçüsü
 * değişebiliyorsa bu, değişemiyorsa üretim türü.
 */
export function productTitle(p: ProductSeoInput): string {
  const family = familyFor(p.materialType);
  const familyText = family ? familyLabel(family) : null;

  const qualifier =
    p.dimensions.length > 0
      ? familyText
        ? `Ölçüye Özel ${familyText}`
        : "Ölçüye Özel Üretim"
      : familyText;

  // Nitelik bütünüyle sığmıyorsa hiç eklenmez. Kırpılmış bir
  // nitelik ("… — Ölçüye Özel 3D") bozuk görünüyor ve ürün
  // adının kendisinden daha az iş görüyor.
  if (qualifier) {
    const full = `${p.name} — ${qualifier}`;
    if (full.length <= TITLE_BUDGET) return full;
  }
  return clampTitle(p.name);
}

/** Cümle içinde geçerken: kısaltma büyük kalır, kelime küçülür */
function inSentence(label: string): string {
  return label.replace(/\b(Baskı|Seramik|Alçı)\b/g, (w) => w.toLocaleLowerCase("tr-TR"));
}

/** Metnin ilk tam cümlesi — yoksa kelime sınırında kısaltılmış hâli */
function firstSentence(text: string, max: number): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const stop = clean.slice(0, max + 1).lastIndexOf(". ");
  if (stop > max * 0.45) return clean.slice(0, stop + 1);

  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return `${(space > max * 0.6 ? cut.slice(0, space) : cut).trim()}…`;
}

/**
 * Ürün açıklaması.
 *
 * Parçalar sırayla eklenir ve yalnızca bütünüyle sığıyorsa
 * alınır. Önceki hâli metni sınıra gelince ortadan kesiyordu;
 * arama sonucunda yarım kalan bir cümle, eksik bir cümleden
 * daha kötü görünüyor.
 */
export function productDescription(p: ProductSeoInput): string {
  const family = familyFor(p.materialType);
  const familyText = family ? inSentence(familyLabel(family)) : null;

  const own = p.description?.trim()
    ? firstSentence(p.description, 96)
    : `${p.name}, ${p.categoryName} koleksiyonundan.`;

  const dimension =
    p.dimensions.length > 0
      ? `${formatCmValue(p.dimensions[0].minMm)}–${formatCmValue(p.dimensions[0].maxMm)} cm arası ${p.dimensions[0].label.toLocaleLowerCase("tr-TR")} seçilebilir.`
      : familyText
        ? `${familyText} ile üretilir.`
        : null;

  const price = `${p.basePrice.toFixed(0)} TL'den başlar.`;

  // En ayırt edici olan önce; kalan yere sığan eklenir
  let out = own;
  for (const part of [dimension, price]) {
    if (!part) continue;
    if (out.length + 1 + part.length <= 158) out = `${out} ${part}`;
  }
  return out;
}

/**
 * Anahtar kelimeler.
 *
 * Google bu etiketi sıralamada kullanmıyor; diğer arama
 * motorları ve site içi arama için üretiliyor. Bu yüzden
 * uzun tutulmuyor — uydurma kelime eklemenin faydası yok.
 */
export function productKeywords(p: ProductSeoInput): string[] {
  const family = familyFor(p.materialType);
  const out = new Set<string>([p.name, p.categoryName, "ADJY"]);

  if (family) out.add(familyLabel(family));
  if (p.materialType) out.add(p.materialType);
  if (p.dimensions.length > 0) {
    out.add("özelleştirilebilir");
    out.add("ölçüye özel üretim");
  }

  return [...out];
}
