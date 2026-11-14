// Yönetim panelindeki adresler. Ayrı bir dosyada durur ki istemci
// bileşenleri de içe aktarabilsin (bildirim.ts veritabanına bağlı).

/** Sipariş kaleminin üretim ekranı */
export function uretimEkraniAdresi(orderId: string, itemId: string): string {
  return `/admin/uretim/${orderId}/${itemId}`;
}
