// ==========================================
// FOTOĞRAFTAN ÜRÜN — VERİ TİPLERİ
//
// Akışın her adımı burada tanımlı tiplerle konuşur.
// Sağlayıcılar (analiz, model üretimi) değişse bile bu
// sözleşme sabit kalır; arayüz yeniden yazılmaz.
// ==========================================

/** Fotoğrafın kullanıma uygunluğuyla ilgili uyarılar */
export type PhotoIssueCode =
  | "too-dark"
  | "low-contrast"
  | "object-too-small"
  | "multiple-objects"
  | "cropped";

export interface PhotoIssue {
  code: PhotoIssueCode;
  /** Kullanıcıya gösterilecek sade metin — teknik terim içermez */
  message: string;
  /** true ise akış durur, false ise yalnızca uyarıdır */
  blocking: boolean;
}

/**
 * Fotoğraftan çıkarılan biçim bilgisi.
 *
 * `profile`, objenin tabandan tepeye her seviyedeki yarı
 * genişliği (0–1 arası, en geniş yere göre normalize). Model
 * üretimi bu profilden beslenir.
 */
export interface PhotoAnalysis {
  /** Objenin en/boy oranı (genişlik ÷ yükseklik) */
  aspectRatio: number;
  /** Tabandan tepeye yarı genişlikler */
  profile: number[];
  /** Objenin dış hattı (normalize, 0–1) — dönme simetrisi yoksa kullanılır */
  outline: Array<[number, number]>;
  /** 0–1: 1'e yakınsa obje kendi ekseninde simetrik */
  symmetry: number;
  /** Objenin baskın rengi (#rrggbb) */
  color: string;
  issues: PhotoIssue[];
  /** Önizleme için kırpılmış kare */
  previewDataUrl: string;
}

/**
 * Modelin nasıl kurulduğu.
 * revolve: kendi ekseninde döndürülmüş profil (vazo, biblo, kase)
 * extrude: dış hattın kalınlaştırılması (pano, tabela, düz objeler)
 */
export type ShapeKind = "revolve" | "extrude";

/**
 * Kullanıcının değiştirebildiği tek bir ölçü.
 *
 * min/max/value her zaman MİLİMETRE cinsindendir; `unit`
 * yalnızca ekranda hangi birimle gösterileceğini söyler.
 * Ürün ölçüleri "cm" ile gösterilir, duvar kalınlığı gibi
 * nozzle ölçeğindekiler "mm" kalır — 0,24 cm kimseye bir şey
 * anlatmıyor.
 */
export interface ModelParameter {
  id: string;
  label: string;
  /** Kullanıcıya gösterilen açıklama — boş bırakılabilir */
  hint?: string;
  unit: "mm" | "cm" | "%";
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
}

export interface ModelDimensions {
  widthMm: number;
  depthMm: number;
  heightMm: number;
}

/**
 * Üretilen model. Geometri burada tutulmaz — parametrelerden
 * her seferinde yeniden kurulur, böylece bir ölçü değişince
 * model gerçekten yeniden şekillenir.
 */
export interface GeneratedModel {
  kind: ShapeKind;
  profile: number[];
  outline: Array<[number, number]>;
  parameters: ModelParameter[];
  dimensions: ModelDimensions;
  color: string;
  /** Ölçüler fotoğraftan tahmin edildi mi, kullanıcı mı girdi */
  dimensionsConfirmed: boolean;
}

/** Üretilebilirlik sonucu — kullanıcıya teknik rapor gösterilmez */
export type ManufacturabilityLevel = "ok" | "adjustable" | "unsuitable";

export interface ManufacturabilityResult {
  level: ManufacturabilityLevel;
  title: string;
  detail: string | null;
}

/** Analiz sırasında gösterilen adımlar */
export type PipelineStepId =
  | "analyze"
  | "shape"
  | "build"
  | "process"
  | "check";

export interface PipelineStep {
  id: PipelineStepId;
  label: string;
}

export const PIPELINE_STEPS: PipelineStep[] = [
  { id: "analyze", label: "Fotoğraf inceleniyor" },
  { id: "shape", label: "Objenin formu çıkarılıyor" },
  { id: "build", label: "3D model oluşturuluyor" },
  { id: "process", label: "Model işleniyor" },
  { id: "check", label: "Üretilebilirlik kontrol ediliyor" },
];

/**
 * Kaydedilen ürün. Veritabanı tarafı henüz yokken bile bu
 * yapı sabit kalır; "Modellerim" ve ileride AI Home Designer
 * aynı kaydı okur.
 */
export interface GeneratedProductRecord {
  id: string;
  name: string;
  sourceImage: string;
  previewImage: string;
  kind: ShapeKind;
  profile: number[];
  outline: Array<[number, number]>;
  parameters: ModelParameter[];
  dimensions: ModelDimensions;
  materialId: string;
  colorId: string;
  estimatedWeightGrams: number;
  estimatedPrintMinutes: number;
  priceGross: number;
  createdAt: string;
}
