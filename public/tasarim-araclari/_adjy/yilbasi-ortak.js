/* ==========================================================================
   YILBAŞI ARAÇLARI — ORTAK MODÜL

   İsimli süs, kar tanesi ve yılbaşı ağacı araçlarının ortak parçaları:

   - Sahne: Z yukarı, mm; gölge alan zemin, ızgara, yörünge kamerası.
   - Kontur: 2B çizim (şekil, yazı, kar tanesi) bir tuvale yüksek
     çözünürlükte çizilir, "marching squares" ile dış hatları çıkarılır
     ve ekstrüde edilir. Yazı tarayıcının yazı tipiyle çizildiği için
     Türkçe harfler (ğ, ş, ı, İ) ve el yazısı fontlar sorunsuz; yazı tipi
     dosyası gerekmez.
   - STL (ikili), indirme, hacim.
   - Form: gizli <select> + düğme grubu, kaydırıcı ↔ sayı alanı.

   Köprü (kopru.js) durumu form alanlarından okur; bütün seçimler gerçek
   <input>/<select> alanlarında durur.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";

export const PLA = 1.24; // g/cm³
export const AKIS = 8; // mm³/sn — 0.4 meme, 0.2 katman, süs için temkinli
export const el = (id) => document.getElementById(id);
export const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
export const sayi = (id, yedek) => {
  const v = parseFloat(el(id)?.value);
  return Number.isFinite(v) ? v : yedek;
};
export const VITRIN = new URLSearchParams(location.search).has("vitrin");

// ---------------------------------------------------------------- SAHNE
export function sahneKur({ tuval, kutu }) {
  const renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const sahne = new THREE.Scene();
  const kamera = new THREE.PerspectiveCamera(32, 1, 1, 8000);
  kamera.up.set(0, 0, 1);
  const kontrol = new OrbitControls(kamera, tuval);
  kontrol.enableDamping = true;
  kontrol.dampingFactor = 0.12;
  kontrol.zoomToCursor = true;
  kontrol.maxPolarAngle = Math.PI * 0.495;

  sahne.add(new THREE.HemisphereLight(0xffffff, 0x8f8a80, 1.45));
  const gunes = new THREE.DirectionalLight(0xffffff, 2.0);
  gunes.castShadow = true;
  gunes.shadow.mapSize.set(2048, 2048);
  gunes.shadow.bias = -0.0004;
  sahne.add(gunes, gunes.target);
  const dolgu = new THREE.DirectionalLight(0xfff1dc, 0.55);
  dolgu.position.set(300, 260, 180);
  sahne.add(dolgu);

  const zemin = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), new THREE.ShadowMaterial({ opacity: 0.16 }));
  zemin.name = "zemin";
  zemin.receiveShadow = true;
  zemin.position.z = -0.05;
  sahne.add(zemin);
  const izgara = new THREE.GridHelper(1000, 100);
  izgara.name = "izgara";
  izgara.rotation.x = Math.PI / 2;
  izgara.position.z = -0.1;
  izgara.material.transparent = true;
  izgara.material.opacity = 0.32;
  sahne.add(izgara);
  if (VITRIN) izgara.visible = false;

  const model = new THREE.Group();
  model.name = "model";
  sahne.add(model);

  const d = {
    renderer, sahne, kamera, kontrol, gunes, izgara, model,
    kirli: true,
    kutu: new THREE.Box3(),
    bakis: new THREE.Vector3(-0.15, -0.95, 0.42),
    elleOynandi: false,
  };

  d.isik = function (kutuB) {
    const c = kutuB.getCenter(new THREE.Vector3());
    const r = Math.max(80, kutuB.getSize(new THREE.Vector3()).length());
    gunes.position.set(c.x - r * 0.6, c.y - r * 0.9, c.z + r * 1.3);
    gunes.target.position.copy(c);
    const sc = gunes.shadow.camera;
    sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = r * 5;
    sc.updateProjectionMatrix();
  };

  d.ortala = function () {
    if (d.kutu.isEmpty()) return;
    const c = d.kutu.getCenter(new THREE.Vector3());
    const r = Math.max(30, d.kutu.getSize(new THREE.Vector3()).length() * 0.5);
    const asp = Math.max(0.5, kamera.aspect);
    const uz = (r / Math.sin(THREE.MathUtils.degToRad(kamera.fov / 2))) * (asp < 1 ? 1.2 / asp : 1.08);
    kamera.position.copy(c).addScaledVector(d.bakis.clone().normalize(), uz);
    kontrol.target.copy(c);
    kamera.near = Math.max(0.5, uz / 100);
    kamera.far = uz * 30;
    kamera.updateProjectionMatrix();
    kontrol.update();
    d.kirli = true;
  };

  function boyutla() {
    const w = kutu.clientWidth, h = kutu.clientHeight;
    if (!w || !h) return;
    renderer.setSize(w, h, false);
    kamera.aspect = w / h;
    kamera.updateProjectionMatrix();
    if (!d.elleOynandi) d.ortala();
    d.kirli = true;
  }
  d.boyutla = boyutla;
  new ResizeObserver(boyutla).observe(kutu);
  window.addEventListener("resize", boyutla);
  kontrol.addEventListener("start", () => { d.elleOynandi = true; });
  kontrol.addEventListener("change", () => { d.kirli = true; });

  function tema() {
    const cs = getComputedStyle(document.documentElement);
    izgara.material.color.set(cs.getPropertyValue("--a-cizgi-koyu").trim() || "#cfccc2");
    d.kirli = true;
  }
  window.addEventListener("adjy:tema", () => setTimeout(tema, 30));
  tema();

  /**
   * Sahne döngüsü. Model kare döngüsünden bağımsız kurulur: arka plan
   * sekmesinde requestAnimationFrame durur, ama atölye orada müşterinin
   * kaydını yükleyip dosyaları indirebilir; model yine güncel olmalı.
   * Kare yalnız değişince çizilir.
   */
  d.dongu = function (kur, her) {
    let yenile = false;
    let zamanli = null;
    const kurNow = () => {
      yenile = false;
      if (zamanli) {
        clearTimeout(zamanli);
        zamanli = null;
      }
      kur();
    };
    d.yenile = () => {
      yenile = true;
      if (!zamanli) zamanli = setTimeout(() => { zamanli = null; if (yenile) kurNow(); }, 24);
    };
    d.simdiKur = kurNow;
    function kare(an) {
      requestAnimationFrame(kare);
      if (yenile) kurNow();
      if (her && her(an)) d.kirli = true;
      if (kontrol.update()) d.kirli = true;
      if (d.kirli) {
        d.kirli = false;
        renderer.render(sahne, kamera);
      }
    }
    boyutla();
    kurNow(); // ilk model hemen: köprü hazırMi'yi kareyi beklemeden görür
    requestAnimationFrame(kare);
  };

  /** Modeli değiştir: eski ağlar atılır */
  d.modeliYaz = function (aglar) {
    for (const c of [...model.children]) {
      model.remove(c);
      c.traverse?.((o) => { if (o.geometry) o.geometry.dispose(); });
    }
    for (const a of aglar) model.add(a);
    model.updateMatrixWorld(true);
    d.kutu.setFromObject(model);
    d.isik(d.kutu);
    d.kirli = true;
  };
  return d;
}

