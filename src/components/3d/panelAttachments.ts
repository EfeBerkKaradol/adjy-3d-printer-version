// ==========================================
// DELİKLİ PANEL EKLENTİLERİ
//
// Delikli duvar paneline takılabilen ürünlerin kaydı.
// Yeni bir eklenti STL'i hazır olduğunda GLB'ye çevrilip
// Cloudinary'ye yüklenir ve buraya bir kayıt eklenir —
// customize sayfasındaki checkbox listesi ve 3D yerleşim
// otomatik olarak bu listeden beslenir.
//
// Konumlandırma: xFrac/yFrac panel merkezine göre, panel
// genişlik/yüksekliğinin oranı cinsindendir (-0.5 .. 0.5).
// Referans yerleşim, ürün görselindeki dizilime göredir.
// ==========================================

export interface PanelAttachmentDef {
  /** Ürün slug'ı ile aynı — siparişte hangi eklentinin istendiğini belirtir */
  id: string;
  /** Checkbox etiketinde gösterilen ad */
  label: string;
  /** Draco sıkıştırmalı GLB dosyası */
  url: string;
  /** Panel merkezinden yatay ofset (panel genişliği oranı, -0.5..0.5) */
  xFrac: number;
  /** Panel merkezinden dikey ofset (panel yüksekliği oranı, -0.5..0.5) */
  yFrac: number;
  /** Eklentinin gerçek yüksekliği (mm) — panel 300mm referansına göre ölçeklenir */
  heightMm: number;
  /** Dikey eksende ek dönüş (radyan) — modelin yüzü panelden dışarı baksın diye */
  rotationY?: number;
}

/** Panelin varsayılan (baz) yüksekliği — mm/sahne birimi dönüşümünde referans */
export const PANEL_BASE_HEIGHT_MM = 300;

export const PANEL_ATTACHMENTS: PanelAttachmentDef[] = [
  {
    id: "tablet-standi",
    label: "Tablet Standı",
    url: "https://res.cloudinary.com/ds0unvnrs/raw/upload/v1783264653/products/models/tablet-standi.glb",
    // Görseldeki telefon/tablet tutucu konumu: sağ üst bölge
    xFrac: 0.2,
    yFrac: 0.16,
    heightMm: 190,
    rotationY: 0,
  },
];
