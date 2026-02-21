// ==========================================
// KARGO HESAPLAMA
//
// Basit kargo ücreti hesaplayıcı.
// İleride kargo firması entegrasyonu eklenebilir.
// ==========================================

export interface ShippingOption {
  id: string;
  name: string;
  description: string;
  price: number;
  estimatedDays: string; // "2-4 iş günü"
}

// Kargo seçenekleri
const SHIPPING_OPTIONS: ShippingOption[] = [
  {
    id: "standard",
    name: "Standart Kargo",
    description: "Yurtiçi Kargo ile gönderim",
    price: 49.99,
    estimatedDays: "3-5 iş günü",
  },
  {
    id: "express",
    name: "Hızlı Kargo",
    description: "Aras Kargo hızlı gönderim",
    price: 79.99,
    estimatedDays: "1-2 iş günü",
  },
  {
    id: "free",
    name: "Ücretsiz Kargo",
    description: "500 TL üzeri siparişlerde ücretsiz",
    price: 0,
    estimatedDays: "3-5 iş günü",
  },
];

// Ücretsiz kargo limiti
const FREE_SHIPPING_THRESHOLD = 500;

/**
 * Sipariş tutarına göre mevcut kargo seçeneklerini döndürür.
 */
export function getShippingOptions(orderTotal: number): ShippingOption[] {
  // 500 TL üzerinde ücretsiz kargo seçeneği aktif
  if (orderTotal >= FREE_SHIPPING_THRESHOLD) {
    return SHIPPING_OPTIONS;
  }

  // 500 TL altında ücretsiz kargo gizlenir
  return SHIPPING_OPTIONS.filter((opt) => opt.id !== "free");
}

/**
 * Belirli bir kargo seçeneğinin fiyatını döndürür.
 */
export function getShippingPrice(
  shippingId: string,
  orderTotal: number
): number {
  const option = SHIPPING_OPTIONS.find((opt) => opt.id === shippingId);
  if (!option) return SHIPPING_OPTIONS[0].price; // varsayılan standart

  // Ücretsiz kargo sadece 500 TL üzerinde
  if (option.id === "free" && orderTotal < FREE_SHIPPING_THRESHOLD) {
    return SHIPPING_OPTIONS[0].price;
  }

  return option.price;
}

/**
 * Varsayılan kargo seçeneğini döndürür.
 */
export function getDefaultShipping(orderTotal: number): ShippingOption {
  if (orderTotal >= FREE_SHIPPING_THRESHOLD) {
    return SHIPPING_OPTIONS.find((opt) => opt.id === "free")!;
  }
  return SHIPPING_OPTIONS[0];
}