/** Baskı malzemesi görünümü */
export function malzeme(renk, ek = {}) {
  return new THREE.MeshStandardMaterial({ color: renk, roughness: 0.52, metalness: 0.0, ...ek });
}

export function ag(geo, mat, ad) {
  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  m.receiveShadow = true;
  if (ad) m.name = ad;
  return m;
}

// ---------------------------------------------------------------- KONTUR
/**
 * mm cinsinden bir çizim alanı açar. ciz(ctx) mm koordinatında çizer:
 * orijin alanın ortası, +Y yukarı (tuvalin y'si ters çevrilir).
 */
export function maske(genMm, yukMm, pxMm, ciz) {
  const kenar = 3; // px: dış hat kapalı kalsın diye boş kenar
  const w = Math.ceil(genMm * pxMm) + kenar * 2;
  const h = Math.ceil(yukMm * pxMm) + kenar * 2;
  const tuval = document.createElement("canvas");
  tuval.width = w;
  tuval.height = h;
  // Saydam zemin, beyaz dolgu: maskeler alfa kanalıyla birleşir
  // (destination-in / -out kaynağın alfasına bakar)
  const ctx = tuval.getContext("2d", { willReadFrequently: true });
  ctx.save();
  ctx.translate(w / 2, h / 2);
  ctx.scale(pxMm, -pxMm);
  ctx.fillStyle = "#fff";
  ctx.strokeStyle = "#fff";
  ciz(ctx);
  ctx.restore();
  return { tuval, ctx, w, h, pxMm };
}

