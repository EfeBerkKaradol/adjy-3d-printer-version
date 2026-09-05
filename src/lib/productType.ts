// ==========================================
// ÜRÜN TİPİ EŞLEMESİ
// Slug'dan parametrik model tipine çevirir.
// Bu eşleme daha önce hem konfigüratör sayfasında hem
// de AR butonunda birebir kopyalanmıştı; tek kaynağa
// alındı ki yeni bir ürün tipi eklendiğinde iki yerde
// birden güncellemek gerekmesin.
// ==========================================

export function getProductType(slug: string): string {
  if (slug.includes("eriyen")) return "meltingShelf";
  if (slug.includes("kup") || slug.includes("cubic") || slug.includes("hex"))
    return "hexShelf";
  if (slug.includes("skadis")) return "skadisPanel";
  if (slug.includes("kose-rafi") || slug.includes("kose_rafi")) return "cornerShelf";
  if (slug.includes("depolama-kutusu") || slug.includes("storage-basket"))
    return "storageBasket";
  if (slug.includes("rafa-raf") || slug.includes("shelf-for-shelf"))
    return "shelfForShelf";
  if (slug.includes("kase") || slug.includes("bowl")) return "ribbedBowl";
  if (
    slug.includes("dekoratif-depolama") ||
    slug.includes("tabagi") ||
    slug.includes("tabak")
  )
    return "decorativeStorage";
  // "tablet" kontrolü "stand"den önce gelmeli
  if (slug.includes("tablet")) return "tabletStand";
  if (slug.includes("delikli") || slug.includes("panel")) return "perforatedPanel";
  if (slug.includes("vazo")) return "vase";
  if (slug.includes("stand") || slug.includes("telefon")) return "stand";
  if (slug.includes("anahtarlik")) return "keychain";
  if (slug.includes("lamba") || slug.includes("lamp")) return "lamp";
  if (slug.includes("kalem") || slug.includes("pencil")) return "pencilHolder";
  if (slug.includes("bileklik") || slug.includes("bracelet")) return "bracelet";
  if (slug.includes("disli") || slug.includes("gear")) return "gear";
  if (slug.includes("ejderha") || slug.includes("figur")) return "figure";
  if (slug.includes("fazil")) return "fazilModel";
  return "vase";
}
