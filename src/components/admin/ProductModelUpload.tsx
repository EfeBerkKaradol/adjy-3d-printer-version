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
// okunduğunu gösterir: dış ölçü, hacim, tahmini ağırlık,
// baskı süresi ve maliyet.
//
// Özelleştirme bu ölçüler görülmeden açılmaz. Ölçü aralığı
// modelin gerçek boyutundan türetilir — elle girilen bir
// aralık modelle tutarsız kalıp tablaya sığmayan siparişler
// üretiyordu.
//
// Model ayrıca AR için GLB olarak dışa aktarılır; "Odanda
// Gör" ürünün kendi geometrisini gösterir.
// ==========================================

interface Olcu {
  xMm: number;
  yMm: number;
  zMm: number;
  enUzunMm: number;
  hacimCm3: number;
  agirlikG: number;
  sureDk: number;
  fiyat: number;
  ucgen: number;
}

interface Props {
  productId: string;
  materialType: string | null;
  onSaved: (modelFileUrl: string) => void;
}

export function ProductModelUpload({ productId, materialType, onSaved }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dosya, setDosya] = useState<File | null>(null);
  const [olcu, setOlcu] = useState<Olcu | null>(null);
  const [geometri, setGeometri] = useState<THREE.BufferGeometry | null>(null);
  const [durum, setDurum] = useState<"bos" | "okunuyor" | "hazir" | "yukleniyor" | "bitti">("bos");
  const [hata, setHata] = useState<string | null>(null);
  const [ozellestir, setOzellestir] = useState(true);

  const rota = routeForMaterial(materialType);

  const oku = useCallback(async (f: File) => {
    setDurum("okunuyor");
    setHata(null);
    try {
      const buf = await f.arrayBuffer();
      const geo = new STLLoader().parse(buf);
      geo.computeBoundingBox();
      geo.computeVertexNormals();

      const bb = geo.boundingBox!;
      const size = bb.getSize(new THREE.Vector3());
      const pos = geo.getAttribute("position").array as Float32Array;
      const stats = analyzeMeshPositions(pos);

      const enUzun = Math.max(size.x, size.y, size.z);
      const tahmin = estimatePrint({
        volumeMm3: stats.volumeMm3,
        areaMm2: stats.areaMm2,
        heightMm: size.z,
        infillPercent: 20,
        layerHeight: 0.2,
        materialId: "pla",
      });
      const fiyat = calculatePrintPrice(tahmin, {
        materialId: "pla",
        quantity: 1,
        layerHeight: 0.2,
        infillPercent: 20,
        largestMm: enUzun,
      });

      setGeometri(geo);
      setOlcu({
        xMm: size.x,
        yMm: size.y,
        zMm: size.z,
        enUzunMm: enUzun,
        hacimCm3: stats.volumeMm3 / 1000,
        agirlikG: tahmin.weightGrams,
        sureDk: tahmin.printTimeMinutes,
        fiyat: fiyat.unitPriceGross,
        ucgen: stats.triangleCount,
      });
      setDurum("hazir");
    } catch {
      setHata("Bu dosya okunamadı. Yalnızca STL destekleniyor.");
      setDurum("bos");
    }
  }, []);

  const kaydet = useCallback(async () => {
    if (!dosya || !geometri || !olcu) return;
    setDurum("yukleniyor");
    setHata(null);
    try {
      // AR için GLB — gerçek ölçekte (mm → m)
      const scene = new THREE.Scene();
      const mesh = new THREE.Mesh(
        geometri,
        new THREE.MeshStandardMaterial({ color: "#ded9d1", roughness: 0.7 })
      );
      const bb = geometri.boundingBox!;
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
          dimensions: { xMm: olcu.xMm, yMm: olcu.yMm, zMm: olcu.zMm },
          weightGrams: olcu.agirlikG,
          printMinutes: olcu.sureDk,
          enableCustomization: ozellestir && rota === "fdm",
        }),
      });
      if (!res.ok) throw new Error((await res.json()).error ?? "Kaydedilemedi");

      onSaved(glbUrl);
      setDurum("bitti");
    } catch (e) {
      setHata(e instanceof Error ? e.message : "Kaydedilemedi");
      setDurum("hazir");
    }
  }, [dosya, geometri, olcu, productId, ozellestir, rota, onSaved]);

  const sigmaz = olcu ? !fitsBuildVolume(olcu.enUzunMm) : false;
  const buyukFormat = olcu ? olcu.enUzunMm > BUILD.standardMm : false;

  return (
    <div className="rounded-lg border border-border/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-sm font-medium">Ürün 3D dosyası</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            STL yükleyin; ölçü, ağırlık ve maliyet dosyadan okunur.
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
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) {
              setDosya(f);
              void oku(f);
            }
          }}
        />
      </div>

      {durum === "okunuyor" && (
        <p className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Dosya okunuyor…
        </p>
      )}

      {olcu && (
        <>
          <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-2 text-sm sm:grid-cols-3">
            <Satir
              etiket="Dış ölçü"
              deger={`${formatCmValue(olcu.xMm)} × ${formatCmValue(olcu.yMm)} × ${formatCmValue(olcu.zMm)} cm`}
            />
            <Satir etiket="Hacim" deger={`${olcu.hacimCm3.toFixed(1)} cm³`} />
            <Satir etiket="Üçgen" deger={olcu.ucgen.toLocaleString("tr-TR")} />
            <Satir etiket="Tahmini ağırlık" deger={`${olcu.agirlikG.toFixed(0)} g`} />
            <Satir etiket="Tahmini süre" deger={formatPrintTime(olcu.sureDk)} />
            <Satir etiket="Tahmini fiyat" deger={formatTRY(olcu.fiyat)} />
          </dl>

          {sigmaz && (
            <p className="mt-3 flex items-start gap-2 text-sm text-destructive">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
              En uzun kenar {formatCmValue(olcu.enUzunMm)} cm — tabla sınırı{" "}
              {formatCmValue(BUILD.maxMm)} cm. Bu ölçü üretilemez.
            </p>
          )}
          {!sigmaz && buyukFormat && (
            <p className="mt-3 text-sm text-amber-600 dark:text-amber-500">
              {formatCmValue(BUILD.standardMm)} cm üstü: büyük formatlı makineye düşer,
              saat maliyeti daha yüksek.
            </p>
          )}

          {rota === "cast" ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Bu ürün döküm (alçı/seramik). Kalıp tek ölçü olduğu için
              özelleştirme açılmaz.
            </p>
          ) : (
            <label className="mt-4 flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={ozellestir}
                onChange={(e) => setOzellestir(e.target.checked)}
                className="h-4 w-4"
              />
              Özelleştirmeyi aç — ölçü aralığı bu modele göre kurulur
            </label>
          )}

          {hata && <p className="mt-3 text-sm text-destructive">{hata}</p>}

          <Button
            type="button"
            className="mt-4"
            onClick={kaydet}
            disabled={sigmaz || durum === "yukleniyor" || durum === "bitti"}
          >
            {durum === "yukleniyor" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {durum === "bitti" && <Check className="mr-2 h-4 w-4" />}
            {durum === "bitti" ? "Kaydedildi" : "Modeli kaydet"}
          </Button>
        </>
      )}

      {hata && !olcu && <p className="mt-3 text-sm text-destructive">{hata}</p>}
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