/**
 * Maskeyi mm kadar içe daraltır. Dış hat, birleşik şeklin konturundan
 * alınır: iç içe geçen alt yolların (ağaç katları) iç kenarları
 * silinmez.
 */
export function asindir(m, mm) {
  if (!(mm > 0)) return m;
  const donguler = konturlar(m, 0.02);
  const c = m.ctx;
  c.save();
  c.translate(m.w / 2, m.h / 2);
  c.scale(m.pxMm, -m.pxMm);
  c.globalCompositeOperation = "destination-out";
  c.lineJoin = "round";
  c.lineCap = "round";
  c.lineWidth = mm * 2;
  c.strokeStyle = "#fff";
  c.beginPath();
  for (const d of donguler) {
    d.forEach((q, i) => (i ? c.lineTo(q.x, q.y) : c.moveTo(q.x, q.y)));
    c.closePath();
  }
  c.stroke();
  c.restore();
  return m;
}

/** Bir maskeyi diğerine göre kırpar: islem "destination-in" (kesişim) ya da "destination-out" (çıkar) */
export function maskeBirlestir(hedef, kaynak, islem) {
  hedef.ctx.save();
  hedef.ctx.globalCompositeOperation = islem;
  hedef.ctx.drawImage(kaynak.tuval, 0, 0);
  hedef.ctx.restore();
  return hedef;
}

/** Maskede dolu piksel var mı (boş yazı vb.) */
export function maskeDoluMu(m) {
  const d = m.ctx.getImageData(0, 0, m.w, m.h).data;
  for (let i = 3; i < d.length; i += 16) if (d[i] > 127) return true;
  return false;
}

/**
 * Maskenin dış hatları: kapalı döngüler, mm, +Y yukarı.
 * Marching squares; kenar noktaları 0.5 eşiğine doğrusal yerleşir,
 * kenar yumuşatması (antialias) alt piksel düzgünlük verir.
 */
