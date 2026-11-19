/* ==========================================================================
   OYUNCAK ARABA YOLU — PARAMETRİK YOL PARÇASI

   Bir yol parçası üç bölümden kurulur:

     uç A (14 mm)  →  gövde  →  uç B (14 mm)

   Uçlar her zaman düz ve yataydır: hangi parça olursa olsun diğer
   parçalara (ve orijinal yollara) oturur. Bütün biçim gövdededir:
   viraj, yükselme ve yan yatış uçlarda sıfırlanacak şekilde yumuşak
   eğrilerle açılıp kapanır.

   Gövde, yolun kesiti (taban + iki kenar, "U" profili) bir yol
   çizgisi boyunca süpürülerek üretilir. Uçlar düz olduğu için delik,
   oyuk ve geçme dili gibi ayrıntılar 2B çizimden yukarı çekilerek
   kurulur; CSG gerekmez.

   Birim milimetre, Z yukarı. STL olduğu gibi dilimleyiciye girer.
   ========================================================================== */
import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { RoomEnvironment } from "three/addons/environments/RoomEnvironment.js";

const LZ = 14; // bağlantı ucu uzunluğu
const PLA = 1.24; // g/cm³
const AKIS = 9; // mm³/sn — 0.4 meme, 0.2 katman, ortalama
const TABLA = 250; // tek parça basılabilecek en uzun kenar
const RENK = {
  turuncu: 0xff6a13,
  mavi: 0x1f6fd1,
  kirmizi: 0xd42b2b,
  sari: 0xf4c20d,
  siyah: 0x2b2c31,
  beyaz: 0xf2f1ec,
};

