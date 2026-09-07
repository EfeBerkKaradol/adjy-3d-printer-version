// ==========================================
// "BİR NESNENİN ÜÇ HÂLİ" — ZAMAN ÇİZELGESİ
//
// Bölüm, önceden render edilmiş tek bir ürün animasyonunu
// scroll ile sürer (scrub). Animasyon kendiliğinden oynamaz;
// karesi doğrudan kullanıcının kaydırma konumundan gelir.
//
// Görsel varlık buraya yazılır. Dosya yolları boşken bölüm
// ürünün gerçek fotoğrafına düşer — katalogda karşılığı
// olmayan bir sahne uydurulmaz.
// ==========================================

export interface StoryVideoSources {
  /** Masaüstü sürümü — daha yüksek çözünürlük */
  desktop: string | null;
  /** Mobil sürümü — daha küçük dosya; yoksa masaüstü kullanılır */
  mobile: string | null;
}

/**
 * Sahnenin kendisi: delikli duvar paneline yavaşça
 * yaklaşan 8 saniyelik sinematik ürün çekimi. Kaynağı
 * ürünün kendi fotoğrafı, yani gösterilen nesne gerçekten
 * satılan nesne — uydurma bir sahne değil.
 *
 * Yenisi geldiğinde public/media/ altındaki dosya
 * değiştirilir; bileşende hiçbir şey değişmez.
 *
 * ÖNEMLİ: Scroll ile kare kare sürülebilmesi için dosyanın
 * sık anahtar kareli (keyframe) kodlanması gerekir —
 * ffmpeg ile: -g 12 -keyint_min 12 -sc_threshold 0
 * Seyrek anahtar kareli bir mp4 hızlı kaydırmada takılır.
 */
export const STORY_VIDEO: StoryVideoSources = {
  desktop: "/media/panel-story-desktop.mp4",
  mobile: "/media/panel-story-mobile.mp4",
};

/** Render'ın en-boy oranı — çerçeve buna göre kurulur */
export const STORY_ASPECT = "4 / 5";

export interface StoryAct {
  n: string;
  title: string;
  body: string;
  cta: { label: string; href: string };
  /** Bu ilerlemeden itibaren bu perde okunur */
  from: number;
}

export const STORY_ACTS: StoryAct[] = [
  {
    n: "01",
    title: "Keşfet",
    body: "Dijital olarak tasarlanmış nesnelere göz at.",
    cta: { label: "Nesneleri gör", href: "/products" },
    from: 0,
  },
  {
    n: "02",
    title: "Yapılandır",
    body: "Ölçünü seç. Modüllerini belirle. Kendi sistemini kur.",
    cta: { label: "Yapılandır", href: "/configure" },
    from: 0.22,
  },
  {
    n: "03",
    title: "Üret",
    body: "Sen seç. ADJY üretsin.",
    cta: { label: "Üret", href: "/3d-baski-fiyati-hesapla" },
    from: 0.76,
  },
];

/** Verilen ilerlemede okunacak perdenin sırası */
export function actIndexFor(progress: number): number {
  let index = 0;
  for (let i = 0; i < STORY_ACTS.length; i += 1) {
    if (progress >= STORY_ACTS[i].from) index = i;
  }
  return index;
}

// ------------------------------------------------------------------
// İLERLEME → ANİMASYON ZAMANI
//
// Bağ doğrusal değil: açılış biraz ağır ilerler (ürünü
// tanıma anı), modüller takılırken hızlanır, kapanışta
// tam süreye oturur. Değerler sürenin oranı cinsinden,
// böylece animasyonun kaç saniye olduğu önemsiz.
// ------------------------------------------------------------------
const CURVE: ReadonlyArray<readonly [progress: number, timeFraction: number]> = [
  [0.0, 0.0],
  [0.15, 0.125],
  [0.3, 0.25],
  [0.5, 0.4375],
  [0.7, 0.625],
  [1.0, 1.0],
];

/** 0–1 arası ilerlemeyi 0–1 arası animasyon zamanına çevirir */
export function progressToTimeFraction(progress: number): number {
  const p = progress <= 0 ? 0 : progress >= 1 ? 1 : progress;

  for (let i = 1; i < CURVE.length; i += 1) {
    const [p1, t1] = CURVE[i];
    if (p <= p1) {
      const [p0, t0] = CURVE[i - 1];
      const span = p1 - p0;
      const ratio = span === 0 ? 0 : (p - p0) / span;
      return t0 + (t1 - t0) * ratio;
    }
  }
  return 1;
}
