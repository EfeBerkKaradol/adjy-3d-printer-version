"use client";

import { useCallback, useRef, useState } from "react";
import * as THREE from "three";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";
import { GLTFExporter } from "three/examples/jsm/exporters/GLTFExporter.js";
import { Loader2, Upload, Check, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { analyzeMeshPositions, estimatePrint, calculatePrintPrice, formatPrintTime, formatTRY } from "@/lib/slicer";
import { BUILD, fitsBuildVolume, routeForMaterial } from "@/lib/production";
import { formatCmValue } from "@/lib/units";

// ==========================================
// ÜRÜN 3D DOSYASI
//
// Ürünün kendi modelini panele yükler ve dosyadan ne
// okunduğunu gösterir: hacim, tahmini ağırlık, baskı süresi
// ve maliyet.
//
// Ürünlerimiz çoğunlukla çok parçalı: kaide + gövde + şapka
// gibi. Her parça tablaya ayrı yatırıldığı için dosyaların
// hiçbiri ürünün montajlı ölçüsünü taşımaz — hepsi z=0'dan
// başlar. Bu yüzden parçalar birlikte yüklenir:
//
//   • ağırlık / süre / maliyet → parçaların TOPLAMI
//   • tabla sınırı kontrolü    → parça parça (her biri
//     ayrı basıldığı için en uzun kenarın en büyüğü)
//   • montajlı dış ölçü        → operatör onaylar; ölçülen
//     en büyük değerler ön dolgu olarak gelir
//
// Özelleştirme bu ölçüler görülmeden açılmaz; slider aralığı
// montajlı ölçüden türetilir.
//
// Seçilen ana parça AR için GLB olarak dışa aktarılır.
// ==========================================

/**
 * AR modelini sadeleştirir.
 *
 * Baskı STL'leri yüz binlerce üçgen taşıyor; olduğu gibi GLB'ye
 * çevrilince dosya 40 MB'ı aşıyor ve telefonda açılmıyor.
 * Köşeler bir ızgaraya yuvarlanıp aynı hücreye düşenler
 * birleştirilir: biçim korunur, üçgen sayısı onda birine iner.
 * Bu yalnızca AR kopyası içindir — ölçü ve hacim hesabı
 * her zaman ham geometriden yapılır.
 */
function sadelestir(geo: THREE.BufferGeometry, hedefUcgen: number): THREE.BufferGeometry {
  const pos = geo.getAttribute("position").array as ArrayLike<number>;
  const ucgen = pos.length / 9;
  if (ucgen <= hedefUcgen) return geo;

  geo.computeBoundingBox();
  const bb = geo.boundingBox!;
  const boy = Math.max(bb.max.x - bb.min.x, bb.max.y - bb.min.y, bb.max.z - bb.min.z) || 1;
  const n = Math.max(12, Math.round(Math.pow(hedefUcgen * 2, 1 / 2.2)));
  const h = boy / n;

  const anahtar = (i: number) =>
    `${Math.floor((pos[i] - bb.min.x) / h)},${Math.floor((pos[i + 1] - bb.min.y) / h)},${Math.floor((pos[i + 2] - bb.min.z) / h)}`;

  const temsil = new Map<string, [number, number, number]>();
  for (let i = 0; i < pos.length; i += 3) {
    const k = anahtar(i);
    if (!temsil.has(k)) temsil.set(k, [pos[i], pos[i + 1], pos[i + 2]]);
  }

  const cikti: number[] = [];
  const gorulen = new Set<string>();
  for (let t = 0; t < pos.length; t += 9) {
    const ka = anahtar(t), kb = anahtar(t + 3), kc = anahtar(t + 6);
    if (ka === kb || kb === kc || ka === kc) continue;
    const imza = [ka, kb, kc].sort().join("|");
    if (gorulen.has(imza)) continue;
    gorulen.add(imza);
    for (const k of [ka, kb, kc]) cikti.push(...temsil.get(k)!);
  }

  const yeni = new THREE.BufferGeometry();
  yeni.setAttribute("position", new THREE.Float32BufferAttribute(cikti, 3));
  yeni.computeVertexNormals();
  yeni.computeBoundingBox();
  return yeni;
}

interface Olcu {
  xMm: number;
  yMm: number;
  zMm: number;
  enUzunMm: number;
  hacimCm3: number;
  agirlikG: number;
  sureDk: number;
  ucgen: number;
}

/** Ürünün tek bir baskı/döküm parçası */
interface Parca {
  ad: string;
  olcu: Olcu;
  geometri: THREE.BufferGeometry;
}

/**
 * "235 x 120 x 246" biçimindeki montajlı ölçüyü ayrıştırır.
 * Ayraç olarak x, X, × ve * kabul edilir; ondalık ayırıcı nokta
 * ya da virgül olabilir.
 */
function olcuAyristir(metin: string): [number, number, number] | null {
  const parcalar = metin
    .replace(/,/g, ".")
    .split(/[x×*]/i)
    .map((p) => Number(p.trim()))
    .filter((n) => Number.isFinite(n) && n > 0);
  return parcalar.length === 3 ? [parcalar[0], parcalar[1], parcalar[2]] : null;
}

/** Seramik alçısının döküm yoğunluğu (g/cm³) */
const ALCI_YOGUNLUK = 1.7;

interface Props {
  productId: string;
  materialType: string | null;
  onSaved: (modelFileUrl: string) => void;
}

export function ProductModelUpload({ productId, materialType, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [parcalar, setParcalar] = useState<Parca[]>([]);
  const [anaParca, setAnaParca] = useState(0);
  const [montaj, setMontaj] = useState("");
  const [ayrinti, setAyrinti] = useState(false);
  const [durum, setDurum] = useState<"bos" | "okunuyor" | "hazir" | "yukleniyor" | "bitti">("bos");
  const [hata, setHata] = useState<string | null>(null);
  const [ozellestir, setOzellestir] = useState(true);

  const rota = routeForMaterial(materialType);
  const dokum = rota === "cast";

  /** Bir STL dosyasını ölçer. Fiyat burada hesaplanmaz — fiyat parçaların toplamından çıkar. */
  const okuBir = useCallback(async (f: File): Promise<Parca> => {
    const buf = await f.arrayBuffer();
    const geo = new STLLoader().parse(buf);
    geo.computeBoundingBox();
    geo.computeVertexNormals();

    const bb = geo.boundingBox!;
    const size = bb.getSize(new THREE.Vector3());
    const pos = geo.getAttribute("position").array as Float32Array;
    const stats = analyzeMeshPositions(pos);
    const hacimCm3 = stats.volumeMm3 / 1000;

    // Döküm ürünün ağırlığı dökülen alçıdır, basılan filament
    // değil; baskı süresi de yoktur.
    const tahmin = dokum
      ? null
      : estimatePrint({
          volumeMm3: stats.volumeMm3,
          areaMm2: stats.areaMm2,
          heightMm: size.z,
          infillPercent: 20,
          layerHeight: 0.2,
          materialId: "pla",
        });

    return {
      ad: f.name,
      geometri: geo,
      olcu: {
        xMm: size.x,
        yMm: size.y,
        zMm: size.z,
        enUzunMm: Math.max(size.x, size.y, size.z),
        hacimCm3,
        agirlikG: tahmin ? tahmin.weightGrams : hacimCm3 * ALCI_YOGUNLUK,
        sureDk: tahmin ? tahmin.printTimeMinutes : 0,
        ucgen: stats.triangleCount,
      },
    };
  }, [dokum]);

  const oku = useCallback(async (dosyalar: File[]) => {
    setDurum("okunuyor");
    setHata(null);
    try {
      const okunan: Parca[] = [];
      for (const f of dosyalar) okunan.push(await okuBir(f));

      // En hacimli parça ürünün tanıyıcı formu sayılır: AR modeli
      // ondan çıkar. Operatör değiştirebilir.
      let ana = 0;
      okunan.forEach((p, i) => {
        if (p.olcu.hacimCm3 > okunan[ana].olcu.hacimCm3) ana = i;
      });

      // Montajlı ölçü ön dolgusu: eksen eksen ölçülen en büyük
      // değer. Parçalar üst üste monte oluyorsa gerçek yükseklik
      // bundan büyüktür — operatör düzeltir.
      const enBuyuk = (sec: (o: Olcu) => number) =>
        Math.max(...okunan.map((p) => sec(p.olcu)));

      setParcalar(okunan);
      setAnaParca(ana);
      setMontaj(
        [enBuyuk((o) => o.xMm), enBuyuk((o) => o.yMm), enBuyuk((o) => o.zMm)]
          .map((v) => Math.round(v))
          .join(" x ")
      );
      setDurum("hazir");
    } catch {
      setHata("Dosyalar okunamadı. Yalnızca STL destekleniyor.");
      setDurum("bos");
    }
  }, [okuBir]);

  // --- Toplamlar ---
  const toplam = parcalar.length
    ? {
        hacimCm3: parcalar.reduce((t, p) => t + p.olcu.hacimCm3, 0),
        agirlikG: parcalar.reduce((t, p) => t + p.olcu.agirlikG, 0),
        sureDk: parcalar.reduce((t, p) => t + p.olcu.sureDk, 0),
        ucgen: parcalar.reduce((t, p) => t + p.olcu.ucgen, 0),
        // Her parça ayrı basılır: tabla sınırını belirleyen,
        // parçaların en uzun kenarlarının en büyüğüdür.
        enUzunMm: Math.max(...parcalar.map((p) => p.olcu.enUzunMm)),
      }
    : null;

  // Fiyat parça başına değil bir kez hesaplanır; hazırlık ücreti
  // tek plaka için bir kere alınır.
  const fiyat =
    toplam && !dokum
      ? calculatePrintPrice(
          {
            filamentVolumeMm3: toplam.hacimCm3 * 1000,
            weightGrams: toplam.agirlikG,
            printTimeMinutes: toplam.sureDk,
          },
          {
            materialId: "pla",
            quantity: 1,
            layerHeight: 0.2,
            infillPercent: 20,
            largestMm: toplam.enUzunMm,
          }
        ).unitPriceGross
      : null;

  const olculer = olcuAyristir(montaj);
  const montajGecerli = olculer !== null;

  const kaydet = useCallback(async () => {
    if (!parcalar.length || !toplam || !olculer) return;
    setDurum("yukleniyor");
    setHata(null);
    try {
      // AR için GLB — ana parçadan, sadeleştirilmiş, gerçek ölçekte (mm → m)
      // ~2500 üçgen: telefonda hızlı açılan, biçimi koruyan boyut
      const arGeo = sadelestir(parcalar[anaParca].geometri.clone(), 2500);
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(
        arGeo,
        new THREE.MeshStandardMaterial({ color: "#ded9d1", roughness: 0.7 })
      );
      const bb = arGeo.boundingBox!;
      const c = bb.getCenter(new THREE.Vector3());
      mesh.position.sub(c);
      mesh.position.y += (bb.max.y - bb.min.y) / 2;
      mesh.scale.setScalar(0.001);
      scene.add(mesh);

      const glb: ArrayBuffer = await new Promise((res, rej) =>
        new GLTFExporter().parse(scene, (r) => res(r as ArrayBuffer), (e) => rej(e), { binary: true })
      );

      const sig = await fetch("/api/upload-model", { method: "POST" }).then((r) => r.json());
      const gonder = async (blob: Blob, ad: string) => {
        const fd = new FormData();
        fd.append("file", new File([blob], ad));
        fd.append("api_key", sig.apiKey);
        fd.append("timestamp", String(sig.timestamp));
        fd.append("signature", sig.signature);
        fd.append("folder", sig.folder);
        const r = await fetch(`https://api.cloudinary.com/v1_1/${sig.cloudName}/raw/upload`, {
          method: "POST",
          body: fd,
        });
        if (!r.ok) throw new Error("Yükleme başarısız");
        return (await r.json()).secure_url as string;
      };

      const glbUrl = await gonder(new Blob([glb]), `${productId}.glb`);

      const res = await fetch(`/api/admin/products/${productId}/model`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          modelFileUrl: glbUrl,
          dimensions: { xMm: olculer[0], yMm: olculer[1], zMm: olculer[2] },
          weightGrams: toplam.agirlikG,
          printMinutes: Math.round(toplam.sureDk),
          enableCustomization: ozellestir && !dokum,
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Kaydedilemedi");

      onSaved(glbUrl);
      setDurum("bitti");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi");
      setDurum("hazir");
    }
  }, [parcalar, toplam, anaParca, olculer, productId, ozellestir, dokum, onSaved]);

  const sigmayan = parcalar.filter((p) => !fitsBuildVolume(p.olcu.enUzunMm));
  const buyukFormat = toplam ? toplam.enUzunMm > BUILD.standardMm : false;

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Ürün 3D dosyaları</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Ürünün tüm parçalarını birlikte seçin; ağırlık, süre ve maliyet
            parçaların toplamından okunur.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => inputRef.current?.click()}
          disabled={durum === "okunuyor" || durum === "yukleniyor"}
        >
          <Upload className="mr-2 h-4 w-4" />
          Dosya seç
        </Button>
        <input
          ref={inputRef}
          type="file"
          accept=".stl"
          multiple
          className="hidden"
          onChange={(e) => {
            const fs = Array.from(e.target.files ?? []);
            if (fs.length) void oku(fs);
          }}
        />
      </div>

      {durum === "okunuyor" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Dosyalar okunuyor…
        </p>
      )}

      {toplam && (
        <>
          {/* Özet: operatörün karar vermek için bakması gereken tek satır.
              Parça parça döküm isteyene ayrıntı açılır. */}
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-4">
            <Satir etiket="Parça" deger={`${parcalar.length} adet`} />
            <Satir
              etiket={dokum ? "Dökülen alçı" : "Filament"}
              deger={`${toplam.agirlikG.toFixed(0)} g`}
            />
            {!dokum && <Satir etiket="Baskı süresi" deger={formatPrintTime(toplam.sureDk)} />}
            {fiyat !== null && <Satir etiket="Tahmini fiyat" deger={formatTRY(fiyat)} />}
            {dokum && <Satir etiket="Hacim" deger={`${toplam.hacimCm3.toFixed(0)} cm³`} />}
          </dl>

          <div className="mt-4 space-y-3 rounded-md bg-muted/40 p-3">
            <label className="block">
              <span className="text-sm font-medium">Montajlı ölçü</span>
              <span className="mt-0.5 block text-xs text-muted-foreground">
                Parçalar tablaya ayrı yatırıldığı için dosyalardan okunamaz.
                Ölçülen en büyük değerler yazıldı; ürünün gerçek ölçüsünü girin.
              </span>
              <span className="mt-2 flex items-center gap-2">
                <input
                  type="text"
                  value={montaj}
                  onChange={(e) => setMontaj(e.target.value)}
                  placeholder="en x derinlik x yükseklik"
                  aria-label="Montajlı ölçü (mm)"
                  className="w-56 rounded-md border border-border/60 bg-background px-2.5 py-1.5 text-sm tabular-nums"
                />
                <span className="text-sm text-muted-foreground">
                  mm
                  {olculer && (
                    <> · {formatCmValue(olculer[0])} × {formatCmValue(olculer[1])} ×{" "}
                    {formatCmValue(olculer[2])} cm</>
                  )}
                </span>
              </span>
              {montaj.trim() !== "" && !olculer && (
                <span className="mt-1 block text-xs text-destructive">
                  Üç ölçüyü x ile ayırarak yazın: 235 x 120 x 246
                </span>
              )}
            </label>

            {dokum ? (
              <p className="text-sm text-muted-foreground">
                Döküm ürün (alçı/seramik) — kalıp tek ölçü olduğu için
                özelleştirme açılmaz.
              </p>
            ) : (
              <label className="flex items-start gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={ozellestir}
                  onChange={(e) => setOzellestir(e.target.checked)}
                  className="mt-0.5 h-4 w-4"
                />
                <span>
                  Özelleştirmeyi aç
                  <span className="block text-xs text-muted-foreground">
                    Müşteri ölçüyü {formatCmValue((olculer?.[0] ?? 0) * 0.6)}–
                    {formatCmValue(Math.min(BUILD.maxMm, (olculer?.[0] ?? 0) * 1.6))} cm
                    arasında değiştirebilir, fiyat ölçüyle birlikte güncellenir.
                  </span>
                </span>
              </label>
            )}
          </div>

          {sigmayan.length > 0 && (
            <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              Tabla sınırını ({formatCmValue(BUILD.maxMm)} cm) aşan{" "}
              {sigmayan.length} parça var: {sigmayan.map((p) => p.ad).join(", ")}.
            </p>
          )}
          {sigmayan.length === 0 && buyukFormat && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-500">
              En uzun kenar {formatCmValue(toplam.enUzunMm)} cm —{" "}
              {formatCmValue(BUILD.standardMm)} cm üstü büyük formatlı makineye
              düşer, saat maliyeti daha yüksek.
            </p>
          )}

          {hata && <p className="mt-3 text-sm text-destructive">{hata}</p>}

          <div className="mt-4 flex items-center gap-3">
            <Button
              type="button"
              onClick={kaydet}
              disabled={
                sigmayan.length > 0 ||
                !montajGecerli ||
                durum === "yukleniyor" ||
                durum === "bitti"
              }
            >
              {durum === "yukleniyor" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {durum === "bitti" && <Check className="mr-2 h-4 w-4" />}
              {durum === "bitti" ? "Kaydedildi" : "Modeli kaydet"}
            </Button>
            <button
              type="button"
              onClick={() => setAyrinti((a) => !a)}
              className="text-sm text-muted-foreground underline-offset-4 hover:underline"
            >
              {ayrinti ? "Parça ayrıntısını gizle" : "Parça ayrıntısı"}
            </button>
          </div>

          {ayrinti && (
            <table className="mt-3 w-full text-sm">
              <thead>
                <tr className="border-b border-border/60 text-left text-xs text-muted-foreground">
                  <th className="pb-1 font-normal">Parça</th>
                  <th className="pb-1 font-normal">Ölçü (cm)</th>
                  <th className="pb-1 text-right font-normal">Hacim</th>
                  <th className="pb-1 text-right font-normal">{dokum ? "Alçı" : "Ağırlık"}</th>
                  <th className="pb-1 text-center font-normal">AR</th>
                </tr>
              </thead>
              <tbody>
                {parcalar.map((p, i) => (
                  <tr key={p.ad} className="border-b border-border/30">
                    <td className="py-1.5 pr-2">{p.ad}</td>
                    <td className="py-1.5 pr-2 tabular-nums">
                      {formatCmValue(p.olcu.xMm)} × {formatCmValue(p.olcu.yMm)} ×{" "}
                      {formatCmValue(p.olcu.zMm)}
                      {!fitsBuildVolume(p.olcu.enUzunMm) && (
                        <AlertTriangle className="ml-1 inline h-3.5 w-3.5 text-destructive" />
                      )}
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {p.olcu.hacimCm3.toFixed(1)} cm³
                    </td>
                    <td className="py-1.5 text-right tabular-nums">
                      {p.olcu.agirlikG.toFixed(0)} g
                    </td>
                    <td className="py-1.5 text-center">
                      <input
                        type="radio"
                        name="ana-parca"
                        checked={anaParca === i}
                        onChange={() => setAnaParca(i)}
                        aria-label={`${p.ad} AR modeli olsun`}
                        className="h-3.5 w-3.5"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </>
      )}

      {hata && !toplam && <p className="mt-3 text-sm text-destructive">{hata}</p>}
    </div>
  );
}

function Satir({ etiket, deger }: { etiket: string; deger: string }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{etiket}</dt>
      <dd className="mt-0.5 font-medium tabular-nums">{deger}</dd>
    </div>
  );
}
