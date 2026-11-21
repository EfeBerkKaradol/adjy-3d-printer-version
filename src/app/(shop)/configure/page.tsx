import { redirect } from "next/navigation";

// ==========================================
// /configure → Kendin Üret
//
// Hazır ürünlerin ölçüsü artık ayarlanmıyor; ayarlanabilir
// ürünler Kendin Üret araçları. Eski bağlantılar, yer imleri ve
// arama sonuçları hata sayfası yerine oraya düşer.
// ==========================================

export default function ConfigureRedirect() {
  redirect("/tasarla");
}
