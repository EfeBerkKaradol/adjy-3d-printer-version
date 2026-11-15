import { revalidatePath, revalidateTag } from "next/cache";

// ==========================================
// MAĞAZA ÖNBELLEĞİ
//
// Ürün sayfaları ve mağazanın yavaş değişen listeleri (kategori
// ağacı, koleksiyonlar, malzemeler) beş dakikalığına saklanıyor:
// ziyaretçi her açışta aynı sorguları bekletmesin diye.
//
// Bedeli, yönetim panelindeki bir değişikliğin beş dakika
// görünmeme ihtimali. Onu kapatmak için ürün, parametre ve
// kategori yazan her yönetim ucu buradaki işlevi çağırır;
// değişiklik bir sonraki ziyarette görünür.
//
// Yalnızca sunucuda, istek sırasında (route handler / server
// action) çağrılır — sayfa çizilirken çağrılamaz.
// ==========================================

/** Kategori ağacı, koleksiyon etiketleri ve malzeme listesinin etiketi */
export const MAGAZA_LISTELERI_ETIKETI = "magaza-listeleri";

/** Saklanan listelerin en uzun ömrü (saniye) */
export const MAGAZA_LISTELERI_SURESI = 300;

export function magazaOnbelleginiTazele(): void {
  try {
    // Bütün ürün sayfaları: bir ürünün değişmesi başka ürünlerin
    // "aynı kategoriden" şeridini de etkiler.
    //
    // Yol, dosyanın app/ altındaki yeri — "(shop)" grubu dâhil.
    // Next sayfayı bu adla etiketliyor; grup yazılmazsa çağrı
    // hata vermeden hiçbir sayfayı düşürmez.
    revalidatePath("/(shop)/products/[slug]", "page");
    // expire: 0 → eski liste bir kez daha sunulmadan hemen düşer
    revalidateTag(MAGAZA_LISTELERI_ETIKETI, { expire: 0 });
  } catch (error) {
    // Kayıt zaten yazıldı; önbellek düşürülemedi diye yönetim
    // işlemi başarısız görünmesin. En geç beş dakikada tazelenir.
    console.error("Mağaza önbelleği tazelenemedi:", error);
  }
}
