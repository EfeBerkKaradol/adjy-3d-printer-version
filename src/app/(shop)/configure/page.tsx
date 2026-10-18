import { redirect } from "next/navigation";

// ==========================================
// /configure → mağaza
//
// Ölçüsü değişen ürünleri ayrı listeleyen sayfa kaldırıldı:
// ölçü ayarı artık mağazadaki kartların altında duruyor.
//
// Adres yaşamaya devam ediyor çünkü eski bağlantılar,
// yer imleri ve arama sonuçları buraya geliyor — hata
// sayfası yerine ölçüsü değişen ürünlerin listesine düşer.
// ==========================================

export default function ConfigureRedirect() {
  redirect("/products?customizable=true");
}