export function konturlar(m, tolMm = 0.035) {
  const { w, h, pxMm } = m;
  const veri = m.ctx.getImageData(0, 0, w, h).data;
  const v = new Float32Array(w * h);
  for (let i = 0, j = 3; i < v.length; i++, j += 4) v[i] = veri[j] / 255;
  const deger = (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? 0 : v[y * w + x]);

  const noktalar = new Map(); // kenar anahtarı → [x, y]
  const komsu = new Map(); // kenar anahtarı → [anahtar, anahtar]
  function kenarNoktasi(tur, x, y) {
    const k = tur + x + "," + y;
    if (!noktalar.has(k)) {
      let px, py;
      if (tur === "h") {
        const a = deger(x, y), b = deger(x + 1, y);
        const t = Math.abs(b - a) > 1e-6 ? clamp((0.5 - a) / (b - a), 0, 1) : 0.5;
        px = x + t; py = y;
      } else {
        const a = deger(x, y), b = deger(x, y + 1);
        const t = Math.abs(b - a) > 1e-6 ? clamp((0.5 - a) / (b - a), 0, 1) : 0.5;
        px = x; py = y + t;
      }
      noktalar.set(k, [px, py]);
    }
    return k;
  }
  function bagla(a, b) {
    if (!komsu.has(a)) komsu.set(a, []);
    if (!komsu.has(b)) komsu.set(b, []);
    komsu.get(a).push(b);
    komsu.get(b).push(a);
  }

  for (let y = -1; y < h; y++) {
    for (let x = -1; x < w; x++) {
      const tl = deger(x, y) >= 0.5 ? 8 : 0;
      const tr = deger(x + 1, y) >= 0.5 ? 4 : 0;
      const br = deger(x + 1, y + 1) >= 0.5 ? 2 : 0;
      const bl = deger(x, y + 1) >= 0.5 ? 1 : 0;
      const c = tl | tr | br | bl;
      if (c === 0 || c === 15) continue;
      const U = () => kenarNoktasi("h", x, y);
      const D = () => kenarNoktasi("h", x, y + 1);
      const L = () => kenarNoktasi("v", x, y);
      const R = () => kenarNoktasi("v", x + 1, y);
      const merkez = (deger(x, y) + deger(x + 1, y) + deger(x + 1, y + 1) + deger(x, y + 1)) / 4 >= 0.5;
      switch (c) {
        case 1: case 14: bagla(L(), D()); break;
        case 2: case 13: bagla(D(), R()); break;
        case 3: case 12: bagla(L(), R()); break;
        case 4: case 11: bagla(U(), R()); break;
        case 6: case 9: bagla(U(), D()); break;
        case 7: case 8: bagla(L(), U()); break;
        case 5:
          if (merkez) { bagla(L(), U()); bagla(D(), R()); } else { bagla(U(), R()); bagla(L(), D()); }
          break;
        case 10:
          if (merkez) { bagla(U(), R()); bagla(L(), D()); } else { bagla(L(), U()); bagla(D(), R()); }
          break;
      }
    }
  }

  const gorulen = new Set();
  const donguler = [];
  const ox = w / 2, oy = h / 2;
  for (const bas of komsu.keys()) {
    if (gorulen.has(bas)) continue;
    const yol = [bas];
    gorulen.add(bas);
    let onceki = null, simdi = bas;
    for (;;) {
      const k = komsu.get(simdi) || [];
      const sonraki = k[0] !== onceki && !(k[0] === bas && yol.length < 3) ? k[0] : k[1];
      if (sonraki === undefined || sonraki === bas) break;
      if (gorulen.has(sonraki)) break;
      gorulen.add(sonraki);
      yol.push(sonraki);
      onceki = simdi;
      simdi = sonraki;
    }
    if (yol.length < 6) continue;
    const pts = yol.map((k) => {
      const [px, py] = noktalar.get(k);
      return new THREE.Vector2((px - ox) / pxMm, -(py - oy) / pxMm);
    });
    const sade = rdpKapali(pts, tolMm);
    if (sade.length >= 3 && Math.abs(THREE.ShapeUtils.area(sade)) > 0.05) donguler.push(sade);
  }
  return donguler;
}

/** Kapalı çokgeni Ramer–Douglas–Peucker ile sadeleştirir */
function rdpKapali(pts, tol) {
  if (pts.length < 8) return pts;
  // En uzak iki noktadan böl
  let ia = 0, ib = 0, en = -1;
  for (let i = 0; i < pts.length; i += Math.max(1, Math.floor(pts.length / 64))) {
    const d = pts[i].distanceToSquared(pts[0]);
    if (d > en) { en = d; ib = i; }
  }
  const a = rdp(pts.slice(ia, ib + 1), tol);
  const b = rdp(pts.slice(ib).concat([pts[0]]), tol);
  return a.slice(0, -1).concat(b.slice(0, -1));
}
function rdp(p, tol) {
  if (p.length < 3) return p;
  const a = p[0], b = p[p.length - 1];
  const dx = b.x - a.x, dy = b.y - a.y;
  const L = Math.hypot(dx, dy) || 1e-9;
  let en = -1, ix = 0;
  for (let i = 1; i < p.length - 1; i++) {
    const d = Math.abs((p[i].x - a.x) * dy - (p[i].y - a.y) * dx) / L;
    if (d > en) { en = d; ix = i; }
  }
  if (en <= tol) return [a, b];
  const s1 = rdp(p.slice(0, ix + 1), tol);
  const s2 = rdp(p.slice(ix), tol);
  return s1.slice(0, -1).concat(s2);
}