const el = (id) => document.getElementById(id);
const sayi = (id, yedek) => {
  const v = parseFloat(el(id)?.value);
  return Number.isFinite(v) ? v : yedek;
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const yuvarla = (v, b = 0) => Number(v.toFixed(b));

// ---------------------------------------------------------------- PARAMETRE
// Yol, uç uca dizilmiş parçalardan oluşur. Her parçanın kendi ayarları
// (PARCA_ALAN) vardır; kenar, bağlantı, renk ve atölye ölçüleri bütün yolda
// ortaktır. Seçili parçanın değerleri formda durur, diğerleri YOLUM'da.
const PARCA_ALAN = [
  "hw-tip", "hw-uzunluk", "hw-yaricap", "hw-aci", "hw-cap", "hw-yukselme",
  "hw-inis", "hw-egim", "hw-korkuluk", "hw-yon", "hw-ayak",
];
const EN_COK_PARCA = 12;
const VARSAYILAN = {
  "hw-tip": "viraj", "hw-uzunluk": "200", "hw-yaricap": "120", "hw-aci": "90",
  "hw-cap": "200", "hw-yukselme": "0", "hw-inis": "cik", "hw-egim": "0",
  "hw-korkuluk": "0", "hw-yon": "sol", "hw-ayak": true,
};
/** Kısa adlarla parça tanımı: p({ tip: "duz", uzunluk: 150 }) */
function p(o = {}) {
  const h = { ...VARSAYILAN };
  for (const [k, v] of Object.entries(o)) h["hw-" + k] = typeof v === "boolean" ? v : String(v);
  return h;
}

/** Formdaki seçili parça */
function ham() {
  const h = {};
  for (const id of PARCA_ALAN) {
    const e = el(id);
    h[id] = e.type === "checkbox" ? e.checked : e.value;
  }
  return h;
}

function ortak() {
  return {
    duvar: sayi("hw-duvar", 7),
    baglanti: el("hw-baglanti").value,
    renk: el("hw-renk").value,
    W: sayi("hw-genislik", 41.3),
    t: sayi("hw-taban", 1.6),
    w: sayi("hw-cidar", 1.6),
    delik: sayi("hw-delik", 3.4),
    tol: sayi("hw-tolerans", 0.25),
    aralik: sayi("hw-aralik", 6),
  };
}

/** Parçanın ham değerlerinden üretim parametresi */
function turet(h, O) {
  const n = (k, y) => {
    const v = parseFloat(h[k]);
    return Number.isFinite(v) ? v : y;
  };
  const tip = h["hw-tip"];
  const viraj = tip === "viraj";
  const L = clamp(n("hw-uzunluk", 200), 60, 250);
  let rise = viraj || tip === "rampa" ? clamp(n("hw-yukselme", 0), 0, 80) : 0;
  if (tip === "rampa") rise = Math.min(rise, Math.max(0, Math.floor((0.45 * (L - 2 * LZ)) / 2) * 2));
  return {
    ...O,
    tip,
    L,
    R: clamp(n("hw-yaricap", 120), 60, 200),
    aci: clamp(n("hw-aci", 90), 15, 180),
    cap: clamp(n("hw-cap", 200), 120, 240),
    rise: h["hw-inis"] === "in" ? -rise : rise,
    egim: viraj ? clamp(n("hw-egim", 0), 0, 30) : 0,
    korkuluk: viraj ? clamp(n("hw-korkuluk", 0), 0, 16) : 0,
    yon: (viraj || tip === "looping") && h["hw-yon"] === "sag" ? -1 : 1,
    ayak: h["hw-ayak"] !== false && h["hw-ayak"] !== "false",
  };
}

/** Müşterinin okuyacağı kısa ve uzun parça adı */
function kisaAd(P) {
  if (P.tip === "duz") return `Düz ${P.L}`;
  if (P.tip === "rampa") return `Rampa ${P.rise < 0 ? "↘" : "↗"}${Math.abs(P.rise)}`;
  if (P.tip === "looping") return `Looping Ø${P.cap}`;
  return `${P.yon > 0 ? "Sol" : "Sağ"} ${P.aci}°${P.rise ? (P.rise < 0 ? " ↘" : " ↗") : ""}`;
}
function tarif(P) {
  const yuk = P.rise ? ` · ${Math.abs(P.rise)} mm ${P.rise < 0 ? "iner" : "çıkar"}` : "";
  if (P.tip === "duz") return `Düz · ${P.L} mm`;
  if (P.tip === "rampa") return `Rampa · ${P.L} mm${yuk}`;
  if (P.tip === "looping") return `Looping · Ø${P.cap} mm · çıkış ${P.yon > 0 ? "solda" : "sağda"}`;
  return (
    `Viraj · ${P.yon > 0 ? "sola" : "sağa"} ${P.aci}° · R${P.R} mm` +
    (P.egim ? ` · ${P.egim}° yatık` : "") +
    (P.korkuluk ? ` · korkuluk ${P.korkuluk} mm` : "") +
    yuk
  );
}

// ---------------------------------------------------------------- YOL ÇİZGİSİ
// Gövde u ∈ [0,1]. Döndürülen örnek: yolun ortası (taban altı seviyesinde)
// x,y,z; T: ilerleme yönü; L: sol yan (yatay); h: plandaki yön açısı
// (ayak ve uç yerleşimi için); b: yan yatış açısı; k: dış kenar fazlası.
function planOrnek(x, y, z, h, m, b, k) {
  return {
    x, y, z, h, b, k,
    T: new THREE.Vector3(Math.cos(h), Math.sin(h), m).normalize(),
    L: new THREE.Vector3(-Math.sin(h), Math.cos(h), 0),
  };
}

function yol(P) {
  if (P.tip === "looping") return loopingYolu(P);
  const viraj = P.tip === "viraj";
  const th = THREE.MathUtils.degToRad(P.aci);
  const Lb = viraj ? P.R * th : Math.max(20, P.L - 2 * LZ);
  const yatis = THREE.MathUtils.degToRad(P.egim);

  function govde(u) {
    let x, y, h;
    if (viraj) {
      const a = u * th;
      x = LZ + P.R * Math.sin(a);
      y = P.yon * P.R * (1 - Math.cos(a));
      h = P.yon * a;
    } else {
      x = LZ + u * Lb;
      y = 0;
      h = 0;
    }
    // Yükselme, yatış ve korkuluk uçlarda sıfır eğimle başlar ve biter
    const z = P.rise * (3 * u * u - 2 * u * u * u);
    const m = (P.rise * (6 * u - 6 * u * u)) / Lb;
    const yumusak = Math.sin(Math.PI * u) ** 2;
    return planOrnek(x, y, z, h, m, yatis * yumusak, P.korkuluk * yumusak);
  }

  const son = govde(1);
  const Lt = Lb + 2 * LZ;

  function nokta(s) {
    if (s <= LZ) return planOrnek(s, 0, 0, 0, 0, 0, 0);
    if (s >= LZ + Lb) {
      const d = s - LZ - Lb;
      return planOrnek(son.x + d * Math.cos(son.h), son.y + d * Math.sin(son.h), P.rise, son.h, 0, 0, 0);
    }
    return govde((s - LZ) / Lb);
  }

  return { Lb, Lt, govde, nokta, son, ucZ: P.rise };
}

/**
 * Looping: giriş düzü → dikey çember → çıkış düzü.
 * Çember dönerken yana kayar; çıkış şeridi girişin yanından, aralarında
 * boşlukla geçer (kendini kesmez). Yolun "yukarısı" çemberin merkezine
 * bakar: araba çemberin içinde, tabana basarak döner.
 */
function loopingYolu(P) {
  const r = P.cap / 2;
  const C = 2 * Math.PI * r;
  const Lg = clamp(r * 0.75, 40, 90);
  const D = P.yon * (P.W + P.aralik);
  const Lb = 2 * Lg + C;
  const x0 = LZ + Lg;
  const Y = new THREE.Vector3(0, 1, 0);

  function konum(s) {
    if (s <= Lg) return new THREE.Vector3(LZ + s, 0, 0);
    if (s >= Lg + C) return new THREE.Vector3(x0 + (s - Lg - C), D, 0);
    const v = (s - Lg) / C;
    const f = 2 * Math.PI * v;
    return new THREE.Vector3(x0 + r * Math.sin(f), D * (3 * v * v - 2 * v * v * v), r * (1 - Math.cos(f)));
  }

  function govde(u) {
    const s = clamp(u, 0, 1) * Lb;
    const p = konum(s);
    const e = 0.05;
    const T = konum(Math.min(Lb, s + e)).sub(konum(Math.max(0, s - e))).normalize();
    const L = Y.clone().addScaledVector(T, -Y.dot(T)).normalize();
    return { x: p.x, y: p.y, z: p.z, h: 0, b: 0, k: 0, T, L };
  }

  const son = govde(1);
  const Lt = Lb + 2 * LZ;
  function nokta(s) {
    if (s <= LZ) return planOrnek(s, 0, 0, 0, 0, 0, 0);
    if (s >= LZ + Lb) return planOrnek(son.x + (s - LZ - Lb), D, 0, 0, 0, 0, 0);
    return govde((s - LZ) / Lb);
  }
  return { Lb, Lt, govde, nokta, son, ucZ: 0, looping: { r, Lg, D, x0 } };
}

// Kesit düzlemi: profil noktası (u, v) → O + Y·u + Z·v
// Yan yatışta iç kenar yerinde kalır, dış kenar yükselir.
function cerceve(q, P) {
  const T = q.T;
  const L = q.L;
  const U = new THREE.Vector3().crossVectors(T, L).normalize();
  const a = -P.yon * q.b;
  const Y = a ? L.clone().applyAxisAngle(T, a) : L.clone();
  const Z = a ? U.clone().applyAxisAngle(T, a) : U;
  const uP = (P.yon * P.W) / 2;
  const O = new THREE.Vector3(q.x, q.y, q.z).addScaledVector(L, uP).addScaledVector(Y, -uP);
  return { O, T, Y, Z };
}

// ---------------------------------------------------------------- GEOMETRİ
function isaretliHacim(g) {
  const p = g.attributes.position.array;
  const ix = g.index ? g.index.array : null;
  const n = ix ? ix.length : p.length / 3;
  let v = 0;
  for (let i = 0; i < n; i += 3) {
    const a = (ix ? ix[i] : i) * 3;
    const b = (ix ? ix[i + 1] : i + 1) * 3;
    const c = (ix ? ix[i + 2] : i + 2) * 3;
    v +=
      p[a] * (p[b + 1] * p[c + 2] - p[b + 2] * p[c + 1]) -
      p[a + 1] * (p[b] * p[c + 2] - p[b + 2] * p[c]) +
      p[a + 2] * (p[b] * p[c + 1] - p[b + 1] * p[c]);
  }
  return v / 6;
}

/** U kesit. k: virajın dış kenarına eklenen yükseklik (korkuluk) */
function profil(P, k = 0) {
  const a = P.W / 2;
  const H = P.t + P.duvar;
  // Sola dönen virajda dış kenar sağ (-u) taraftadır
  const hs = H + (P.yon > 0 ? k : 0);
  const hl = H + (P.yon > 0 ? 0 : k);
  return [
    [-a, 0], [a, 0], [a, hl], [a - P.w, hl],
    [a - P.w, P.t], [-a + P.w, P.t], [-a + P.w, hs], [-a, hs],
  ];
}

/** Gövde: profilin yol boyunca süpürülmesi (kapalı katı) */
function supurme(P, Y0) {
  const pr = profil(P);
  const n = pr.length;
  const N = Math.max(16, Math.ceil(Y0.Lb / 2.5));
  const pos = [];
  for (let i = 0; i <= N; i++) {
    const q = Y0.govde(i / N);
    const f = cerceve(q, P);
    for (const [u, v] of q.k ? profil(P, q.k) : pr) {
      const p = f.O.clone().addScaledVector(f.Y, u).addScaledVector(f.Z, v);
      pos.push(p.x, p.y, p.z);
    }
  }
  const idx = [];
  for (let i = 0; i < N; i++) {
    for (let k = 0; k < n; k++) {
      const a = i * n + k;
      const b = i * n + ((k + 1) % n);
      const c = (i + 1) * n + ((k + 1) % n);
      const d = (i + 1) * n + k;
      idx.push(a, b, c, a, c, d);
    }
  }
  const tri = THREE.ShapeUtils.triangulateShape(pr.map(([u, v]) => new THREE.Vector2(u, v)), []);
  for (const [a, b, c] of tri) {
    idx.push(a, c, b);
    idx.push(N * n + a, N * n + b, N * n + c);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  if (isaretliHacim(g) < 0) {
    const ix = g.index.array;
    for (let i = 0; i < ix.length; i += 3) [ix[i + 1], ix[i + 2]] = [ix[i + 2], ix[i + 1]];
  }
  return g.toNonIndexed();
}

/**
 * Bağlantı ucu, yerel düzlemde: x uçtan içeri (0..LZ), y yanlara.
 * hw: orijinal yollardaki gibi uçta yarım daire oyuk + delik (iki uç aynı).
 * geçme: A ucunda kırlangıç dili, B ucunda aynı dilin yuvası.
 */
function ucGeometri(P, erkek) {
  const a = P.W / 2;
  const s = new THREE.Shape();
  s.moveTo(0, -a);
  s.lineTo(LZ, -a);
  s.lineTo(LZ, a);
  s.lineTo(0, a);
  if (P.baglanti === "hw") {
    const rn = 4.5;
    s.lineTo(0, rn);
    s.absarc(0, 0, rn, Math.PI / 2, -Math.PI / 2, true);
    s.lineTo(0, -a);
    const d = new THREE.Path();
    d.absarc(9.5, 0, P.delik / 2, 0, Math.PI * 2, false);
    s.holes.push(d);
  } else {
    const boyun = 8, genis = 12, boy = 8, t = P.tol;
    if (erkek) {
      s.lineTo(0, boyun / 2);
      s.lineTo(-boy, genis / 2);
      s.lineTo(-boy, -genis / 2);
      s.lineTo(0, -boyun / 2);
    } else {
      s.lineTo(0, boyun / 2 + t);
      s.lineTo(boy + t, genis / 2 + t);
      s.lineTo(boy + t, -genis / 2 - t);
      s.lineTo(0, -boyun / 2 - t);
    }
    s.lineTo(0, -a);
  }
  const parcalar = [new THREE.ExtrudeGeometry(s, { depth: P.t, bevelEnabled: false, curveSegments: 20 })];
  for (const yan of [-1, 1]) {
    const k = new THREE.BoxGeometry(LZ, P.w, P.duvar);
    k.translate(LZ / 2, yan * (a - P.w / 2), P.t + P.duvar / 2);
    parcalar.push(k);
  }
  return parcalar;
}

/**
 * Bağlantı parçası ("Orijinal uyumlu" uçlar için). İki parçanın uçları
 * karşı karşıya gelince yarım yuvaları tam bir daire, delikleri eklemden
 * ±9.5 mm uzakta iki delik olur. Bu parça iki ucun altına girer: ortadaki
 * pul daireye, iki pim deliklere oturur ve parçaları kilitler.
 * Eklem merkezde, X yol yönünde; plaka z<0, pul ve pimler yol tabanıyla aynı
 * yükseklikte biter (araba takılmaz). Baskıda plaka tablaya oturur, destek yok.
 */
const BAGLAYICI = { kal: 1.6, ara: 9.5, boy: 27, en: 13, kose: 3 };
function baglayiciGeo(O) {
  const { kal, ara, boy, en, kose } = BAGLAYICI;
  const x = boy / 2 - kose, y = en / 2 - kose;
  const s = new THREE.Shape();
  s.moveTo(-x, -en / 2);
  s.lineTo(x, -en / 2);
  s.absarc(x, -y, kose, -Math.PI / 2, 0, false);
  s.lineTo(boy / 2, y);
  s.absarc(x, y, kose, 0, Math.PI / 2, false);
  s.lineTo(-x, en / 2);
  s.absarc(-x, y, kose, Math.PI / 2, Math.PI, false);
  s.lineTo(-boy / 2, -y);
  s.absarc(-x, -y, kose, Math.PI, Math.PI * 1.5, false);
  const plaka = new THREE.ExtrudeGeometry(s, { depth: kal, bevelEnabled: false, curveSegments: 8 });
  plaka.translate(0, 0, -kal);
  const rPul = 4.5 - O.tol;
  const pul = new THREE.CylinderGeometry(rPul, rPul, O.t, 40);
  pul.rotateX(Math.PI / 2);
  pul.translate(0, 0, O.t / 2);
  const parcalar = [plaka, pul];
  const r = Math.max(0.8, O.delik / 2 - O.tol);
  for (const u of [-ara, ara]) {
    const pim = new THREE.CylinderGeometry(r * 0.82, r, O.t, 24); // ucu daralır, kolay girer
    pim.rotateX(Math.PI / 2);
    pim.translate(u, 0, O.t / 2);
    parcalar.push(pim);
  }
  return parcalar;
}

/**
 * Yerden yükselen noktaların altına ayak + taban pabucu.
 * z0: parçanın yolda başladığı yükseklik (önceki parçalar yükselttiyse).
 * Parça geometrisi z0 kadar kaldırılmış kabul edilir; ayaklar z=0'a iner.
 */
function ayaklar(P, Y0, z0 = 0) {
  const g = [];
  if (!P.ayak || P.tip === "looping") return g;
  const a = P.W / 2 - 4;
  const say = Math.max(1, Math.round(Y0.Lt / 45));
  for (let k = 0; k <= say; k++) {
    const s = clamp((k * Y0.Lt) / say, 6, Y0.Lt - 6);
    const q = Y0.nokta(s);
    const f = cerceve(q, P);
    for (const u of [-a, a]) {
      const p = f.O.clone().addScaledVector(f.Y, u);
      const h = p.z + z0;
      if (h < 2.5) continue;
      const bacak = new THREE.BoxGeometry(3.2, 3.2, h + 0.2);
      bacak.translate(0, 0, (h + 0.2) / 2);
      const pabuc = new THREE.BoxGeometry(10, 10, 1.2);
      pabuc.translate(0, 0, 0.6);
      const m = new THREE.Matrix4().makeRotationZ(q.h).setPosition(p.x, p.y, 0);
      bacak.applyMatrix4(m);
      pabuc.applyMatrix4(m);
      g.push(bacak, pabuc);
    }
  }
  return g;
}

// ---------------------------------------------------------------- SAHNE
const tuval = el("hw-tuval");
const sahneKutu = document.querySelector(".hw-sahne");
const renderer = new THREE.WebGLRenderer({ canvas: tuval, antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

const sahne = new THREE.Scene();
const kamera = new THREE.PerspectiveCamera(35, 1, 1, 6000);
kamera.up.set(0, 0, 1);
const kontrol = new OrbitControls(kamera, tuval);
kontrol.enableDamping = true;
kontrol.dampingFactor = 0.12;
kontrol.zoomToCursor = true;
kontrol.maxPolarAngle = Math.PI * 0.49; // zeminin altına inilmesin

sahne.add(new THREE.HemisphereLight(0xffffff, 0x9a9488, 1.5));
const gunes = new THREE.DirectionalLight(0xffffff, 1.9);
gunes.castShadow = true;
gunes.shadow.mapSize.set(2048, 2048);
gunes.shadow.bias = -0.0005;
sahne.add(gunes);
sahne.add(gunes.target);

const zemin = new THREE.Mesh(new THREE.PlaneGeometry(4000, 4000), new THREE.ShadowMaterial({ opacity: 0.16 }));
zemin.receiveShadow = true;
zemin.position.z = -0.05;
sahne.add(zemin);
const izgara = new THREE.GridHelper(1000, 100);
izgara.rotation.x = Math.PI / 2;
izgara.position.z = -0.1;
izgara.material.transparent = true;
izgara.material.opacity = 0.35;
sahne.add(izgara);

const malzeme = new THREE.MeshStandardMaterial({ color: RENK.turuncu, roughness: 0.55, metalness: 0.0, flatShading: false });
const kenarMalzeme = new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.22 });
const yolGrup = new THREE.Group();
sahne.add(yolGrup);

// Oyuncak araba: yolun nasıl kullanılacağını gösterir (çıktıya girmez).
// Yarış prototipi: alçak gövde, tekerlek çamurlukları, kubbe kokpit,
// arka kanat, ön splitter. Birim mm, +X ileri, Z yukarı; gövde
// Hot Wheels (1:64) arabası boyunda ölçeklenir: ≈73 mm boy, 32 mm en,
// 22 mm yükseklik (kanat dâhil), Ø11.7 mm tekerlek.
const ARABA_OLCEK = 1.95; // boy ve yükseklik (tekerlek yuvarlak kalsın diye ikisi aynı)
const ARABA_EN = 1.75; // en: kanat plakalarıyla 32 mm, yolun iç genişliğine sığar
const TEKER_R = 3.0;
const ARABA_YARI = 19.4 * ARABA_OLCEK; // burundan merkeze
const LIVERY = {
  mavi: { govde: 0x1638c9, serit: 0xf4f2ec, vurgu: 0xff4a1c },
  kirmizi: { govde: 0xd61f1f, serit: 0xf4f2ec, vurgu: 0x15161a },
};

function arabaYap() {
  const g = new THREE.Group();
  const pm = new THREE.PMREMGenerator(renderer);
  const ortam = pm.fromScene(new RoomEnvironment(), 0.04).texture;
  pm.dispose();
  const yansi = { envMap: ortam, envMapIntensity: 0.9 };
  const boya = new THREE.MeshPhysicalMaterial({ color: LIVERY.mavi.govde, metalness: 0.25, roughness: 0.32, clearcoat: 1, clearcoatRoughness: 0.06, ...yansi });
  const serit = new THREE.MeshPhysicalMaterial({ color: LIVERY.mavi.serit, metalness: 0.1, roughness: 0.35, clearcoat: 1, clearcoatRoughness: 0.08, ...yansi });
  const vurgu = new THREE.MeshPhysicalMaterial({ color: LIVERY.mavi.vurgu, metalness: 0.2, roughness: 0.35, clearcoat: 1, ...yansi });
  const karbon = new THREE.MeshStandardMaterial({ color: 0x15161a, metalness: 0.4, roughness: 0.45, ...yansi });
  const cam = new THREE.MeshPhysicalMaterial({ color: 0x0f1724, metalness: 0.3, roughness: 0.04, clearcoat: 1, ...yansi });
  const lastik = new THREE.MeshStandardMaterial({ color: 0x141416, roughness: 0.9 });
  const jant = new THREE.MeshStandardMaterial({ color: 0x2a2d33, metalness: 0.9, roughness: 0.28, ...yansi });
  const kol = new THREE.MeshStandardMaterial({ color: 0xd9dde2, metalness: 1, roughness: 0.2, ...yansi });
  const far = new THREE.MeshStandardMaterial({ color: 0xffffff, emissive: 0xfff1c9, emissiveIntensity: 1.6 });
  const stop = new THREE.MeshStandardMaterial({ color: 0xff2a1a, emissive: 0xff1a0a, emissiveIntensity: 1.4 });

  // Yan profil (x, z) Y boyunca kalınlık kadar çekilir, y merkezine konur
  const cek = (sekil, kalinlik, pah, y) => {
    const geo = new THREE.ExtrudeGeometry(sekil, {
      depth: kalinlik, bevelEnabled: pah > 0, bevelSize: pah, bevelThickness: pah, bevelSegments: 3, curveSegments: 18,
    });
    geo.rotateX(Math.PI / 2); // şekil Y'si → Z, çekim → -Y
    geo.translate(0, y + kalinlik / 2, 0);
    return geo;
  };
  const kemer = (s, cx) => {
    const r = 4, cz = TEKER_R, a = Math.asin((cz - 2) / r);
    s.absarc(cx, cz, r, Math.PI + a, -a, true);
  };

  // Orta gövde: burun, kokpit tabanı, motor kapağı
  const orta = new THREE.Shape();
  orta.moveTo(-16.4, 2.2);
  orta.lineTo(-14.6, 1.6);
  orta.lineTo(17.4, 1.5);
  orta.lineTo(18.8, 2.3);
  orta.quadraticCurveTo(15, 4.3, 8, 5.1);
  orta.lineTo(3, 5.5);
  orta.lineTo(-7, 6.1);
  orta.quadraticCurveTo(-12, 7.9, -16, 7.1);
  orta.lineTo(-16.4, 2.2);
  g.add(new THREE.Mesh(cek(orta, 7, 0.9, 0), boya));
  // İki beyaz yarış şeridi: aynı profil, gövdenin hemen üstünde
  for (const y of [-1.5, 1.5]) g.add(new THREE.Mesh(cek(orta, 1.1, 0.98, y), serit));

  // Yan çamurluklar: tekerlek kemerleri ve üstlerinde kabarık omuzlar
  const yan = new THREE.Shape();
  yan.moveTo(-16.4, 2);
  kemer(yan, -10.5);
  kemer(yan, 11);
  yan.lineTo(17.2, 2);
  yan.lineTo(17.6, 2.7);
  yan.lineTo(16.6, 4.6);
  yan.quadraticCurveTo(11.2, 10.6, 6, 5.6);
  yan.lineTo(-5.2, 5.8);
  yan.quadraticCurveTo(-10.5, 11, -15.8, 7.2);
  yan.lineTo(-16.6, 6.6);
  yan.lineTo(-16.4, 2);
  for (const s of [-1, 1]) {
    g.add(new THREE.Mesh(cek(yan, 2.8, 0.7, s * 6.2), boya));
    const giris = new THREE.Mesh(new THREE.BoxGeometry(5.5, 0.6, 1.6), karbon); // yan hava girişi
    giris.position.set(-3.2, s * 8.15, 4.6);
    g.add(giris);
  }

  // Kubbe kokpit
  const kubbe = new THREE.SphereGeometry(1, 32, 14, 0, Math.PI * 2, 0, Math.PI / 2);
  kubbe.rotateX(Math.PI / 2);
  const kokpit = new THREE.Mesh(kubbe, cam);
  kokpit.scale.set(8.6, 3.7, 3.4);
  kokpit.position.set(-1.4, 0, 5.4);
  g.add(kokpit);

  // Köpekbalığı yüzgeci: kokpitten kanada
  const yuzgec = new THREE.Shape();
  yuzgec.moveTo(-5, 7.6);
  yuzgec.lineTo(-15.6, 10.6);
  yuzgec.lineTo(-15.6, 6.8);
  yuzgec.lineTo(-5, 6.4);
  g.add(new THREE.Mesh(cek(yuzgec, 0.5, 0, 0), boya));

  // Arka kanat: iki ayak, ana kanat, renkli yan plakalar
  for (const y of [-2.6, 2.6]) {
    const ayak = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.5, 4.2), karbon);
    ayak.position.set(-14.8, y, 8.9);
    g.add(ayak);
  }
  const kanat = new THREE.Mesh(new THREE.BoxGeometry(4.4, 17.6, 0.6), karbon);
  kanat.position.set(-15.1, 0, 11.1);
  kanat.rotation.y = -0.14;
  g.add(kanat);
  for (const y of [-8.95, 8.95]) {
    const plaka = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.4, 4.2), vurgu);
    plaka.position.set(-15, y, 10);
    g.add(plaka);
  }

  // Ön splitter, arka difüzör, egzozlar, ışıklar
  const splitter = new THREE.Mesh(new THREE.BoxGeometry(3.6, 17.2, 0.5), karbon);
  splitter.position.set(17.6, 0, 1.15);
  const difuzor = new THREE.Mesh(new THREE.BoxGeometry(2.2, 11, 1.8), karbon);
  difuzor.position.set(-16.6, 0, 2.3);
  g.add(splitter, difuzor);
  for (const y of [-2.2, 2.2]) {
    const egzoz = new THREE.Mesh(new THREE.CylinderGeometry(0.6, 0.6, 1.6, 16), kol);
    egzoz.rotation.z = Math.PI / 2;
    egzoz.position.set(-17.1, y, 4.2);
    g.add(egzoz);
  }
  for (const y of [-6.2, 6.2]) {
    const f = new THREE.Mesh(new THREE.BoxGeometry(0.6, 2.4, 0.9), far);
    f.position.set(16.9, y, 4.1);
    f.rotation.y = -0.5;
    g.add(f);
  }
  const stopLamba = new THREE.Mesh(new THREE.BoxGeometry(0.4, 15, 0.6), stop);
  stopLamba.position.set(-17.15, 0, 6.6);
  g.add(stopLamba);

  // Yarış numarası: iki yanda yuvarlak çıkartma
  const t = document.createElement("canvas");
  t.width = t.height = 128;
  const c = t.getContext("2d");
  c.fillStyle = "#f4f2ec";
  c.beginPath();
  c.arc(64, 64, 60, 0, Math.PI * 2);
  c.fill();
  c.lineWidth = 6;
  c.strokeStyle = "#15161a";
  c.stroke();
  c.fillStyle = "#15161a";
  c.font = "italic 900 78px system-ui, sans-serif";
  c.textAlign = "center";
  c.textBaseline = "middle";
  c.fillText("7", 66, 70);
  const doku = new THREE.CanvasTexture(t);
  doku.colorSpace = THREE.SRGBColorSpace;
  doku.anisotropy = 4;
  const cikartma = new THREE.MeshStandardMaterial({ map: doku, transparent: true, roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -2 });
  for (const s of [-1, 1]) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(3.5, 3.5), cikartma);
    d.rotation.set(s * -Math.PI / 2, 0, 0);
    if (s < 0) d.rotateZ(Math.PI); // iki yandan da düz okunsun
    d.position.set(1.2, s * 8.4, 3.9);
    g.add(d);
  }

  // Tekerlekler: geniş lastik, koyu jant, beş kollu yüz; sürüşte yuvarlanır
  const tekerler = [];
  for (const x of [-10.5, 11]) {
    for (const s of [-1, 1]) {
      const tk = new THREE.Group();
      tk.position.set(x, s * 6.3, TEKER_R);
      tk.add(new THREE.Mesh(new THREE.CylinderGeometry(TEKER_R, TEKER_R, 3.2, 32), lastik));
      tk.add(new THREE.Mesh(new THREE.CylinderGeometry(2.05, 2.05, 3.26, 24), jant));
      for (let k = 0; k < 5; k++) {
        const a = (k / 5) * Math.PI * 2;
        const kolP = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.25, 1.85), kol);
        kolP.position.set(Math.sin(a) * 0.95, s * 1.66, Math.cos(a) * 0.95);
        kolP.rotation.y = a;
        tk.add(kolP);
      }
      tk.add(new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 3.5, 6), vurgu));
      tekerler.push(tk);
      g.add(tk);
    }
  }

  g.scale.set(ARABA_OLCEK, ARABA_EN, ARABA_OLCEK);
  g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  g.userData = { tekerler, boya, serit, vurgu, livery: "mavi" };
  return g;
}
const araba = arabaYap();
sahne.add(araba);

