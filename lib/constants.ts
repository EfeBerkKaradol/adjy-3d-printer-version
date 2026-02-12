export const SITE_NAME = "ADJY 3D";
export const SITE_DESCRIPTION =
  "Hayallerinizi 3D olarak uretiyoruz. Kisisellestirilmis 3D baski hizmetleri, AR onizleme ve hizli teslimat.";

export const NAV_LINKS = [
  { href: "/", label: "Ana Sayfa" },
  { href: "/urunler", label: "Urunler" },
  { href: "/hakkimizda", label: "Hakkimizda" },
  { href: "/iletisim", label: "Iletisim" },
] as const;

export const CATEGORIES = [
  { slug: "3d-yazicilar", label: "3D Yazicilar", count: 12 },
  { slug: "filamentler", label: "Filamentler", count: 28 },
  { slug: "aksesuarlar", label: "Aksesuarlar", count: 15 },
  { slug: "parcalar", label: "Yedek Parcalar", count: 22 },
  { slug: "kisiye-ozel", label: "Kisiye Ozel Uretim", count: 8 },
] as const;

export const ORDER_STATUSES = {
  pending: { label: "Beklemede", color: "bg-yellow-500/20 text-yellow-400" },
  processing: { label: "Hazirlaniyor", color: "bg-blue-500/20 text-blue-400" },
  printing: { label: "Basiliyor", color: "bg-purple-500/20 text-purple-400" },
  shipped: { label: "Kargoda", color: "bg-orange-500/20 text-orange-400" },
  delivered: {
    label: "Teslim Edildi",
    color: "bg-green-500/20 text-green-400",
  },
  cancelled: { label: "Iptal Edildi", color: "bg-red-500/20 text-red-400" },
} as const;

export const MATERIALS = [
  "PLA",
  "ABS",
  "PETG",
  "TPU",
  "Naylon",
  "Resin",
] as const;