/** Döngülerden şekiller: iç içe derinliği çift olan dış hat, tek olan delik */
export function sekiller(donguler) {
  const kayit = donguler
    .map((d) => ({ d, alan: Math.abs(THREE.ShapeUtils.area(d)), derinlik: 0, ebeveyn: null, delik: [] }))
    .sort((x, y) => y.alan - x.alan);
  for (let i = 0; i < kayit.length; i++) {
    const p = kayit[i].d[0];
    for (let j = 0; j < i; j++) {
      if (icinde(p, kayit[j].d)) {
        kayit[i].derinlik++;
        kayit[i].ebeveyn = kayit[j];
      }
    }
  }
  const sonuc = [];
  for (const k of kayit) {
    if (k.derinlik % 2 === 1) {
      if (k.ebeveyn) k.ebeveyn.delik.push(k);
    }
  }
  for (const k of kayit) {
    if (k.derinlik % 2 !== 0) continue;
    const dis = THREE.ShapeUtils.isClockWise(k.d) ? k.d.slice().reverse() : k.d;
    const s = new THREE.Shape(dis);
    for (const h of k.delik) {
      const ic = THREE.ShapeUtils.isClockWise(h.d) ? h.d : h.d.slice().reverse();
      s.holes.push(new THREE.Path(ic));
    }
    sonuc.push(s);
  }
  return sonuc;
}
function icinde(p, poly) {
  let ic = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i], b = poly[j];
    if ((a.y > p.y) !== (b.y > p.y) && p.x < ((b.x - a.x) * (p.y - a.y)) / (b.y - a.y) + a.x) ic = !ic;
  }
  return ic;
}

/** Şekilleri z0'dan kalınlık kadar yukarı çeker (Z yukarı, mm) */
export function ekstrude(seks, kalinlik, z0 = 0) {
  if (!seks.length) return null;
  const g = new THREE.ExtrudeGeometry(seks, { depth: kalinlik, bevelEnabled: false, curveSegments: 1 });
  g.translate(0, 0, z0);
  g.computeVertexNormals();
  return g;
}

/** Maske → katı: maske(…) + konturlar + şekiller + ekstrüzyon */
export function maskedenKati(m, kalinlik, z0 = 0, tolMm) {
  return ekstrude(sekiller(konturlar(m, tolMm)), kalinlik, z0);
}

// ---------------------------------------------------------------- ÖLÇÜM
/** Kapalı ağın hacmi (mm³), işaretli tetrahedron toplamı */
export function hacim(geo) {
  if (!geo) return 0;
  const p = geo.attributes.position;
  const idx = geo.index;
  const n = idx ? idx.count : p.count;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    a.fromBufferAttribute(p, idx ? idx.getX(i) : i);
    b.fromBufferAttribute(p, idx ? idx.getX(i + 1) : i + 1);
    c.fromBufferAttribute(p, idx ? idx.getX(i + 2) : i + 2);
    v += a.dot(b.cross(c)) / 6;
  }
  return Math.abs(v);
}

/** Filament ve süre: hacim cm³ → gram, saat (dolu parça; ince süslerde %100'e yakın) */
export function olcum(hacimMm3, katmanDegisimi = 0) {
  const kutleG = (hacimMm3 / 1000) * PLA;
  const sureSaat = hacimMm3 / AKIS / 3600 + 0.15 + katmanDegisimi * 0.08;
  return { kutleG, sureSaat };
}

// ---------------------------------------------------------------- ÇIKTI
export function stl(geos, baslik) {
  const tris = [];
  for (const g of geos) {
    if (!g) continue;
    const ng = g.index ? g.toNonIndexed() : g;
    const a = ng.attributes.position.array;
    for (let i = 0; i < a.length; i += 9) tris.push(a.subarray(i, i + 9));
  }
  const buf = new ArrayBuffer(84 + 50 * tris.length);
  const dv = new DataView(buf);
  new Uint8Array(buf, 0, 80).set(new TextEncoder().encode(`ADJY ${baslik} mm Z-up`.slice(0, 79)));
  dv.setUint32(80, tris.length, true);
  let o = 84;
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), n = new THREE.Vector3(), e = new THREE.Vector3();
  for (const t of tris) {
    a.fromArray(t, 0); b.fromArray(t, 3); c.fromArray(t, 6);
    n.subVectors(b, a).cross(e.subVectors(c, a)).normalize();
    for (const q of [n, a, b, c]) {
      dv.setFloat32(o, q.x, true); dv.setFloat32(o + 4, q.y, true); dv.setFloat32(o + 8, q.z, true);
      o += 12;
    }
    dv.setUint16(o, 0, true);
    o += 2;
  }
  return buf;
}