/** Yol rengine göre boya: turuncu/kırmızı/sarı yolda mavi, mavi/siyah/beyaz yolda kırmızı araba */
function arabaBoya(yolRengi) {
  const ad = ["mavi", "siyah", "beyaz"].includes(yolRengi) ? "kirmizi" : "mavi";
  const u = araba.userData;
  if (u.livery === ad) return;
  u.livery = ad;
  u.boya.color.setHex(LIVERY[ad].govde);
  u.serit.color.setHex(LIVERY[ad].serit);
  u.vurgu.color.setHex(LIVERY[ad].vurgu);
}

// ---------------------------------------------------------------- KURULUM
let YOLUM = [p()]; // parçaların ham değerleri, sırayla
let secili = 0; // formda düzenlenen parça
let SON = null; // son kurulan yol
let kirli = true;
let yenile = true;
let ortalaGerek = true;
let sonTip = null;
let surus = null;
let zincirImza = "";
let temaVurgu = "#5b34d6";

// Parça geometrileri, ayarları değişmedikçe yeniden kurulmaz; aynı ayarlı
// parçalar (dört köşe pistin düzleri) aynı geometriyi paylaşır.
const ONBELLEK = new Map();

const kenarSecili = new THREE.LineBasicMaterial({ color: 0x5b34d6, transparent: true, opacity: 0.95 });
const etiketGrup = new THREE.Group();
sahne.add(etiketGrup);
const isin = new THREE.Raycaster();
let GECMIS = []; // geri al: yolun önceki halleri
// ?vitrin: ürün görseli çekilirken parça numaraları ve seçim çizgisi çizilmez
const VITRIN = new URLSearchParams(location.search).has("vitrin");

