// ==========================================
// HİZMET ŞERİDİ
//
// Tanımadığı bir mağazada insanın ilk sorduğu şeyler: kargo ne
// kadar, beğenmezsem ne olur, ödeme güvenli mi. Bunlar altbilgide
// duruyordu — yani kimsenin bakmadığı yerde.
//
// Şerit sürekli akar ve kapanmaz. Dönen bir vitrinden farkı:
// maddeler sırayla ve kesintisiz geçtiği için hiçbiri
// "görülmeyen slayt" olmuyor; dar ekranda da hepsi okunabiliyor.
//
// Akış süreklilik için iki kez yazılır: ilk kopya ekranın
// solundan çıkarken ikincisi sağdan girer, dönüş noktasında
// boşluk oluşmaz.
//
// Hareketi azaltılmış cihazlarda akış durur, maddeler sabit
// durur — hareket bir bilgiyi gizlememeli.
// ==========================================

const MADDELER = [
  "%100 yerli üretim",
  "Özel ölçüde üretim",
  "Perakende ve toptan sipariş",
  "14 gün içinde cayma hakkı",
  "3D Secure ile güvenli ödeme",
  "Kırılabilir ürünlerde özel paketleme",
];

function Seri({ gizli }: { gizli?: boolean }) {
  return (
    <div className="adjy-serit-seri" aria-hidden={gizli}>
      {MADDELER.map((m) => (
        <span key={m} className="adjy-serit-madde">
          {m}
          <span className="adjy-serit-ayrac" aria-hidden>
            ·
          </span>
        </span>
      ))}
    </div>
  );
}

export function AnnouncementBar() {
  return (
    // overflow-hidden şart: şerit "max-content" genişlikte, kesilmezse
    // bütün sayfa yatay kayıyor.
    <div className="overflow-hidden border-b border-border/60 bg-foreground text-background">
      <div className="adjy-serit" role="complementary" aria-label="Mağaza bilgileri">
        {/* İkinci kopya yalnızca görsel süreklilik için; ekran
            okuyucu maddeleri bir kez okur. */}
        <Seri />
        <Seri gizli />
      </div>
    </div>
  );
}
