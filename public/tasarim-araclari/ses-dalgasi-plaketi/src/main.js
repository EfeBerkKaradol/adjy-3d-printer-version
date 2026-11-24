/* ==========================================================================
   SES DALGASI PLAKETİ

   Birkaç saniyelik ses (kayıt ya da dosya) tarayıcıda çözülür; dalga
   biçimi 240 örneğe indirilip gizli bir alana yazılır. Ses dosyası
   hiçbir yere gönderilmez: sipariş yalnız bu 240 sayıyı taşır, atölye
   aynı dalgayı onlardan kurar.

     zemin  → köşeleri yuvarlak levha
     dalga  → çubuk, dolu dalga ya da halka biçiminde kabartma
     yazı   → dalganın altında bir satır
     ayak   → eğik yarıklı masa ayağı (ya da duvar delikleri)

   Hepsi tablaya yatık, desteksiz; renkler üst üste binmez.
   ========================================================================== */
import {
  el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, maske, maskeBirlestir, maskeDoluMu, asindir, hacim, olcum,
  stl, indir, dosyaAdi, csv, formBagla, alanlariYaz, tabloYaz, sureYaz, pahliKati, maskeCiz, maskeKopya, genislet,
  yaziSigdir, yuvarlakKutu, yaziTipleriniBekle,
} from "../../_adjy/arac-ortak.js";
import { egikAyak } from "../../_adjy/foto-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  siyah: 0x1b1b1f, antrasit: 0x4a4d52, beyaz: 0xf3f1ea, lacivert: 0x1f2f5c, kahve: 0x5b3a26, kirmizi: 0xc8242b,
  pembe: 0xef6fa5, sari: 0xf6c927, turkuaz: 0x21b5b0, mavi: 0x2a6fd6, mor: 0x6a3fa0, acikgri: 0xc4c7cb,
};
const YAZI_TIPI = {
  elyazisi: { aile: '"Pacifico"', agirlik: 400 },
  retro: { aile: '"Righteous"', agirlik: 400 },
  blok: { aile: '"Bungee"', agirlik: 400 },
};
const ORNEK_SAYISI = 240;

// ---------------------------------------------------------------- DALGA VERİSİ
const hex2 = (v) => Math.round(clamp(v, 0, 1) * 255).toString(16).padStart(2, "0");
function dalgaYaz(genlikler) {
  alanlariYaz({ "sd-dalga": genlikler.map(hex2).join("") });
}
function dalgaOku() {
  const s = (el("sd-dalga").value || "").trim();
  const d = [];
  for (let i = 0; i + 1 < s.length; i += 2) {
    const v = parseInt(s.slice(i, i + 2), 16);
    d.push(Number.isFinite(v) ? v / 255 : 0);
  }
  return d.length >= 8 ? d : ornekDalga("soz");
}
/** Hazır dalgalar: gerçek kayıtların zarfına benzeyen, tekrarlanabilir biçimler */
function ornekDalga(tur) {
  const d = [];
  let a = 12345;
  const R = () => ((a = (a * 1664525 + 1013904223) >>> 0) / 4294967296);
  for (let i = 0; i < ORNEK_SAYISI; i++) {
    const t = i / (ORNEK_SAYISI - 1);
    let v;
    if (tur === "kalp") {
      const f = (t * 4) % 1;
      v = 0.08 + 0.92 * Math.exp(-Math.pow((f - 0.18) / 0.045, 2)) + 0.5 * Math.exp(-Math.pow((f - 0.42) / 0.05, 2));
    } else if (tur === "kahkaha") {
      const f = (t * 9) % 1;
      v = (0.25 + 0.75 * Math.exp(-f * 3.2)) * (0.45 + 0.55 * Math.sin(Math.PI * t)) * (0.75 + 0.25 * R());
    } else if (tur === "muzik") {
      v = (0.35 + 0.3 * Math.sin(t * 46) + 0.25 * Math.sin(t * 17 + 1) + 0.2 * R()) * (0.6 + 0.4 * Math.sin(Math.PI * t));
    } else {
      // üç hece: "se-ni se-vi-yo-rum" gibi yükselip alçalan öbekler
      const hece = [[0.1, 0.07, 0.7], [0.24, 0.06, 0.95], [0.43, 0.08, 0.8], [0.58, 0.05, 1], [0.72, 0.07, 0.75], [0.88, 0.06, 0.6]];
      v = 0.04;
      for (const [m, s, g] of hece) v += g * Math.exp(-Math.pow((t - m) / s, 2));
      v *= 0.72 + 0.28 * R();
    }
    d.push(clamp(v, 0.03, 1));
  }
  const en = Math.max(...d);
  return d.map((v) => v / en);
}