// Eklemlerdeki bağlantı parçaları (yalnızca gösterim; ölçüye girmez)
const baglayiciGrup = new THREE.Group();
sahne.add(baglayiciGrup);
const baglayiciMalzeme = new THREE.MeshStandardMaterial({ color: 0x30343c, roughness: 0.5 });
let baglayici = { anahtar: "", geos: [], hacim: 0 };
function baglayiciHazirla(O) {
  const anahtar = [O.tol, O.t, O.delik].join("|");
  if (baglayici.anahtar === anahtar) return baglayici;
  for (const g of baglayici.geos) g.dispose();
  const geos = baglayiciGeo(O);
  baglayici = { anahtar, geos, hacim: geos.reduce((t, g) => t + Math.abs(isaretliHacim(g)), 0) };
  return baglayici;
}

/** Sahnede parçanın sıra numarası */
function numara(metin, renk) {
  const c = document.createElement("canvas");
  c.width = c.height = 96;
  const x = c.getContext("2d");
  x.fillStyle = renk;
  x.beginPath();
  x.arc(48, 48, 40, 0, Math.PI * 2);
  x.fill();
  x.lineWidth = 6;
  x.strokeStyle = "#ffffff";
  x.stroke();
  x.fillStyle = "#ffffff";
  x.font = "600 44px Geist, system-ui, sans-serif";
  x.textAlign = "center";
  x.textBaseline = "middle";
  x.fillText(metin, 48, 51);
  const tx = new THREE.CanvasTexture(c);
  tx.colorSpace = THREE.SRGBColorSpace;
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tx, depthTest: false, transparent: true }));
  s.renderOrder = 10;
  return s;
}

/** Tek parçanın katısı, kendi düzleminde (başı orijinde, +x'e bakar) */
function parcaKur(P, Y0, z0) {
  const g = [supurme(P, Y0), ...ucGeometri(P, true)];
  const B = ucGeometri(P, false);
  const E = new THREE.Vector3(Y0.son.x + LZ * Math.cos(Y0.son.h), Y0.son.y + LZ * Math.sin(Y0.son.h), Y0.ucZ);
  const c = Math.cos(Y0.son.h), s = Math.sin(Y0.son.h);
  const MB = new THREE.Matrix4().set(-c, s, 0, E.x, -s, -c, 0, E.y, 0, 0, 1, E.z, 0, 0, 0, 1);
  for (const b of B) b.applyMatrix4(MB);
  g.push(...B);
  if (Y0.looping) {
    // Looping ayakta durur: giriş ve çıkış şeritleri çemberin altında
    // bir taban plakasıyla birleşir.
    const { r, D, x0 } = Y0.looping;
    const y0 = Math.min(0, D) - P.W / 2, y1 = Math.max(0, D) + P.W / 2;
    const plaka = new THREE.BoxGeometry(r * 1.1, y1 - y0, P.t);
    plaka.translate(x0, (y0 + y1) / 2, P.t / 2);
    g.push(plaka);
  }
  // Yolda yüksekte başlayan parça kaldırılır, ayakları masaya iner
  if (z0) for (const x of g) x.translate(0, 0, z0);
  const ayak = ayaklar(P, Y0, z0);
  g.push(...ayak);

  let hacim = 0, ucgen = 0;
  const kenarlar = [];
  const kutu = new THREE.Box3();
  for (const x of g) {
    x.computeVertexNormals();
    x.computeBoundingBox();
    kutu.union(x.boundingBox);
    hacim += Math.abs(isaretliHacim(x));
    ucgen += (x.index ? x.index.count : x.attributes.position.count) / 3;
    kenarlar.push(new THREE.EdgesGeometry(x, 35));
  }
  const b = kutu.getSize(new THREE.Vector3());
  return { geos: g, kenarlar, hacim, ucgen, ayakSayisi: ayak.length / 2, olcu: { x: yuvarla(b.x), y: yuvarla(b.y), z: yuvarla(b.z, 1) } };
}

/** Parçaları uç uca dizer: her parça bir öncekinin B ucundan başlar */
function yerlesim(Ps) {
  const Ys = Ps.map(yol);
  const poz = [];
  let x = 0, y = 0, z = 0, h = 0;
  for (const Y of Ys) {
    poz.push({ x, y, z, h });
    const ex = Y.son.x + LZ * Math.cos(Y.son.h);
    const ey = Y.son.y + LZ * Math.sin(Y.son.h);
    x += ex * Math.cos(h) - ey * Math.sin(h);
    y += ex * Math.sin(h) + ey * Math.cos(h);
    z += Y.ucZ;
    h += Y.son.h;
  }
  const bitis = { x, y, z, h };
  // Yükseklik parça içinde tekdüze değişir; uçların en alçağı masaya oturur
  const zmin = Math.min(z, ...poz.map((q) => q.z));
  for (const q of poz) q.z -= zmin;
  bitis.z -= zmin;
  return { Ys, poz, bitis };
}

const _M = new THREE.Matrix4(), _B = new THREE.Matrix4(), _S = new THREE.Vector3();
/** Arabanın durduğu ilk nokta: arka tamponu yolun başında */
function arabaBas() {
  return SON ? Math.min(ARABA_YARI, SON.toplamLt / 2) : ARABA_YARI;
}

/** Arabayı yolun başından s mm ilerideki noktaya koyar; tekerlekler yol kadar döner */
function arabayiKoy(s) {
  if (!SON) return;
  const don = s / (TEKER_R * ARABA_OLCEK);
  for (const t of araba.userData.tekerler) t.rotation.y = don;
  let i = 0;
  while (i < SON.n - 1 && s > SON.parcalar[i].Y0.Lt) {
    s -= SON.parcalar[i].Y0.Lt;
    i++;
  }
  const { P, Y0, z0, M } = SON.parcalar[i];
  const q = Y0.nokta(clamp(s, 0, Y0.Lt));
  const f = cerceve(q, P);
  const o = f.O.clone().addScaledVector(f.Z, P.t);
  _B.makeBasis(f.T, f.Y, f.Z).setPosition(o.x, o.y, o.z + z0);
  _M.multiplyMatrices(M, _B).decompose(araba.position, araba.quaternion, _S);
  kirli = true;
}

