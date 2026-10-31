// ==========================================
// MOBİLYA — ORTAK TİPLER
//
// ADJY'nin kuruluş fikri değişken ölçüydü: müşteri tasarımcıya
// gitmeden kendi ölçüsünde mobilya ısmarlasın. Baskı tarafında
// bunu kaydırıcıyla çözdük çünkü orada tek bir gövde var.
// Mobilyada ise gövdenin kendisi değişiyor — sütun eklenince
// yeni bir dikey panel doğuyor, raf sayısı değişince kesim
// listesi baştan yazılıyor.
//
// Bu yüzden mobilya ürünü bir "model dosyası + kaydırıcı"
// değil, bir ÜRETEÇ. Yapılandırma buradaki tiplerle anlatılır,
// panels.ts onu panel listesine çevirir, pricing.ts o listeden
// fiyat çıkarır, 3D de aynı listeyi çizer.
//
// Tek liste, üç tüketici: ekranda gördüğünüz raf ile atölyeye
// giden kesim listesi aynı kaynaktan doğduğu için birbirinden
// sapamaz.
// ==========================================

/** Bir gözün içinde ne var */
export type GozIcerigi = "bos" | "kapak" | "cekmece";

/** Göz anahtarı: "sutun-sira", sıfırdan başlar ("0-2" = ilk sütun, üçüncü sıra) */
export type GozAnahtari = string;

export interface MobilyaYapilandirma {
  modelId: string;
  /** Dış ölçüler — mm, taban dâhil toplam */
  genislik: number;
  yukseklik: number;
  derinlik: number;
  sutun: number;
  sira: number;
  /** Yalnızca varsayılandan farklı gözler yazılır; gerisi "bos" */
  gozler: Record<GozAnahtari, GozIcerigi>;
  govdeMalzeme: string;
  onMalzeme: string;
  taban: string;
  kulp: string;
  arkaPanel: boolean;
}

/**
 * Tek bir panel. Eksen hizalı bir kutu olduğu için hem
 * <boxGeometry> ile çizilebiliyor hem de alanı/çevresi
 * doğrudan toplanabiliyor.
 *
 * Konum: birimin taban merkezinden mm. x sağa, y yukarı,
 * z öne artar.
 */
export interface Panel {
  id: string;
  rol: PanelRol;
  x: number;
  y: number;
  z: number;
  /** Yerleştirildiği hâldeki ölçüler (mm) */
  w: number;
  h: number;
  d: number;
  kalinlik: number;
  malzemeRolu: "govde" | "on" | "arka";
  /** Bantlanacak kenar uzunluğu (mm) */
  bantliKenar: number;
  /** Kesim çevresi (mm) */
  kesimCevre: number;
  /** Çekmece kutusunun yanları gibi gizli parçalar çizilmez ama fiyata girer */
  gorunur: boolean;
  /** Varsa ait olduğu göz — tıklamayla seçim için */
  goz?: GozAnahtari;
}

export type PanelRol =
  | "yan"
  | "ust"
  | "alt"
  | "dikey"
  | "raf"
  | "arka"
  | "kapak"
  | "cekmece-on"
  | "cekmece-govde"
  | "baza";

/** Donanım kalemi — fiyat dökümünde satır olarak görünür */
export interface DonanimKalemi {
  ad: string;
  adet: number;
  birimFiyat: number;
}