export function indir(veri, ad, tur) {
  const blob = veri instanceof Blob ? veri : new Blob([veri], { type: tur });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

export function dosyaAdi(s) {
  return String(s)
    .toLocaleLowerCase("tr-TR")
    .replace(/ç/g, "c").replace(/ğ/g, "g").replace(/ı/g, "i").replace(/ö/g, "o").replace(/ş/g, "s").replace(/ü/g, "u")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "model";
}

export function csv(satirlar) {
  return "﻿" + satirlar.map((r) => r.map((h) => `"${String(h).replace(/"/g, '""')}"`).join(";")).join("\r\n") + "\r\n";
}

// ---------------------------------------------------------------- FORM
/**
 * Düğme grupları: <div class="yb-seg" data-secim="id"> içindeki
 * [data-v] düğmeleri gizli <select id="id">'i değiştirir. Renk
 * yuvarlakları (.yb-renkler) aynı düzenle çalışır.
 */
export function formBagla(degisti) {
  function boya() {
    document.querySelectorAll("[data-secim]").forEach((kap) => {
      const s = el(kap.dataset.secim);
      if (!s) return;
      kap.querySelectorAll("[data-v]").forEach((b) => {
        const on = b.dataset.v === s.value;
        b.classList.toggle("on", on);
        b.setAttribute("aria-pressed", on ? "true" : "false");
      });
    });
  }
  document.addEventListener("click", (e) => {
    const b = e.target.closest?.("[data-secim] [data-v]");
    if (!b) return;
    const s = el(b.closest("[data-secim]").dataset.secim);
    if (!s || s.value === b.dataset.v) return;
    s.value = b.dataset.v;
    s.dispatchEvent(new Event("input", { bubbles: true }));
    s.dispatchEvent(new Event("change", { bubbles: true }));
  });
  document.addEventListener("input", (e) => {
    const t = e.target;
    if (t.matches?.('input[type="range"][id]')) {
      const n = document.querySelector(`[data-bagli="${t.id}"]`);
      if (n) n.value = t.value;
    }
    if (t.tagName === "SELECT") boya();
    degisti(t);
  });
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (t.matches?.("[data-bagli]")) {
      const r = el(t.dataset.bagli);
      const v = clamp(parseFloat(t.value) || parseFloat(r.min), parseFloat(r.min), parseFloat(r.max));
      t.value = String(v);
      if (String(r.value) !== String(v)) {
        r.value = String(v);
        r.dispatchEvent(new Event("input", { bubbles: true }));
      }
    }
    if (t.tagName === "SELECT") boya();
    degisti(t);
  });
  boya();
  return { boya };
}

/** Alanlara toplu değer yaz (hazır şablonlar); her biri için olay tetiklenir */
export function alanlariYaz(degerler) {
  for (const [id, v] of Object.entries(degerler)) {
    const e = el(id);
    if (!e) continue;
    if (e.type === "checkbox") {
      if (e.checked === !!v) continue;
      e.checked = !!v;
    } else {
      if (String(e.value) === String(v)) continue;
      e.value = String(v);
    }
    e.dispatchEvent(new Event("input", { bubbles: true }));
    e.dispatchEvent(new Event("change", { bubbles: true }));
  }
}

export function tabloYaz(dl, satirlar) {
  dl.innerHTML = "";
  for (const [k, v] of satirlar) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    dl.append(dt, dd);
  }
}

export function sureYaz(saat) {
  const dk = Math.round(saat * 60);
  const s = Math.floor(dk / 60), d = dk % 60;
  return s ? (d ? `${s} sa ${d} dk` : `${s} sa`) : `${d} dk`;
}

export { THREE };