function kur() {
  YOLUM[secili] = ham();
  const O = ortak();
  const Ps = YOLUM.map((h) => turet(h, O));
  const { Ys, poz, bitis } = yerlesim(Ps);
  const n = Ps.length;
  gorunurlugGuncelle(Ps[secili], poz[secili].z);

  yolGrup.clear();
  for (const s of etiketGrup.children) {
    s.material.map.dispose();
    s.material.dispose();
  }
  etiketGrup.clear();

  const kullanilan = new Set();
  const parcalar = [];
  for (let i = 0; i < n; i++) {
    const P = Ps[i], Y0 = Ys[i], q = poz[i];
    const z0 = yuvarla(q.z, 2);
    const anahtar = JSON.stringify({ ...P, renk: 0 }) + "|" + z0;
    let k = ONBELLEK.get(anahtar);
    if (!k) {
      k = parcaKur(P, Y0, z0);
      ONBELLEK.set(anahtar, k);
    }
    kullanilan.add(anahtar);

    const grup = new THREE.Group();
    grup.rotation.z = q.h;
    grup.position.set(q.x, q.y, 0);
    grup.updateMatrix();
    const vurgulu = n > 1 && i === secili && !VITRIN;
    k.geos.forEach((g, j) => {
      const m = new THREE.Mesh(g, malzeme);
      m.castShadow = true;
      m.receiveShadow = true;
      m.userData.parca = i;
      grup.add(m);
      grup.add(new THREE.LineSegments(k.kenarlar[j], vurgulu ? kenarSecili : kenarMalzeme));
    });
    yolGrup.add(grup);
    parcalar.push({ P, Y0, z0, M: grup.matrix.clone(), ...k });

    if (n > 1 && !VITRIN) {
      const orta = Y0.nokta(Y0.Lt / 2);
      const etiket = numara(String(i + 1), i === secili ? temaVurgu : "#171717");
      etiket.position.set(orta.x, orta.y, orta.z + z0 + P.t + P.duvar + 16).applyMatrix4(grup.matrix);
      etiket.userData.parca = i;
      etiketGrup.add(etiket);
    }
  }
  for (const [a, k] of ONBELLEK) {
    if (kullanilan.has(a)) continue;
    for (const g of k.geos) g.dispose();
    for (const g of k.kenarlar) g.dispose();
    ONBELLEK.delete(a);
  }

  malzeme.color.setHex(RENK[O.renk] ?? RENK.turuncu);
  arabaBoya(O.renk);
  const kutu = new THREE.Box3().setFromObject(yolGrup);
  const boy = kutu.getSize(new THREE.Vector3());
  const olcu = { x: yuvarla(boy.x), y: yuvarla(boy.y), z: yuvarla(boy.z, 1) };
  const etiketBoy = clamp(boy.length() * 0.035, 14, 42);
  for (const s of etiketGrup.children) s.scale.setScalar(etiketBoy);

  const hacim = parcalar.reduce((t, x) => t + x.hacim, 0);
  const ucgen = parcalar.reduce((t, x) => t + x.ucgen, 0);
  const toplamLt = parcalar.reduce((t, x) => t + x.Y0.Lt, 0);
  const kapali =
    n > 1 &&
    Math.hypot(bitis.x, bitis.y) < 1.5 &&
    Math.abs(bitis.z - poz[0].z) < 0.5 &&
    Math.cos(bitis.h) > 0.9998;

  // Bağlantı parçaları: her eklem için bir tane (kapalı pistte başla son da
  // birleşir) + yedek. Geçmeli uçta gerekmez.
  baglayiciGrup.clear();
  const hwUc = O.baglanti === "hw";
  const eklemler = hwUc ? [...poz.slice(1, n), ...(kapali ? [poz[0]] : [])] : [];
  const bAcik = hwUc && el("hw-baglayici").checked;
  const yedek = Math.round(clamp(sayi("hw-yedek", 2), 0, 6));
  const bag = { adet: bAcik ? eklemler.length + yedek : 0, eklem: eklemler.length, yedek: bAcik ? yedek : 0, hacim: 0 };
  if (hwUc) {
    const b = baglayiciHazirla(O);
    bag.tekHacim = b.hacim;
    bag.hacim = b.hacim * bag.adet;
    baglayiciMalzeme.color.setHex(O.renk === "siyah" ? 0xd4d7dd : 0x30343c);
    for (const q of eklemler) {
      const kap = new THREE.Group();
      kap.rotation.z = q.h;
      kap.position.set(q.x, q.y, q.z);
      for (const g of b.geos) {
        const m = new THREE.Mesh(g, baglayiciMalzeme);
        m.castShadow = true;
        kap.add(m);
      }
      baglayiciGrup.add(kap);
    }
  }
  const kutleG = ((hacim + bag.hacim) / 1000) * PLA;
  const sureSaat = (hacim + bag.hacim) / AKIS / 3600 + 0.2 * n + (bag.adet ? 0.15 : 0);
  SON = { Ps, poz, parcalar, n, hacim, olcu, kutleG, sureSaat, ucgen, kutu, toplamLt, kapali, bag };

  zincirCiz();
  bilgiYaz();
  isikKur(kutu);
  const tip = Ps[secili].tip;
  if (ortalaGerek || (n === 1 && sonTip !== null && sonTip !== tip)) ortala();
  ortalaGerek = false;
  sonTip = tip;
  if (!surus) arabayiKoy(arabaBas());

  window.__ADJY_HW = {
    hazir: true,
    olcum: { kutleG, sureSaat },
    olcu: `${olcu.x} × ${olcu.y}${olcu.z > 3 ? " × " + olcu.z : ""} mm`,
    n,
    duzen: `${n} parça${kapali ? " · kapalı pist" : ""}`,
    parcalar: Ps.map(tarif),
    baglayici: bag.adet,
    baglayiciDetay: bag.adet ? `${bag.adet} adet (${bag.eklem} eklem + ${bag.yedek} yedek)` : "",
    durum: yolDurumu,
    yaz: yolYaz,
  };
  kirli = true;
}

function isikKur(kutu) {
  const c = kutu.getCenter(new THREE.Vector3());
  const r = Math.max(120, kutu.getSize(new THREE.Vector3()).length());
  gunes.position.set(c.x - r * 0.5, c.y - r * 0.8, c.z + r * 1.2);
  gunes.target.position.copy(c);
  const sc = gunes.shadow.camera;
  sc.left = -r; sc.right = r; sc.top = r; sc.bottom = -r; sc.near = 1; sc.far = r * 4;
  sc.updateProjectionMatrix();
}

function ortala() {
  if (!SON) return;
  const c = SON.kutu.getCenter(new THREE.Vector3());
  const r = Math.max(60, SON.kutu.getSize(new THREE.Vector3()).length() * 0.5);
  const asp = Math.max(0.6, kamera.aspect);
  const d = (r / Math.sin(THREE.MathUtils.degToRad(kamera.fov / 2))) * (asp < 1 ? 1.25 / asp : 1.05);
  const yon = new THREE.Vector3(-0.45, -0.85, 0.62).normalize();
  kamera.position.copy(c).addScaledVector(yon, d);
  kontrol.target.copy(c);
  kamera.near = Math.max(0.5, d / 100);
  kamera.far = d * 20;
  kamera.updateProjectionMatrix();
  kontrol.update();
  kirli = true;
}

function tablaTasar(x) {
  return Math.max(x.olcu.x, x.olcu.y) > TABLA || (x.P.tip === "looping" && x.olcu.z > TABLA);
}

function bilgiYaz() {
  const S = SON;
  const buyukler = S.parcalar.map((x, i) => (tablaTasar(x) ? i + 1 : 0)).filter(Boolean);
  const havada = S.parcalar.map((x, i) => (x.P.tip === "looping" && x.z0 > 0.5 ? i + 1 : 0)).filter(Boolean);
  el("hw-olcu").textContent =
    `${S.olcu.x} × ${S.olcu.y} mm${S.olcu.z > 3 ? ` · ${S.olcu.z} mm yükseklik` : ""}` +
    (S.n > 1 ? ` · ${S.n} parça${S.kapali ? ", kapalı" : ""}` : "");

  const uyarilar = [];
  if (buyukler.length) {
    uyarilar.push(S.n > 1 ? `${buyukler.join(", ")}. parça büyük: üretimde ikiye bölünür` : "Büyük parça: üretimde ikiye bölünüp birleştirilir");
  }
  if (havada.length) uyarilar.push(`${havada.join(", ")}. parça (looping) masada durmalı: önüne iniş ekleyin`);
  const uyari = el("hw-uyari");
  uyari.hidden = !uyarilar.length;
  uyari.textContent = uyarilar.join(" · ");

  const tipAd = { viraj: "Viraj", duz: "Düz", rampa: "Rampa", looping: "Looping" };
  const satirlar = [
    S.n > 1 ? ["Parça sayısı", `${S.n}${S.kapali ? " · kapalı pist" : ""}`] : ["Parça", tipAd[S.Ps[0].tip]],
    ["Yol uzunluğu", `${yuvarla(S.toplamLt)} mm`],
    [S.n > 1 ? "Yerleşim ölçüsü" : "Dış ölçü", `${S.olcu.x} × ${S.olcu.y} × ${S.olcu.z} mm`],
    ["Hacim", `${(S.hacim / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${Math.round(S.kutleG)} g`],
    ["Baskı süresi ≈", `${Math.floor(S.sureSaat)} sa ${Math.round((S.sureSaat % 1) * 60)} dk`],
    ["Üçgen", String(Math.round(S.ucgen))],
    ["Tabla (256 mm)", buyukler.length ? `Sığmıyor: ${S.n > 1 ? buyukler.join(", ") + ". parça" : "dilimleyicide kesin"}` : S.n > 1 ? "Hepsi sığıyor" : "Sığıyor"],
  ];
  if (S.n > 1) {
    S.parcalar.forEach((x, i) => {
      satirlar.push([`${i + 1}. ${kisaAd(x.P)}`, `${Math.round((x.hacim / 1000) * PLA)} g · ${x.olcu.x}×${x.olcu.y}${x.olcu.z > 15 ? "×" + Math.round(x.olcu.z) : ""}`]);
    });
  }
  const B = S.bag;
  if (B.adet) satirlar.push(["Bağlantı parçası", `${B.adet} adet · ${((B.hacim / 1000) * PLA).toFixed(1)} g · ${BAGLAYICI.boy}×${BAGLAYICI.en} mm`]);
  const hwUc = S.Ps[0].baglanti === "hw";
  el("hw-baglayici-not").textContent = !hwUc
    ? ""
    : B.adet
      ? `${B.adet} adet basılır: ${B.eklem ? `${B.eklem} eklem için ${B.eklem}` : "yolun içinde eklem yok"}${B.yedek ? `, ${B.yedek} yedek (yolun uçlarını başka yollara bağlamak için)` : ""}.`
      : `Basılmayacak. Yolunuzda ${B.eklem} eklem var; parçaları bağlamak için orijinal yolların bağlantı parçası gerekir.`;
  const bd = el("hw-baglayici-stl");
  bd.hidden = !hwUc;
  bd.disabled = !B.adet;
  bd.textContent = B.adet ? `Bağlantı parçaları (${B.adet} adet, STL)` : "Bağlantı parçaları (STL)";
  const t = el("hw-tablo");
  t.textContent = "";
  for (const [k, v] of satirlar) {
    const dt = document.createElement("dt");
    dt.textContent = k;
    const dd = document.createElement("dd");
    dd.textContent = v;
    t.append(dt, dd);
  }
  el("hw-stl").textContent = S.n > 1 ? `Yol parçaları (${S.n} STL, ZIP)` : "Yol parçası (STL)";
}

