export interface Product {
  id: string;
  slug: string;
  name: string;
  description: string;
  shortDescription: string;
  price: number;
  originalPrice?: number;
  category: string;
  material: string;
  images: string[];
  has3DModel: boolean;
  hasAR: boolean;
  rating: number;
  reviewCount: number;
  inStock: boolean;
  printTime: string;
  dimensions: { width: number; height: number; depth: number };
  tags: string[];
}

export interface Order {
  id: string;
  orderNumber: string;
  date: string;
  status: "pending" | "processing" | "printing" | "shipped" | "delivered" | "cancelled";
  items: { product: Product; quantity: number; customization?: string }[];
  total: number;
  shippingAddress: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar?: string;
  joinDate: string;
  totalOrders: number;
  totalSpent: number;
}

export const mockProducts: Product[] = [
  {
    id: "1",
    slug: "ender-3-v3-se",
    name: "Creality Ender-3 V3 SE",
    description:
      "Creality Ender-3 V3 SE, otomatik yatak seviyeleme ve CR Touch sensoru ile kolay baski deneyimi sunar. 220x220x250mm baski alanina sahip bu yazici, hem yeni baslayanlara hem de deneyimli kullanicilara hitap eder.",
    shortDescription: "Otomatik seviyeleme, CR Touch sensoru, 220x220x250mm",
    price: 8499,
    originalPrice: 9999,
    category: "3d-yazicilar",
    material: "PLA/ABS/PETG",
    images: ["/images/products/ender3.jpg"],
    has3DModel: true,
    hasAR: true,
    rating: 4.7,
    reviewCount: 234,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 220, height: 250, depth: 220 },
    tags: ["baslangic", "populer", "otomaik-seviyeleme"],
  },
  {
    id: "2",
    slug: "bambu-lab-p1s",
    name: "Bambu Lab P1S Combo",
    description:
      "Bambu Lab P1S, yuksek hizli ve cok malzemeli baski kapasitesiyle profesyonel sonuclar uretir. AMS (Automatic Material System) ile 4 farkli filamenti otomatik olarak degistirebilir.",
    shortDescription: "Yuksek hiz, AMS uyumlu, kapali kasa",
    price: 24999,
    originalPrice: 27999,
    category: "3d-yazicilar",
    material: "PLA/ABS/PETG/TPU/PA",
    images: ["/images/products/bambu-p1s.jpg"],
    has3DModel: true,
    hasAR: true,
    rating: 4.9,
    reviewCount: 567,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 256, height: 256, depth: 256 },
    tags: ["profesyonel", "cok-satilan", "yuksek-hiz"],
  },
  {
    id: "3",
    slug: "anycubic-kobra-3",
    name: "Anycubic Kobra 3 Combo",
    description:
      "Anycubic Kobra 3, cok renkli baski destegiyle yaraticiliginizi sinirsiz kilar. ACE Pro sistemiyle 4 farkli renk ve malzeme ile ayni anda baski yapabilirsiniz.",
    shortDescription: "Cok renkli baski, ACE Pro, 250x250x260mm",
    price: 18999,
    category: "3d-yazicilar",
    material: "PLA/PETG/TPU",
    images: ["/images/products/kobra3.jpg"],
    has3DModel: true,
    hasAR: false,
    rating: 4.5,
    reviewCount: 189,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 250, height: 260, depth: 250 },
    tags: ["cok-renkli", "yeni"],
  },
  {
    id: "4",
    slug: "esun-pla-plus",
    name: "eSUN PLA+ Filament 1.75mm",
    description:
      "eSUN PLA+ yuksek mukavemet ve dusuk carpilma oranina sahip premium filament. 1kg bobinde gelir, tum 1.75mm yazicilarla uyumludur.",
    shortDescription: "1.75mm, 1kg, yuksek mukavemet",
    price: 449,
    originalPrice: 549,
    category: "filamentler",
    material: "PLA+",
    images: ["/images/products/esun-pla.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.6,
    reviewCount: 1023,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 200, height: 80, depth: 200 },
    tags: ["filament", "populer", "pla"],
  },
  {
    id: "5",
    slug: "hatchbox-abs",
    name: "Hatchbox ABS Filament 1.75mm",
    description:
      "Hatchbox ABS, mekanik parcalar ve fonksiyonel prototipler icin ideal. Yuksek sicaklik dayanimi ve darbe mukavemeti sunar.",
    shortDescription: "1.75mm, 1kg, yuksek sicaklik dayanimi",
    price: 529,
    category: "filamentler",
    material: "ABS",
    images: ["/images/products/hatchbox-abs.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.4,
    reviewCount: 456,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 200, height: 80, depth: 200 },
    tags: ["filament", "abs", "dayanikli"],
  },
  {
    id: "6",
    slug: "overture-petg",
    name: "Overture PETG Filament 1.75mm",
    description:
      "Overture PETG, su ve kimyasal dayanikliligi ile dis mekan uygulamalari icin mukemmeldir. Seffaf ve parlak yuzey kalitesi sunar.",
    shortDescription: "1.75mm, 1kg, dis mekan uyumlu",
    price: 489,
    category: "filamentler",
    material: "PETG",
    images: ["/images/products/overture-petg.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.3,
    reviewCount: 312,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 200, height: 80, depth: 200 },
    tags: ["filament", "petg", "dis-mekan"],
  },
  {
    id: "7",
    slug: "capricorn-ptfe",
    name: "Capricorn PTFE Bowden Tube",
    description:
      "Capricorn premium PTFE tube, dusturuk surtunsme ve yuksek sicaklik dayanimi ile baski kalitenizi arttirir. Tum 1.75mm yazicilarla uyumludur.",
    shortDescription: "Premium PTFE, 1m, 1.75mm uyumlu",
    price: 189,
    category: "aksesuarlar",
    material: "PTFE",
    images: ["/images/products/capricorn.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.8,
    reviewCount: 892,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 4, height: 1000, depth: 4 },
    tags: ["aksesuar", "ptfe", "kalite"],
  },
  {
    id: "8",
    slug: "baski-yuzey-pei",
    name: "PEI Manyetik Baski Yuzey",
    description:
      "Cift tarafli PEI manyetik baski yuzey, mukemmel yapiskma ve kolay cikarma ozelligi sunar. 235x235mm boyutuyla Ender-3 serisine uyumludur.",
    shortDescription: "235x235mm, cift taraf, manyetik",
    price: 349,
    originalPrice: 449,
    category: "aksesuarlar",
    material: "PEI",
    images: ["/images/products/pei-sheet.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.7,
    reviewCount: 567,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 235, height: 1, depth: 235 },
    tags: ["aksesuar", "baski-yuzey", "populer"],
  },
  {
    id: "9",
    slug: "nozzle-seti-mk8",
    name: "MK8 Pirinc Nozzle Seti (10'lu)",
    description:
      "0.2mm, 0.3mm, 0.4mm, 0.5mm, 0.6mm, 0.8mm ve 1.0mm boyutlarinda 10 adet pirinc nozzle. Ender-3, CR-10 ve diger MK8 uyumlu yazicilarla calasir.",
    shortDescription: "10 adet, 7 farkli boyut, MK8 uyumlu",
    price: 129,
    category: "parcalar",
    material: "Pirinc",
    images: ["/images/products/nozzle-set.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.5,
    reviewCount: 1234,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 10, height: 13, depth: 10 },
    tags: ["yedek-parca", "nozzle", "cok-satilan"],
  },
  {
    id: "10",
    slug: "kisiye-ozel-figur",
    name: "Kisiye Ozel 3D Figur",
    description:
      "Fotografinizdan hareketle olusturulan kisiye ozel 3D baski figur. Yuksek detay cozunurlugu ve resin baski teknolojisi kullanilir. Hediye icin mukemmel bir secim.",
    shortDescription: "Kisiye ozel, resin baski, yuksek detay",
    price: 1299,
    category: "kisiye-ozel",
    material: "Resin",
    images: ["/images/products/custom-figure.jpg"],
    has3DModel: true,
    hasAR: true,
    rating: 4.9,
    reviewCount: 89,
    inStock: true,
    printTime: "3-5 is gunu",
    dimensions: { width: 50, height: 120, depth: 50 },
    tags: ["kisiye-ozel", "hediye", "premium"],
  },
  {
    id: "11",
    slug: "voron-hotend-kit",
    name: "Voron Yuksek Sicaklik Hotend Kit",
    description:
      "Voron yazicilar icin tasarlanmis yuksek sicaklik hotend kiti. 300C'ye kadar dayanikli, bi-metal heat break ve titanium nozzle dahil.",
    shortDescription: "300C dayanim, bi-metal, Voron uyumlu",
    price: 899,
    category: "parcalar",
    material: "Titanium/Celik",
    images: ["/images/products/voron-hotend.jpg"],
    has3DModel: false,
    hasAR: false,
    rating: 4.6,
    reviewCount: 145,
    inStock: false,
    printTime: "N/A",
    dimensions: { width: 30, height: 60, depth: 30 },
    tags: ["yedek-parca", "voron", "profesyonel"],
  },
  {
    id: "12",
    slug: "elegoo-saturn-4",
    name: "Elegoo Saturn 4 Ultra",
    description:
      "Elegoo Saturn 4 Ultra, 12K cozunurlugu ve buyuk baski alaniya resin baski dunyasinin zirvesini temsil eder. Dental, muhendislik ve minyatur baskilar icin idealdir.",
    shortDescription: "12K cozunurluk, 218x123x260mm, resin",
    price: 32999,
    category: "3d-yazicilar",
    material: "Resin",
    images: ["/images/products/saturn4.jpg"],
    has3DModel: true,
    hasAR: true,
    rating: 4.8,
    reviewCount: 234,
    inStock: true,
    printTime: "N/A",
    dimensions: { width: 218, height: 260, depth: 123 },
    tags: ["resin", "profesyonel", "yuksek-cozunurluk"],
  },
];

