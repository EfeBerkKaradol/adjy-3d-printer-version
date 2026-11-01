import { isoGorselUret } from "@/lib/furniture/isoRender";
import { varsayilanYapilandirma, type MobilyaModeli } from "@/lib/furniture/catalog";

// ==========================================
// KART GÖRSELİ
//
// Ürünün varsayılan kurulumu, beyaz zeminde, eğik bir
// kameradan. Fotoğraf değil çizim — çünkü bu ürünlerin
// fotoğrafı olamaz, her sipariş başka ölçüde.
//
// Görsel kesim listesinden doğduğu için oranlar gerçek:
// 180 santimlik kitaplık kartta da uzun, 60 santimlik kutu raf
// kartta da küçük duruyor. Modelin varsayılanı değişirse
// görsel kendiliğinden değişiyor.
// ==========================================

export function ModelGorseli({
  model,
  className,
  govdeMalzeme,
}: {
  model: MobilyaModeli;
  className?: string;
  /** Kartlarda tek bir malzeme kullanmak görsel bütünlük sağlıyor */
  govdeMalzeme?: string;
}) {
  const cfg = varsayilanYapilandirma(model);
  const gorsel = isoGorselUret(
    govdeMalzeme
      ? { ...cfg, govdeMalzeme, onMalzeme: govdeMalzeme }
      : cfg,
    320,
    240
  );

  const v = model.varsayilan;

  return (
    <svg
      viewBox={gorsel.viewBox}
      className={className}
      role="img"
      aria-label={`${model.ad}: ${v.genislik / 10} × ${v.yukseklik / 10} × ${v.derinlik / 10} cm, ${v.sutun} sütun ${v.sira} sıra`}
    >
      {gorsel.yuzler.map((y, i) => (
        <polygon
          key={i}
          points={y.nokta.map(([x, py]) => `${x.toFixed(1)},${py.toFixed(1)}`).join(" ")}
          fill={y.renk}
          /* İnce kenar çizgisi panelleri birbirinden ayırıyor;
             olmadan bitişik yüzler tek bir leke gibi görünüyor. */
          stroke="rgba(0,0,0,0.10)"
          strokeWidth={0.5}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  );
}