/** Yolum listesi: her parça bir düğme ve yanında sil; üstte seçili parça işlemleri */
function zincirCiz() {
  const S = SON;
  const n = S.n;
  // İşlem düğmeleri her kurulumda (geri al yığını imzaya girmez)
  const durum = {
    sola: secili > 0,
    saga: secili < n - 1,
    cogalt: n < EN_COK_PARCA,
    sil: n > 1,
    geri: GECMIS.length > 0,
    temizle: n > 1 || YOLUM[0]["hw-tip"] !== "duz",
  };
  document.querySelectorAll("[data-islem]").forEach((b) => { b.disabled = !durum[b.dataset.islem]; });
  document.querySelectorAll("[data-ekle]").forEach((b) => { b.disabled = n >= EN_COK_PARCA; });
  el("hw-sayac").textContent = `${n} / ${EN_COK_PARCA} parça · ${secili + 1}. parça seçili`;

  const imza = JSON.stringify([secili, S.kapali, S.Ps.map(kisaAd), S.Ps.map(tarif)]);
  if (imza === zincirImza) return;
  zincirImza = imza;
  const ol = el("hw-zincir");
  ol.textContent = "";
  S.Ps.forEach((P, i) => {
    const li = document.createElement("li");
    li.className = i === secili ? "on" : "";
    const b = document.createElement("button");
    b.type = "button";
    b.className = "hw-parca" + (i === secili ? " on" : "");
    b.dataset.parca = String(i);
    b.title = tarif(P);
    b.setAttribute("aria-pressed", i === secili ? "true" : "false");
    const no = document.createElement("i");
    no.textContent = String(i + 1);
    b.append(no, document.createTextNode(kisaAd(P)));
    li.append(b);
    if (n > 1) {
      const x = document.createElement("button");
      x.type = "button";
      x.className = "hw-sil";
      x.dataset.sil = String(i);
      x.title = `${i + 1}. parçayı sil`;
      x.setAttribute("aria-label", `${i + 1}. parçayı sil`);
      x.textContent = "×";
      li.append(x);
    }
    ol.append(li);
  });
  if (S.kapali) {
    const li = document.createElement("li");
    li.className = "hw-kapandi";
    li.textContent = "↺ başa bağlanır";
    ol.append(li);
  }
  el("hw-zincir-not").textContent =
    n > 1
      ? `${n} parça${S.kapali ? ", pist kapanıyor" : ""}. Bir parçaya (ya da modeldeki numarasına) dokunun; sonraki adımlar o parçayı değiştirir. × parçayı çıkarır, ← → sırasını değiştirir.`
      : "Şimdilik tek parça. Aşağıdan parça ekledikçe yol uzar; her yeni parça seçili parçanın ucuna takılır.";
}

// ---------------------------------------------------------------- ARAYÜZ
function gorunurlugGuncelle(P, z0 = 0) {
  // Parça tipine ait olmayan ayarlar gizlenir ve devre dışı kalır;
  // devre dışı alan sipariş özetine yazılmaz.
  document.querySelectorAll("[data-tip]").forEach((satir) => {
    const acik = satir.dataset.tip.split(" ").includes(P.tip);
    satir.hidden = !acik;
    satir.querySelectorAll("input, select").forEach((i) => { i.disabled = !acik; });
  });
  // Yükselmeyen parçada yükselme yönü sorulmaz
  const inisSatiri = document.querySelector("[data-inis-satiri]");
  if (!inisSatiri.hidden && Math.abs(P.rise) < 0.01) {
    inisSatiri.hidden = true;
    el("hw-inis").disabled = true;
  }
  // Bağlantı parçası yalnızca orijinal uyumlu uçta; işaret kalkınca yedek sorulmaz
  const bagSatiri = document.querySelector("[data-baglayici-satiri]");
  const hwUc = el("hw-baglanti").value === "hw";
  bagSatiri.hidden = !hwUc;
  el("hw-baglayici").disabled = !hwUc;
  const yedekAcik = hwUc && el("hw-baglayici").checked;
  for (const e of [el("hw-yedek"), document.querySelector('[data-bagli="hw-yedek"]')]) e.disabled = !yedekAcik;
  bagSatiri.querySelectorAll('label[for="hw-yedek"], .hw-kaydir').forEach((e) => { e.style.display = yedekAcik ? "" : "none"; });

  const ayakSatiri = document.querySelector("[data-ayak-satiri]");
  const ayakGerekli = P.tip !== "looping" && (P.rise !== 0 || P.egim > 0 || z0 > 0.5);
  ayakSatiri.hidden = !ayakGerekli;
  el("hw-ayak").disabled = !ayakGerekli;

  // Rampa çok dik olmasın: yükselme gövde uzunluğunun %45'ini geçmez
  const yk = el("hw-yukselme");
  const enCok = P.tip === "rampa" ? Math.max(0, Math.floor((0.45 * (P.L - 2 * LZ)) / 2) * 2) : 80;
  yk.max = String(enCok);
  const ykSayi = document.querySelector('[data-bagli="hw-yukselme"]');
  if (ykSayi) ykSayi.max = String(enCok);
  if (parseFloat(yk.value) > enCok) {
    yk.value = String(enCok);
    if (ykSayi) ykSayi.value = String(enCok);
  }
}

function secimleriBoya() {
  document.querySelectorAll("[data-secim]").forEach((kap) => {
    const s = el(kap.dataset.secim);
    kap.querySelectorAll("button[data-v]").forEach((b) => b.classList.toggle("on", b.dataset.v === s.value));
  });
}

function yaz(id, v) {
  const e = el(id);
  if (!e) return;
  if (e.type === "checkbox") e.checked = !!v;
  else e.value = String(v);
  e.dispatchEvent(new Event("input", { bubbles: true }));
  e.dispatchEvent(new Event("change", { bubbles: true }));
}

/** Bir parçanın değerlerini forma koyar (olay yaymadan) */
function parcaYaz(h) {
  // Önceki rampanın yükselme sınırı yeni parçanın değerini kırpmasın
  for (const s of [el("hw-yukselme"), document.querySelector('[data-bagli="hw-yukselme"]')]) if (s) s.max = "80";
  for (const id of PARCA_ALAN) {
    const e = el(id);
    const v = h[id] ?? VARSAYILAN[id];
    if (e.type === "checkbox") e.checked = v === true || v === "true";
    else e.value = String(v);
    const n = document.querySelector(`[data-bagli="${id}"]`);
    if (n) n.value = e.value;
  }
  secimleriBoya();
  yenile = true;
}

function secParca(i) {
  i = clamp(i, 0, YOLUM.length - 1);
  if (i === secili) return;
  YOLUM[secili] = ham();
  secili = i;
  parcaYaz(YOLUM[i]);
}

const EKLE = {
  duz: p({ tip: "duz", uzunluk: 150 }),
  sol: p({ tip: "viraj", aci: 90 }),
  sag: p({ tip: "viraj", aci: 90, yon: "sag" }),
  rampa: p({ tip: "rampa", uzunluk: 200, yukselme: 30 }),
  inis: p({ tip: "rampa", uzunluk: 200, yukselme: 30, inis: "in" }),
  looping: p({ tip: "looping", cap: 200 }),
};

// Geri al: her yapı değişikliğinden önce yolun bir kopyası saklanır
function kaydet() {
  YOLUM[secili] = ham();
  GECMIS.push({ yol: YOLUM.map((h) => ({ ...h })), secili, duvar: el("hw-duvar").value });
  if (GECMIS.length > 40) GECMIS.shift();
}
function geriAl() {
  const s = GECMIS.pop();
  if (!s) return;
  YOLUM = s.yol;
  secili = clamp(s.secili, 0, YOLUM.length - 1);
  parcaYaz(YOLUM[secili]);
  if (el("hw-duvar").value !== s.duvar) yaz("hw-duvar", s.duvar);
  sonra();
}
/** Yapı değişti: model yeniden kurulup ortalanır, hazır yol işareti kalkar */
function sonra() {
  zincirImza = "";
  ortalaGerek = true;
  yenile = true;
  hazirYolIsaretle(null);
}

function parcaEkle(tur) {
  if (!EKLE[tur] || YOLUM.length >= EN_COK_PARCA) return;
  kaydet();
  const yeni = { ...EKLE[tur] };
  YOLUM.splice(secili + 1, 0, yeni);
  secili += 1;
  parcaYaz(yeni);
  sonra();
}

function parcaSil(i) {
  if (YOLUM.length < 2 || i < 0 || i >= YOLUM.length) return;
  kaydet();
  YOLUM.splice(i, 1);
  if (i < secili || secili >= YOLUM.length) secili = Math.max(0, secili - 1);
  parcaYaz(YOLUM[secili]);
  sonra();
}

function parcaTasi(yon) {
  const j = secili + yon;
  if (j < 0 || j >= YOLUM.length) return;
  kaydet();
  [YOLUM[secili], YOLUM[j]] = [YOLUM[j], YOLUM[secili]];
  secili = j;
  parcaYaz(YOLUM[secili]);
  sonra();
}

function parcaCogalt() {
  if (YOLUM.length >= EN_COK_PARCA) return;
  kaydet();
  const kopya = { ...YOLUM[secili] };
  YOLUM.splice(secili + 1, 0, kopya);
  secili += 1;
  parcaYaz(kopya);
  sonra();
}