/** Ses verisi → 240 genlik: baştaki ve sondaki sessizlik atılır, tepe değerine oranlanır */
async function sesCoz(tampon) {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) throw new Error("Tarayıcı ses çözemiyor");
  const ac = new AC();
  try {
    const ses = await ac.decodeAudioData(tampon);
    const n = ses.length, kanal = ses.numberOfChannels;
    const veri = new Float32Array(n);
    for (let k = 0; k < kanal; k++) {
      const c = ses.getChannelData(k);
      for (let i = 0; i < n; i++) veri[i] += Math.abs(c[i]) / kanal;
    }
    let tepe = 0;
    for (let i = 0; i < n; i++) if (veri[i] > tepe) tepe = veri[i];
    if (!(tepe > 1e-4)) throw new Error("Kayıt sessiz");
    let bas = 0, son = n - 1;
    while (bas < son && veri[bas] < tepe * 0.03) bas++;
    while (son > bas && veri[son] < tepe * 0.03) son--;
    const uz = Math.max(ORNEK_SAYISI, son - bas + 1);
    const d = [];
    for (let i = 0; i < ORNEK_SAYISI; i++) {
      const a = bas + Math.floor((uz * i) / ORNEK_SAYISI), b = Math.min(n, bas + Math.floor((uz * (i + 1)) / ORNEK_SAYISI));
      let kare = 0, c = 0;
      for (let j = a; j < b; j++) { kare += veri[j] * veri[j]; c++; }
      d.push(c ? Math.sqrt(kare / c) : 0);
    }
    const en = Math.max(...d) || 1;
    return d.map((v) => Math.pow(v / en, 0.75));
  } finally {
    ac.close?.();
  }
}

/** n çubuğa indir: her çubuk kendi dilimindeki en yüksek değer */
function cubuklar(d, n) {
  const c = [];
  for (let i = 0; i < n; i++) {
    const a = Math.floor((d.length * i) / n), b = Math.max(a + 1, Math.floor((d.length * (i + 1)) / n));
    let en = 0;
    for (let j = a; j < b; j++) if (d[j] > en) en = d[j];
    c.push(en);
  }
  return c;
}

function oku() {
  const W = clamp(sayi("sd-gen", 160), 100, 220);
  return {
    W, H: clamp(sayi("sd-yuk", 70), 50, 120),
    bicim: el("sd-bicim").value,
    n: Math.round(clamp(sayi("sd-cubuk", 60), 24, Math.min(96, Math.floor((W - 16) / 1.6)))),
    yazi: el("sd-yazi").value.trim(),
    tip: el("sd-tip").value,
    durus: el("sd-durus").value,
    renkZemin: el("sd-renk-zemin").value,
    renkDalga: el("sd-renk-dalga").value,
    renkYazi: el("sd-renk-yazi").value,
    T: clamp(sayi("sd-kalin", 2.4), 1.6, 4),
    kab: clamp(sayi("sd-kabartma", 1.4), 0.8, 3),
    px: clamp(sayi("sd-px", 7), 5, 10),
  };
}

function delikler(P) {
  if (P.durus !== "delik") return [];
  const x = P.W / 2 - 8, y = P.H / 2 - 8;
  return [[-x, y], [x, y]];
}

