// ==========================================
// PANEL MODÜLLERİ — ANLATI YERLEŞİMİ
//
// "Bir nesnenin üç hâli" bölümünde panelin üzerine
// sırayla yerleşen modüller. Her kaydın konumu panel
// görselinin yüzdesi cinsindendir; scroll ilerlemesi
// enterAt → settleAt aralığında modülü yerine oturtur.
//
// image alanı doldurulduğunda modül gerçek bir şeffaf
// ürün görseli olarak çizilir. Boşken yerine ince bir
// etiket işareti konur — katalogda karşılığı olmayan
// bir ürünün sahte fotoğrafını üretmek yerine.
//
// Yeni bir şeffaf PNG/WebP hazır olduğunda yalnızca
// buraya image yolu yazmak yeterlidir; bileşen değişmez.
// ==========================================

export interface StoryModule {
  id: string;
  label: string;
  /** Şeffaf zeminli ürün görseli (PNG/WebP). Yoksa etiket gösterilir. */
  image: string | null;
  /** Panel görselinin yüzdesi cinsinden hedef konum */
  x: number;
  y: number;
  /** Görselin panel genişliğine oranı (yalnızca image varsa) */
  widthPercent: number;
  /** Bu ilerlemede belirmeye başlar */
  enterAt: number;
  /** Bu ilerlemede yerine oturmuş olur */
  settleAt: number;
  /** Katalogdaki karşılığı — varsa ürüne bağlanır */
  slug?: string;
}

export const STORY_MODULES: StoryModule[] = [
  {
    id: "phone-stand",
    label: "Telefon standı",
    image: null,
    x: 30,
    y: 34,
    widthPercent: 16,
    enterAt: 0.34,
    settleAt: 0.46,
  },
  {
    id: "tablet-stand",
    label: "Tablet standı",
    image: null,
    x: 62,
    y: 44,
    widthPercent: 22,
    enterAt: 0.46,
    settleAt: 0.58,
    slug: "tablet-standi",
  },
  {
    id: "airpods-holder",
    label: "AirPods tutucu",
    image: null,
    x: 42,
    y: 66,
    widthPercent: 12,
    enterAt: 0.58,
    settleAt: 0.7,
  },
];