function yoluTemizle() {
  kaydet();
  YOLUM = [{ ...EKLE.duz }];
  secili = 0;
  parcaYaz(YOLUM[0]);
  sonra();
}

const ISLEM = {
  sola: () => parcaTasi(-1),
  saga: () => parcaTasi(1),
  cogalt: parcaCogalt,
  sil: () => parcaSil(secili),
  geri: geriAl,
  temizle: yoluTemizle,
};

// Hazır parça: seçili parçaya uygulanır
const HAZIR = {
  klasik: { "hw-tip": "viraj", "hw-yaricap": 120, "hw-aci": 90, "hw-egim": 0, "hw-korkuluk": 0, "hw-yukselme": 0, "hw-duvar": 7 },
  korkuluklu: { "hw-tip": "viraj", "hw-yaricap": 130, "hw-aci": 90, "hw-egim": 0, "hw-korkuluk": 10, "hw-yukselme": 0, "hw-duvar": 7 },
  egimli: { "hw-tip": "viraj", "hw-yaricap": 120, "hw-aci": 90, "hw-egim": 20, "hw-korkuluk": 0, "hw-yukselme": 0, "hw-duvar": 11 },
  u: { "hw-tip": "viraj", "hw-yaricap": 100, "hw-aci": 180, "hw-egim": 15, "hw-korkuluk": 0, "hw-yukselme": 0, "hw-duvar": 11 },
  duz: { "hw-tip": "duz", "hw-uzunluk": 200, "hw-duvar": 7 },
  rampa: { "hw-tip": "rampa", "hw-uzunluk": 220, "hw-yukselme": 40, "hw-inis": "cik", "hw-duvar": 7 },
  sarmal: { "hw-tip": "viraj", "hw-yaricap": 110, "hw-aci": 180, "hw-egim": 10, "hw-korkuluk": 0, "hw-yukselme": 40, "hw-inis": "cik", "hw-duvar": 11 },
  looping: { "hw-tip": "looping", "hw-cap": 200, "hw-duvar": 11 },
};

// Hazır yol: bütün yolu değiştirir. Kapalı pistler kendi üstüne kapanır.
const YOLLAR = {
  bos: { duvar: 7, parcalar: [p({ tip: "duz", uzunluk: 150 })] },
  tek: { duvar: 7, parcalar: [p({ tip: "viraj", yaricap: 120, aci: 90 })] },
  s: {
    duvar: 7,
    parcalar: [p({ tip: "viraj", yaricap: 120, aci: 90 }), p({ tip: "viraj", yaricap: 120, aci: 90, yon: "sag" })],
  },
  oval: {
    duvar: 11,
    parcalar: [
      p({ tip: "duz", uzunluk: 200 }),
      p({ tip: "viraj", yaricap: 100, aci: 180, egim: 15 }),
      p({ tip: "duz", uzunluk: 200 }),
      p({ tip: "viraj", yaricap: 100, aci: 180, egim: 15 }),
    ],
  },
  kare: {
    duvar: 7,
    parcalar: [0, 1, 2, 3].flatMap(() => [p({ tip: "duz", uzunluk: 150 }), p({ tip: "viraj", yaricap: 100, aci: 90, korkuluk: 8 })]),
  },
  tepe: {
    duvar: 7,
    parcalar: [
      p({ tip: "rampa", uzunluk: 220, yukselme: 40 }),
      p({ tip: "duz", uzunluk: 150 }),
      p({ tip: "rampa", uzunluk: 220, yukselme: 40, inis: "in" }),
    ],
  },
  looping: {
    duvar: 11,
    parcalar: [
      p({ tip: "rampa", uzunluk: 240, yukselme: 60, inis: "in" }),
      p({ tip: "duz", uzunluk: 150 }),
      p({ tip: "looping", cap: 200 }),
      p({ tip: "duz", uzunluk: 150 }),
    ],
  },
};

function hazirYolIsaretle(ad) {
  document.querySelectorAll("[data-yol]").forEach((b) => b.classList.toggle("on", b.dataset.yol === ad));
}

function hazirYol(ad) {
  const y = YOLLAR[ad];
  if (!y) return;
  kaydet();
  zincirImza = "";
  YOLUM = y.parcalar.map((h) => ({ ...h }));
  secili = 0;
  parcaYaz(YOLUM[0]);
  yaz("hw-duvar", y.duvar);
  ortalaGerek = true;
  elleOynandi = false;
  hazirYolIsaretle(ad);
  // Kendi yolunu kuran müşteri doğrudan parça eklemeye geçer
  if (ad === "bos") zincireKaydir();
}

/** Yol listesini göster: dar ekranda yapışkan sahnenin altına kaydırır */
function zincireKaydir() {
  const k = document.querySelector(".hw-zincir-kap");
  const s = document.querySelector(".hw-sahne");
  if (!k) return;
  const ust = s && getComputedStyle(s).position === "sticky" ? s.getBoundingClientRect().bottom : 0;
  const r = k.getBoundingClientRect();
  if (r.top < ust || r.bottom > innerHeight) window.scrollBy({ top: r.top - ust - 12, behavior: "smooth" });
}

/** Köprü kaydı: parça listesi formda durmaz, ayrıca taşınır */
function yolDurumu() {
  YOLUM[secili] = ham();
  return { yol: YOLUM.map((h) => ({ ...h })), secili };
}
function yolYaz(ek) {
  if (!ek || !Array.isArray(ek.yol) || !ek.yol.length) return;
  YOLUM = ek.yol.slice(0, EN_COK_PARCA).map((h) => {
    const t = { ...VARSAYILAN };
    for (const id of PARCA_ALAN) if (h && h[id] !== undefined) t[id] = h[id];
    return t;
  });
  secili = clamp(parseInt(ek.secili, 10) || 0, 0, YOLUM.length - 1);
  parcaYaz(YOLUM[secili]);
  GECMIS = [];
  zincirImza = "";
  ortalaGerek = true;
}

document.addEventListener("click", (e) => {
  const seg = e.target.closest("[data-secim] button[data-v]");
  if (seg) {
    yaz(seg.closest("[data-secim]").dataset.secim, seg.dataset.v);
    return;
  }
  const yolD = e.target.closest("[data-yol]");
  if (yolD) return hazirYol(yolD.dataset.yol);
  const parcaD = e.target.closest("[data-parca]");
  if (parcaD) return secParca(parseInt(parcaD.dataset.parca, 10));
  const silD = e.target.closest("[data-sil]");
  if (silD) return parcaSil(parseInt(silD.dataset.sil, 10));
  const ekleD = e.target.closest("[data-ekle]");
  if (ekleD) return parcaEkle(ekleD.dataset.ekle);
  const islemD = e.target.closest("[data-islem]");
  if (islemD) return ISLEM[islemD.dataset.islem]?.();
  const hz = e.target.closest("[data-hazir]");
  if (hz) {
    const h = HAZIR[hz.dataset.hazir];
    kaydet();
    // tip önce: sınırlar (rampa yükselmesi) ona göre açılır. Çok parçalı
    // yolda kenar yüksekliği bütün yolu değiştirdiği için dokunulmaz.
    for (const [id, v] of Object.entries(h)) {
      if (id === "hw-duvar" && YOLUM.length > 1) continue;
      yaz(id, v);
    }
    if (YOLUM.length === 1) ortalaGerek = true;
  }
});

// Ctrl+Z: yazı alanının dışında yol değişikliğini geri alır
document.addEventListener("keydown", (e) => {
  if (!(e.ctrlKey || e.metaKey) || e.shiftKey || e.key.toLowerCase() !== "z") return;
  if (e.target.closest?.("input, select, textarea, [contenteditable]")) return;
  if (!GECMIS.length) return;
  e.preventDefault();
  geriAl();
});

// Kaydırıcı ↔ sayı alanı
document.addEventListener("input", (e) => {
  const t = e.target;
  if (t.matches?.('input[type="range"][id]')) {
    const n = document.querySelector(`[data-bagli="${t.id}"]`);
    if (n) n.value = t.value;
  }
  yenile = true;
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
  if (t.tagName === "SELECT") secimleriBoya();
  yenile = true;
});

el("hw-ortala").addEventListener("click", ortala);
el("hw-sur").addEventListener("click", () => {
  if (!SON) return;
  surus = { bas: performance.now(), sure: Math.min(14000, 1200 + SON.toplamLt * 6) };
  el("hw-sur").disabled = true;
});

// Modelde bir parçaya (ya da numarasına) dokununca o parça seçilir
let basXY = null;
tuval.addEventListener("pointerdown", (e) => { basXY = [e.clientX, e.clientY]; });
tuval.addEventListener("pointerup", (e) => {
  if (!basXY || !SON || SON.n < 2) return;
  if (Math.hypot(e.clientX - basXY[0], e.clientY - basXY[1]) > 5) return;
  const r = tuval.getBoundingClientRect();
  const v = new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
  isin.setFromCamera(v, kamera);
  const hit = isin
    .intersectObjects([...etiketGrup.children, ...yolGrup.children], true)
    .find((h) => h.object.userData.parca !== undefined);
  if (hit) secParca(hit.object.userData.parca);
});

// ---------------------------------------------------------------- ÇIKTILAR
function indir(veri, ad, tur) {
  const blob = veri instanceof Blob ? veri : new Blob([veri], { type: tur });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = ad;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 4000);
}

function dosyaAdi(P, sira, z0) {
  const govde =
    P.tip === "viraj"
      ? `${P.yon > 0 ? "sol" : "sag"}_R${P.R}_${P.aci}d${P.egim ? "_yatis" + P.egim : ""}${P.korkuluk ? "_korkuluk" + P.korkuluk : ""}`
      : P.tip === "looping"
        ? `D${P.cap}`
        : `L${P.L}`;
  const yuk = P.rise ? (P.rise < 0 ? "_in" : "_H") + Math.abs(P.rise) : "";
  const kot = z0 > 0.5 ? "_Z" + Math.round(z0) : "";
  return `YOL_${sira ? String(sira).padStart(2, "0") + "_" : ""}${P.tip}_${govde}${yuk}${kot}_${P.baglanti}`;
}

function stl(geos, baslik) {
  const tris = [];
  for (const g of geos) {
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
    for (const v of [n, a, b, c]) {
      dv.setFloat32(o, v.x, true); dv.setFloat32(o + 4, v.y, true); dv.setFloat32(o + 8, v.z, true);
      o += 12;
    }
    dv.setUint16(o, 0, true);
    o += 2;
  }
  return buf;
}

