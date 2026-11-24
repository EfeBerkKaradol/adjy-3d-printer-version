// ==========================================
// BUZLU CAM AÇILIR MENÜ — ORTAK SINIFLAR
//
// Üst menüdeki dock açılır paneli ve mağazadaki Filtreler paneli
// ile aynı cam: sitedeki bütün açılır menüler (DropdownMenu,
// Select, küçük el yapımı menüler) bu sınıfları kullanır.
//
// .adjy-nav: piksel katmanı bu sınıfın içinde köşeleri yuvarlak
// bırakır (bkz. globals.css), böylece cam görünümü bozulmaz.
// ==========================================

/** Açılır panelin kendisi: buzlu cam zemin, yumuşak köşe */
export const GLASS_MENU =
  "adjy-nav adjy-glass adjy-glass-menu rounded-[18px] p-1.5 text-foreground";

/** Paneldeki tek satır: üzerine gelince / klavyeyle seçilince açık buz */
export const GLASS_MENU_ITEM =
  "rounded-[12px] px-2.5 py-1.5 text-sm text-foreground/85 outline-hidden transition-colors hover:bg-white/45 hover:text-foreground focus:bg-white/45 focus:text-foreground data-[highlighted]:bg-white/45 data-[highlighted]:text-foreground dark:hover:bg-white/[0.07] dark:focus:bg-white/[0.07] dark:data-[highlighted]:bg-white/[0.07]";

/** Seçili satır (ör. geçerli sıralama) */
export const GLASS_MENU_ITEM_ACTIVE = "bg-white/70 text-foreground dark:bg-white/[0.12]";

/** Grup başlığı: dock menüsündeki sütun başlıkları gibi */
export const GLASS_MENU_LABEL =
  "px-2.5 pb-1 pt-1.5 text-[11px] font-medium uppercase tracking-[0.14em] text-muted-foreground";

/** İnce ayraç */
export const GLASS_MENU_SEPARATOR = "-mx-1.5 my-1.5 h-px bg-foreground/[0.07] dark:bg-white/[0.07]";