export const mockOrders: Order[] = [
  {
    id: "1",
    orderNumber: "ORD-2026-001",
    date: "2026-02-10",
    status: "delivered",
    items: [
      { product: mockProducts[0], quantity: 1 },
      { product: mockProducts[3], quantity: 3 },
    ],
    total: 9846,
    shippingAddress: "Kadikoy, Istanbul",
  },
  {
    id: "2",
    orderNumber: "ORD-2026-002",
    date: "2026-02-08",
    status: "printing",
    items: [{ product: mockProducts[9], quantity: 2, customization: "Ozel figur - 15cm" }],
    total: 2598,
    shippingAddress: "Besiktas, Istanbul",
  },
  {
    id: "3",
    orderNumber: "ORD-2026-003",
    date: "2026-02-05",
    status: "shipped",
    items: [
      { product: mockProducts[1], quantity: 1 },
      { product: mockProducts[7], quantity: 1 },
    ],
    total: 25348,
    shippingAddress: "Cankaya, Ankara",
  },
  {
    id: "4",
    orderNumber: "ORD-2026-004",
    date: "2026-01-28",
    status: "processing",
    items: [
      { product: mockProducts[4], quantity: 5 },
      { product: mockProducts[6], quantity: 2 },
    ],
    total: 3023,
    shippingAddress: "Bornova, Izmir",
  },
  {
    id: "5",
    orderNumber: "ORD-2026-005",
    date: "2026-01-15",
    status: "cancelled",
    items: [{ product: mockProducts[10], quantity: 1 }],
    total: 899,
    shippingAddress: "Nilüfer, Bursa",
  },
];

export const mockUser: User = {
  id: "1",
  name: "Efe Berk Karadol",
  email: "efe@adjy.com.tr",
  joinDate: "2025-06-15",
  totalOrders: 12,
  totalSpent: 45890,
};

export const dashboardStats = {
  dailySales: 12450,
  newOrders: 8,
  activeProducts: 156,
  visitors: 2341,
  monthlySales: [
    { month: "Oca", sales: 45000 },
    { month: "Sub", sales: 52000 },
    { month: "Mar", sales: 48000 },
    { month: "Nis", sales: 61000 },
    { month: "May", sales: 55000 },
    { month: "Haz", sales: 67000 },
    { month: "Tem", sales: 72000 },
    { month: "Agu", sales: 69000 },
    { month: "Eyl", sales: 81000 },
    { month: "Eki", sales: 76000 },
    { month: "Kas", sales: 89000 },
    { month: "Ara", sales: 95000 },
  ],
  categorySales: [
    { category: "3D Yazicilar", value: 45 },
    { category: "Filamentler", value: 25 },
    { category: "Aksesuarlar", value: 15 },
    { category: "Yedek Parcalar", value: 10 },
    { category: "Kisiye Ozel", value: 5 },
  ],
};