/** Dalga çizimi: mm, merkez (0, cy), genişlik Aw, yükseklik Ah */
function dalgaCiz(c, P, d, cy, Aw, Ah) {
  if (P.bicim === "halka") {
    const g = cubuklar(d, P.n);
    const r0 = Ah * 0.2, L = Ah * 0.5 - r0 - 0.5;
    const kal = Math.max(0.9, Math.min(2.2, ((2 * Math.PI * r0) / P.n) * 0.62));
    c.lineCap = "round";
    c.lineWidth = kal;
    c.beginPath();
    for (let i = 0; i < P.n; i++) {
      const a = Math.PI / 2 - (i / P.n) * Math.PI * 2;
      const u = Math.max(0.8, g[i] * L);
      c.moveTo(r0 * Math.cos(a), cy + r0 * Math.sin(a));
      c.lineTo((r0 + u) * Math.cos(a), cy + (r0 + u) * Math.sin(a));
    }
    c.stroke();
    // İç halka: çubukları birbirine bağlar (tek parça, kopmaz)
    c.lineWidth = 1.2;
    c.beginPath();
    c.arc(0, cy, r0, 0, Math.PI * 2);
    c.stroke();
    return;
  }
  if (P.bicim === "dalga") {
    const g = cubuklar(d, Math.min(120, Math.round(Aw / 1.2)));
    const adim = Aw / (g.length - 1);
    const y = (i) => Math.max(0.55, (g[i] * Ah) / 2);
    c.beginPath();
    c.moveTo(-Aw / 2, cy + y(0));
    for (let i = 1; i < g.length; i++) {
      const x0 = -Aw / 2 + (i - 1) * adim, x1 = x0 + adim;
      c.bezierCurveTo(x0 + adim / 2, cy + y(i - 1), x0 + adim / 2, cy + y(i), x1, cy + y(i));
    }
    for (let i = g.length - 1; i > 0; i--) {
      const x0 = -Aw / 2 + i * adim, x1 = x0 - adim;
      c.bezierCurveTo(x0 - adim / 2, cy - y(i), x0 - adim / 2, cy - y(i - 1), x1, cy - y(i - 1));
    }
    c.closePath();
    c.fill();
    return;
  }
  // Çubuk: ortadan iki yana simetrik, uçları yuvarlak
  const g = cubuklar(d, P.n);
  const adim = Aw / P.n;
  const kal = Math.max(0.9, adim * 0.6);
  c.lineCap = "round";
  c.lineWidth = kal;
  c.beginPath();
  for (let i = 0; i < P.n; i++) {
    const x = -Aw / 2 + (i + 0.5) * adim;
    const y = Math.max(0.2, (g[i] * Ah) / 2 - kal / 2);
    c.moveTo(x, cy - y);
    c.lineTo(x, cy + y);
  }
  c.stroke();
}