// Sıkıştırmasız ZIP (STL'ler tek dosyada iner; ek kütüphane gerekmez)
const CRC_TABLO = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(u8) {
  let c = 0xffffffff;
  for (let i = 0; i < u8.length; i++) c = CRC_TABLO[(c ^ u8[i]) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function zip(dosyalar) {
  const enc = new TextEncoder();
  const simdi = new Date();
  const saat = (simdi.getHours() << 11) | (simdi.getMinutes() << 5) | (simdi.getSeconds() >> 1);
  const gun = ((simdi.getFullYear() - 1980) << 9) | ((simdi.getMonth() + 1) << 5) | simdi.getDate();
  const govde = [];
  const merkez = [];
  let ofs = 0;
  for (const d of dosyalar) {
    const ad = enc.encode(d.ad);
    const crc = crc32(d.veri);
    const boy = d.veri.length;
    const y = new DataView(new ArrayBuffer(30));
    y.setUint32(0, 0x04034b50, true);
    y.setUint16(4, 20, true);
    y.setUint16(6, 0x0800, true); // UTF-8 ad
    y.setUint16(8, 0, true); // saklama
    y.setUint16(10, saat, true);
    y.setUint16(12, gun, true);
    y.setUint32(14, crc, true);
    y.setUint32(18, boy, true);
    y.setUint32(22, boy, true);
    y.setUint16(26, ad.length, true);
    govde.push(new Uint8Array(y.buffer), ad, d.veri);
    const m = new DataView(new ArrayBuffer(46));
    m.setUint32(0, 0x02014b50, true);
    m.setUint16(4, 20, true);
    m.setUint16(6, 20, true);
    m.setUint16(8, 0x0800, true);
    m.setUint16(12, saat, true);
    m.setUint16(14, gun, true);
    m.setUint32(16, crc, true);
    m.setUint32(20, boy, true);
    m.setUint32(24, boy, true);
    m.setUint16(28, ad.length, true);
    m.setUint32(42, ofs, true);
    merkez.push(new Uint8Array(m.buffer), ad);
    ofs += 30 + ad.length + boy;
  }
  const mBoy = merkez.reduce((t, x) => t + x.length, 0);
  const s = new DataView(new ArrayBuffer(22));
  s.setUint32(0, 0x06054b50, true);
  s.setUint16(8, dosyalar.length, true);
  s.setUint16(10, dosyalar.length, true);
  s.setUint32(12, mBoy, true);
  s.setUint32(16, ofs, true);
  return new Blob([...govde, ...merkez, new Uint8Array(s.buffer)], { type: "application/zip" });
}

function csvMetni() {
  const S = SON, O = S.Ps[0];
  const sira = (i) => (S.n > 1 ? i + 1 : 0);
  const satir = [
    ["Alan", "Deger"],
    ["Parca_sayisi", S.n],
    ["Kapali_pist", S.kapali ? "evet" : "hayir"],
    ["Kenar_yuksekligi_mm", O.duvar], ["Baglanti", O.baglanti], ["Renk", O.renk],
    ["Yol_genisligi_mm", O.W], ["Taban_mm", O.t], ["Kenar_kalinligi_mm", O.w],
    ["Delik_mm", O.delik], ["Gecme_toleransi_mm", O.tol], ["Serit_araligi_mm", O.aralik],
    ["Toplam_yol_uzunlugu_mm", yuvarla(S.toplamLt, 1)],
    ["Yerlesim_olcusu_mm", `${S.olcu.x}x${S.olcu.y}x${S.olcu.z}`],
    ["Hacim_cm3", (S.hacim / 1000).toFixed(2)],
    ["Baglanti_parcasi_adet", S.bag.adet],
    ["Baglanti_parcasi_eklem_yedek", S.bag.adet ? `${S.bag.eklem}+${S.bag.yedek}` : "-"],
    ["Kutle_g_PLA", S.kutleG.toFixed(1)],
    ["Sure_saat", S.sureSaat.toFixed(2)],
    [],
    ["Sira", "Tip", "Tarif", "Uzunluk_mm", "Yaricap_mm", "Aci_derece", "Looping_capi_mm", "Yukselme_mm", "Yan_yatis_derece", "Korkuluk_mm", "Yon", "Baslangic_yuksekligi_mm", "Ayak_sayisi", "Dis_olcu_mm", "Kutle_g", "Dosya"],
    ...S.parcalar.map((x, i) => [
      i + 1, x.P.tip, tarif(x.P), x.P.L, x.P.R, x.P.aci, x.P.cap, x.P.rise, x.P.egim, x.P.korkuluk,
      x.P.yon > 0 ? "sol" : "sag", x.z0, x.ayakSayisi, `${x.olcu.x}x${x.olcu.y}x${x.olcu.z}`,
      ((x.hacim / 1000) * PLA).toFixed(1), dosyaAdi(x.P, sira(i), x.z0) + ".stl",
    ]),
  ];
  return "﻿" + satir.map((r) => r.join(";")).join("\r\n");
}

el("hw-stl").addEventListener("click", () => {
  if (!SON) return;
  if (SON.n === 1) {
    const x = SON.parcalar[0];
    const ad = dosyaAdi(x.P, 0, x.z0);
    indir(stl(x.geos, ad), `${ad}.stl`, "model/stl");
    return;
  }
  const dosyalar = SON.parcalar.map((x, i) => {
    const ad = dosyaAdi(x.P, i + 1, x.z0);
    return { ad: `${ad}.stl`, veri: new Uint8Array(stl(x.geos, ad)) };
  });
  // Sipariş klasörüne toplanırken her parça ayrı STL (bilgi CSV'si ve
  // bağlantı parçaları kendi düğmeleriyle ayrıca toplanır)
  if (window.ADJY?.toplaniyor?.()) {
    for (const d of dosyalar) indir(d.veri, d.ad, "model/stl");
    return;
  }
  if (SON.bag.adet) {
    const b = baglayiciStl();
    dosyalar.push({ ad: `${b.ad}.stl`, veri: new Uint8Array(b.veri) });
  }
  dosyalar.push({ ad: "YOL_bilgi.csv", veri: new TextEncoder().encode(csvMetni()) });
  indir(zip(dosyalar), `YOL_${SON.n}parca${SON.kapali ? "_kapali" : ""}_${SON.Ps[0].baglanti}.zip`, "application/zip");
});
/** Bütün bağlantı parçaları tek tablada: plaka tabana oturur, sıra sıra dizilir */
function baglayiciStl() {
  const O = SON.Ps[0];
  const { geos } = baglayiciHazirla(O);
  const adet = SON.bag.adet;
  const sutun = Math.max(1, Math.floor((TABLA - 10) / (BAGLAYICI.boy + 6)));
  const hepsi = [];
  for (let k = 0; k < adet; k++) {
    const x = (k % sutun) * (BAGLAYICI.boy + 6);
    const y = Math.floor(k / sutun) * (BAGLAYICI.en + 6);
    for (const g of geos) hepsi.push(g.clone().translate(x, y, BAGLAYICI.kal));
  }
  const ad = `YOL_baglanti_parcasi_x${adet}_pim${yuvarla(Math.max(0.8, O.delik / 2 - O.tol) * 2, 2)}`;
  const veri = stl(hepsi, ad);
  for (const g of hepsi) g.dispose();
  return { ad, veri };
}
el("hw-baglayici-stl").addEventListener("click", () => {
  if (!SON || !SON.bag.adet) return;
  const b = baglayiciStl();
  indir(b.veri, `${b.ad}.stl`, "model/stl");
});
el("hw-csv").addEventListener("click", () => {
  if (!SON) return;
  const ad = SON.n > 1 ? `YOL_${SON.n}parca_bilgi` : dosyaAdi(SON.parcalar[0].P, 0, SON.parcalar[0].z0);
  indir(csvMetni(), `${ad}.csv`, "text/csv;charset=utf-8");
});

// ---------------------------------------------------------------- TEMA / BOYUT / DÖNGÜ
function temaRenkleri() {
  const cs = getComputedStyle(document.documentElement);
  const cizgi = cs.getPropertyValue("--a-cizgi-koyu").trim() || "#cfccc2";
  izgara.material.color.set(cizgi);
  temaVurgu = cs.getPropertyValue("--a-vurgu").trim() || "#5b34d6";
  try { kenarSecili.color.set(temaVurgu); } catch { /* tanınmayan renk */ }
  yenile = true; // numaralar vurgu rengiyle yeniden çizilsin
  kirli = true;
}
window.addEventListener("adjy:tema", () => setTimeout(temaRenkleri, 30));

// Müşteri sahneyi kendisi çevirmediyse, sahnenin boyu değişince (dar
// ekran, adım düzeni kurulunca) model yeniden ortalanır.
let elleOynandi = false;
kontrol.addEventListener("start", () => { elleOynandi = true; });

function boyutla() {
  const w = sahneKutu.clientWidth, h = sahneKutu.clientHeight;
  if (!w || !h) return;
  renderer.setSize(w, h, false);
  kamera.aspect = w / h;
  kamera.updateProjectionMatrix();
  if (!elleOynandi && SON) ortala();
  kirli = true;
}
new ResizeObserver(boyutla).observe(sahneKutu);
window.addEventListener("resize", boyutla);
kontrol.addEventListener("change", () => { kirli = true; });

function dongu(an) {
  requestAnimationFrame(dongu);
  if (yenile) {
    yenile = false;
    kur();
  }
  if (kontrol.update()) kirli = true;
  if (surus && SON) {
    const u = clamp((an - surus.bas) / surus.sure, 0, 1);
    const e = u < 0.5 ? 2 * u * u : 1 - (-2 * u + 2) ** 2 / 2;
    arabayiKoy(arabaBas() + e * Math.max(0, SON.toplamLt - 2 * arabaBas()));
    if (u >= 1) {
      surus = null;
      el("hw-sur").disabled = false;
      setTimeout(() => { if (!surus) arabayiKoy(arabaBas()); }, 900);
    }
  }
  if (kirli) {
    kirli = false;
    renderer.render(sahne, kamera);
  }
}

secimleriBoya();
temaRenkleri();
hazirYolIsaretle("tek");
boyutla();
kur();
yenile = false;
requestAnimationFrame(dongu);
