import { YILBASI, yilbasiAktif } from "@/lib/yilbasi";
import { IsikZinciri } from "@/components/yilbasi/IsikZinciri";

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

// Yılbaşı döneminde şeridin başına sezon maddeleri eklenir ve
// şerit çam yeşiline döner (bkz. lib/yilbasi.ts).
const YILBASI_MADDELERI = [
  `Yılbaşına teslim için son sipariş: ${YILBASI.sonSiparisYazi}`,
  "Yılbaşı koleksiyonu atölyeden çıktı",
];

function Seri({ gizli, maddeler }: { gizli?: boolean; maddeler: string[] }) {
  return (
    <div className="adjy-serit-seri" aria-hidden={gizli}>
      {maddeler.map((m) => (
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
  const yilbasi = yilbasiAktif();
  const maddeler = yilbasi ? [...YILBASI_MADDELERI, ...MADDELER] : MADDELER;

  return (
    <>
      {/* overflow-hidden şart: şerit "max-content" genişlikte, kesilmezse
          bütün sayfa yatay kayıyor. */}
      <div
        className={
          yilbasi
            ? "overflow-hidden bg-[var(--yilbasi)] text-[var(--yilbasi-on)]"
            : "overflow-hidden bg-foreground text-background"
        }
      >
        <div className="adjy-serit" role="complementary" aria-label="Mağaza bilgileri">
          {/* İkinci kopya yalnızca görsel süreklilik için; ekran
              okuyucu maddeleri bir kez okur. */}
          <Seri maddeler={maddeler} />
          <Seri maddeler={maddeler} gizli />
        </div>
      </div>
      {/* Yılbaşı: şeridin altından sarkan piksel ışık zinciri */}
      {yilbasi && <IsikZinciri className="relative z-[45]" />}
    </>
  );
}