// ---------------------------------------------------------------- KUR
const S_ = sahneKur({ tuval: el("sd-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.1, -0.62, 0.95);
const mat = { zemin: malzeme(RENK.siyah), dalga: malzeme(RENK.beyaz), yazi: malzeme(RENK.pembe), ayak: malzeme(RENK.siyah) };
let SON = null;

function kur() {
  const P = oku();
  const d = dalgaOku();
  const gen = P.W + 4, yuk = P.H + 4, px = P.px;
  const govdeYolu = (c) => { c.beginPath(); yuvarlakKutu(c, -P.W / 2, -P.H / 2, P.W, P.H, 6); c.fill(); };
  const dl = delikler(P);
  const delikKes = (m, r) => {
    if (dl.length) maskeCiz(m, (c) => { c.beginPath(); for (const [x, y] of dl) { c.moveTo(x + r, y); c.arc(x, y, r, 0, Math.PI * 2); } c.fill(); }, "destination-out");
    return m;
  };
  const zemin = delikKes(maske(gen, yuk, px, govdeYolu), 2.2);
  const icAlan = delikKes(asindir(maske(gen, yuk, px, govdeYolu), 2), 4.2);

  let harfBoyu = 0;
  const yazi = maske(gen, yuk, px, (c) => {
    if (P.yazi) harfBoyu = yaziSigdir(c, P.yazi, [0, -P.H * 0.33, P.W * 0.8, P.H * 0.16], YAZI_TIPI[P.tip] || YAZI_TIPI.elyazisi, 0.45);
  });
  maskeBirlestir(yazi, icAlan, "destination-in");

  const cy = P.yazi ? P.H * 0.1 : 0;
  const Ah = P.H * (P.yazi ? 0.56 : 0.72);
  const Aw = P.bicim === "halka" ? Ah : P.W - 18;
  const dalga = maske(gen, yuk, px, (c) => dalgaCiz(c, P, d, cy, Aw, Ah));
  maskeBirlestir(dalga, icAlan, "destination-in");
  maskeBirlestir(dalga, genislet(maskeKopya(yazi), 0.8), "destination-out");

  const gZemin = pahliKati(zemin, P.T, 0, 0.6, 3);
  const gDalga = maskeDoluMu(dalga) ? pahliKati(dalga, P.kab, P.T, 0.3, 2) : null;
  const gYazi = maskeDoluMu(yazi) ? pahliKati(yazi, P.kab, P.T, 0.3, 2) : null;
  let A = null;
  if (P.durus === "ayak") {
    A = egikAyak({ boy: clamp(P.W * 0.5, 50, 100), yarik: P.T + 0.35, egim: 12, levha: P.H });
    A.geo.translate(0, -P.H / 2 - 10 - A.derinlik / 2, 0);
  }

  mat.zemin.color.setHex(RENK[P.renkZemin] ?? RENK.siyah);
  mat.ayak.color.setHex(RENK[P.renkZemin] ?? RENK.siyah);
  mat.dalga.color.setHex(RENK[P.renkDalga] ?? RENK.beyaz);
  mat.yazi.color.setHex(RENK[P.renkYazi] ?? RENK.pembe);
  const aglar = [ag(gZemin, mat.zemin, "levha")];
  if (gDalga) aglar.push(ag(gDalga, mat.dalga, "dalga"));
  if (gYazi) aglar.push(ag(gYazi, mat.yazi, "yazi"));
  if (A) aglar.push(ag(A.geo, mat.ayak, "ayak"));
  S_.modeliYaz(aglar);

  const v = { zemin: hacim(gZemin), dalga: hacim(gDalga), yazi: hacim(gYazi), ayak: A ? hacim(A.geo) : 0 };
  const renkSayisi = new Set([P.renkZemin, gDalga && P.renkDalga, gYazi && P.renkYazi].filter(Boolean)).size;
  const o = olcum(v.zemin + v.dalga + v.yazi + v.ayak, renkSayisi - 1);
  SON = { P, gZemin, gDalga, gYazi, gAyak: A ? A.geo : null, v, olcum: o, renkSayisi, harfBoyu, d };

  bilgiYaz();
  onizle(d);
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_SD = { hazir: true, olcum: o, olcu: `${P.W} × ${P.H} × ${(P.T + P.kab).toFixed(1)} mm` };
}

/** Paneldeki küçük dalga önizlemesi */
function onizle(d) {
  const t = el("sd-onizleme");
  if (!t) return;
  const w = (t.width = t.clientWidth * 2 || 560), h = (t.height = 112);
  const c = t.getContext("2d");
  c.clearRect(0, 0, w, h);
  c.fillStyle = getComputedStyle(document.documentElement).getPropertyValue("--a-vurgu").trim() || "#5b34d6";
  const g = cubuklar(d, 80), adim = w / 80;
  for (let i = 0; i < 80; i++) {
    const y = Math.max(2, g[i] * (h - 12));
    c.fillRect(i * adim + adim * 0.2, (h - y) / 2, adim * 0.6, y);
  }
}

function bilgiYaz() {
  const { P, v, olcum: o, renkSayisi, harfBoyu } = SON;
  el("sd-olcu").textContent = `${P.W} × ${P.H} mm`;
  el("sd-cubuk-satir").hidden = P.bicim === "dalga";
  el("sd-tip-satir").hidden = !P.yazi;
  el("sd-renk-yazi-satir").hidden = !P.yazi;
  const uyarilar = [];
  if (P.yazi && harfBoyu && harfBoyu < 4.5) uyarilar.push("Yazı çok küçük kaldı: kısaltın ya da plaketi büyütün");
  const u = el("sd-uyari");
  u.hidden = !uyarilar.length;
  u.textContent = uyarilar.join(" · ");
  for (const [id, g] of [["sd-stl-dalga", SON.gDalga], ["sd-stl-yazi", SON.gYazi], ["sd-stl-ayak", SON.gAyak]]) el(id).hidden = !g;
  tabloYaz(el("sd-tablo"), [
    ["Dış ölçü", `${P.W} × ${P.H} × ${(P.T + P.kab).toFixed(1)} mm`],
    ["Dalga", P.bicim === "dalga" ? "dolu dalga" : `${P.n} ${P.bicim === "halka" ? "ışın" : "çubuk"}`],
    ["Renk", `${renkSayisi} filament`],
    ["Zemin", `${(v.zemin / 1000).toFixed(1)} cm³`],
    ["Dalga + yazı", `${((v.dalga + v.yazi) / 1000).toFixed(1)} cm³`],
    ["Ayak", SON.gAyak ? `${(v.ayak / 1000).toFixed(1)} cm³, 12° yatık` : "yok"],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `SES_DALGASI_${dosyaAdi(P.yazi || "plaket")}_${P.W}x${P.H}`;
}
for (const [id, anahtar, ad] of [["sd-stl-zemin", "gZemin", "zemin"], ["sd-stl-dalga", "gDalga", "dalga"], ["sd-stl-yazi", "gYazi", "yazi"], ["sd-stl-ayak", "gAyak", "ayak"]]) {
  el(id).addEventListener("click", () => {
    if (!SON || !SON[anahtar]) return;
    indir(stl([SON[anahtar]], ad), `${onEk()}_${ad}.stl`, "model/stl");
  });
}
el("sd-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, olcum: o, d } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Yazi", P.yazi], ["Yazi_tipi", P.tip], ["Bicim", P.bicim], ["Cubuk", P.n], ["Genislik_mm", P.W], ["Yukseklik_mm", P.H],
    ["Durus", P.durus], ["Zemin_mm", P.T], ["Kabartma_mm", P.kab], ["Renk_zemin", P.renkZemin], ["Renk_dalga", P.renkDalga], ["Renk_yazi", P.renkYazi],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)], ["Dalga_240", d.map((x) => Math.round(x * 100)).join(" ")],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

// ---------------------------------------------------------------- SES GİRİŞİ
const durumYaz = (metin, uyari) => {
  const e = el("sd-ses-durum");
  if (!e) return;
  e.textContent = metin;
  e.classList.toggle("uyari", !!uyari);
};
async function tampondan(tampon, ad) {
  try {
    durumYaz("Ses çözülüyor…");
    dalgaYaz(await sesCoz(tampon));
    durumYaz(`${ad}: dalga hazır. Ses tarayıcınızda kaldı, hiçbir yere gönderilmedi.`);
    document.querySelectorAll("[data-ornek-ses]").forEach((x) => x.classList.remove("on"));
  } catch (e) {
    durumYaz(`Ses okunamadı (${e.message || "bilinmeyen biçim"}). MP3, WAV ya da M4A deneyin.`, true);
  }
}
el("sd-ses").addEventListener("change", async () => {
  const f = el("sd-ses").files && el("sd-ses").files[0];
  if (!f) return;
  await tampondan(await f.arrayBuffer(), f.name);
  el("sd-ses").value = "";
});

let kayit = null;
const kayitDugmesi = el("sd-kayit");
function kayitBitir() {
  if (kayit && kayit.mr.state !== "inactive") kayit.mr.stop();
}
kayitDugmesi?.addEventListener("click", async () => {
  if (kayit) return kayitBitir();
  if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder) {
    durumYaz("Bu tarayıcı kayıt yapamıyor; ses dosyası seçin.", true);
    return;
  }
  try {
    const akis = await navigator.mediaDevices.getUserMedia({ audio: true });
    const mr = new MediaRecorder(akis);
    const parcalar = [];
    const bas = Date.now();
    mr.ondataavailable = (e) => { if (e.data.size) parcalar.push(e.data); };
    mr.onstop = async () => {
      clearInterval(kayit.sayac);
      akis.getTracks().forEach((t) => t.stop());
      kayit = null;
      kayitDugmesi.classList.remove("kayitta");
      kayitDugmesi.textContent = "Sesimi kaydet";
      await tampondan(await new Blob(parcalar, { type: mr.mimeType }).arrayBuffer(), "Kayıt");
    };
    kayit = {
      mr,
      sayac: setInterval(() => {
        const sn = (Date.now() - bas) / 1000;
        kayitDugmesi.textContent = `Durdur (${sn.toFixed(0)} sn)`;
        if (sn >= 10) kayitBitir();
      }, 250),
    };
    kayitDugmesi.classList.add("kayitta");
    kayitDugmesi.textContent = "Durdur (0 sn)";
    durumYaz("Kaydediliyor… En çok 10 saniye.");
    mr.start();
  } catch (e) {
    durumYaz("Mikrofona izin verilmedi; ses dosyası seçebilirsiniz.", true);
  }
});
document.querySelectorAll("[data-ornek-ses]").forEach((b) => {
  b.addEventListener("click", () => {
    dalgaYaz(ornekDalga(b.dataset.ornekSes));
    document.querySelectorAll("[data-ornek-ses]").forEach((x) => x.classList.toggle("on", x === b));
    durumYaz("Örnek dalga gösteriliyor. Kendi sesinizi kaydedin ya da dosya seçin.");
  });
});

const HAZIR = {
  sevgi: { "sd-bicim": "cubuk", "sd-cubuk": 60, "sd-tip": "elyazisi", "sd-gen": 160, "sd-yuk": 70, "sd-durus": "ayak", "sd-renk-zemin": "siyah", "sd-renk-dalga": "beyaz", "sd-renk-yazi": "pembe" },
  bebek: { "sd-bicim": "dalga", "sd-tip": "retro", "sd-gen": 180, "sd-yuk": 70, "sd-durus": "ayak", "sd-renk-zemin": "beyaz", "sd-renk-dalga": "turkuaz", "sd-renk-yazi": "lacivert" },
  halka: { "sd-bicim": "halka", "sd-cubuk": 72, "sd-tip": "retro", "sd-gen": 120, "sd-yuk": 120, "sd-durus": "delik", "sd-renk-zemin": "lacivert", "sd-renk-dalga": "sari", "sd-renk-yazi": "beyaz" },
  sarki: { "sd-bicim": "cubuk", "sd-cubuk": 90, "sd-tip": "blok", "sd-gen": 220, "sd-yuk": 60, "sd-durus": "delik", "sd-renk-zemin": "antrasit", "sd-renk-dalga": "sari", "sd-renk-yazi": "beyaz" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});

function sayac() {
  el("sd-yazi-sayac").textContent = `${el("sd-yazi").value.length}/28`;
}
formBagla((t) => {
  if (t && t.id === "sd-yazi") sayac();
  if (t && ["sd-gen", "sd-yuk", "sd-durus"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
sayac();
if (!el("sd-dalga").value) el("sd-dalga").value = ornekDalga("soz").map(hex2).join("");
S_.dongu(kur);
yaziTipleriniBekle(YAZI_TIPI, () => S_.yenile?.());
window.__ADJY_SAHNE_MODEL = () => S_.model;
