/* ==========================================================================
   IŞIKLI YILBAŞI FENERİ

   Litofan ilkesi: desen duvarın kalınlığına işlenir. İçine mum LED
   konunca ince yerler parlar, kalın yerler gölge olur.
     desen → çam ormanı, kar yağışı ya da yıldızlı gece; açılmış silindir
             yüzeyine (çevre × yükseklik) tuvalde çizilir, kenarlardan
             sarar (dikişsiz). İsteğe bağlı yazı fenerin ön yüzünde.
     yumuşatma → desen bulanıklaştırılır: kalınlık geçişleri ≤ 45°,
             dik basılınca destek gerekmez.
     gövde → alt ve üst açık tüp (bkz. ../_adjy/arac-ortak.js → kapKur),
             iç yüzey düzgün; alt/üst 5 mm'lik bantlar tam kalın (sağlam).
   "Işığı yak": önizlemede parlaklık duvar kalınlığından hesaplanır.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, alanlariYaz, tabloYaz, sureYaz, kapKur, rastgele, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = { beyaz: 0xf3f1ea, krem: 0xefe3c8, mavi: 0xbcd8ef, pembe: 0xf2c9d6, altin: 0xe6cf9a };
const YAZI_TIPI = {
  yuvarlak: { aile: '"Baloo 2"', agirlik: 800 },
  elyazisi: { aile: '"Pacifico"', agirlik: 400 },
  modern: { aile: '"Geist"', agirlik: 800 },
};
const BANT = 5; // alt ve üst tam kalın bant (mm)
const PX = 3; // desen tuvali çözünürlüğü (px/mm)

function oku() {
  return {
    desen: el("yf-desen").value,
    tohum: Math.round(clamp(sayi("yf-tohum", 8), 1, 99)),
    yogun: clamp(sayi("yf-yogun", 60), 20, 100) / 100,
    ters: el("yf-ters").checked,
    isim: el("yf-isim").value.trim().slice(0, 18),
    tip: YAZI_TIPI[el("yf-yazi-tipi").value] ? el("yf-yazi-tipi").value : "yuvarlak",
    D: clamp(sayi("yf-cap", 80), 60, 120),
    H: clamp(sayi("yf-yuk", 120), 70, 180),
    bicim: el("yf-bicim").value,
    renk: el("yf-renk").value,
    ince: clamp(sayi("yf-ince", 0.8), 0.6, 1.4),
    kalin: clamp(sayi("yf-kalin", 2.6), 1.8, 3.4),
    adim: clamp(sayi("yf-adim", 0.7), 0.4, 1),
  };
}

// ---------------------------------------------------------------- DESEN
function yildizCiz(c, x, y, r) {
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r * 0.42 : r;
    i ? c.lineTo(x + q * Math.cos(a), y + q * Math.sin(a)) : c.moveTo(x + q * Math.cos(a), y + q * Math.sin(a));
  }
  c.closePath();
  c.fill();
}
function agacCiz(c, x, y, h) {
  const g = h * 0.62;
  c.beginPath();
  for (const [k, y0, y1] of [[1, 0.12, 0.5], [0.8, 0.35, 0.75], [0.58, 0.58, 1]]) {
    c.moveTo(x - (g * k) / 2, y + h * y0);
    c.lineTo(x + (g * k) / 2, y + h * y0);
    c.lineTo(x, y + h * y1);
    c.closePath();
  }
  c.rect(x - h * 0.05, y, h * 0.1, h * 0.14);
  c.fill();
}
function karCiz(c, x, y, r) {
  c.save();
  c.translate(x, y);
  c.lineCap = "round";
  for (let i = 0; i < 6; i++) {
    c.save();
    c.rotate((i * Math.PI) / 3);
    c.lineWidth = Math.max(0.9, r * 0.16);
    c.beginPath(); c.moveTo(0, 0); c.lineTo(0, r); c.stroke();
    c.lineWidth = Math.max(0.8, r * 0.12);
    c.beginPath(); c.moveTo(0, r * 0.55); c.lineTo(r * 0.28, r * 0.8); c.moveTo(0, r * 0.55); c.lineTo(-r * 0.28, r * 0.8); c.stroke();
    c.restore();
  }
  c.restore();
}

/** Açılmış yüzeye desen: x ∈ [0, C], y ∈ [0, H] (mm, y yukarı). Beyaz = motif. */
function desenCiz(P, C) {
  const tuval = document.createElement("canvas");
  tuval.width = Math.ceil(C * PX);
  tuval.height = Math.ceil(P.H * PX);
  const c = tuval.getContext("2d");
  c.translate(0, tuval.height);
  c.scale(PX, -PX);
  c.fillStyle = "#fff";
  c.strokeStyle = "#fff";
  const R = rastgele(P.tohum * 31 + (P.desen === "kar" ? 7 : P.desen === "gece" ? 13 : 1));
  const ust = P.H - BANT - 3, alt = BANT + 1;
  // Her motif üç kez çizilir (x − C, x, x + C): sarılınca dikiş görünmez
  const sar = (f) => { for (const dx of [-C, 0, C]) { c.save(); c.translate(dx, 0); f(); c.restore(); } };

  if (P.desen === "orman") {
    // Karlı zemin
    sar(() => {
      c.beginPath();
      c.moveTo(0, 0);
      for (let x = 0; x <= C; x += 2) c.lineTo(x, alt + 5 + 2.5 * Math.sin((x / C) * Math.PI * 2 * 3) + 1.5 * Math.sin((x / C) * Math.PI * 2 * 7));
      c.lineTo(C, 0);
      c.closePath();
      c.fill();
    });
    const n = Math.max(4, Math.round((C / 16) * (0.6 + P.yogun)));
    for (let i = 0; i < n; i++) {
      const x = ((i + 0.3 + R() * 0.4) / n) * C;
      const h = (P.H - 2 * BANT) * (0.3 + R() * 0.32);
      sar(() => agacCiz(c, x, alt + 4, h));
    }
    const ns = Math.round(((C * (ust - P.H * 0.6)) / 220) * P.yogun);
    for (let i = 0; i < ns; i++) {
      const x = R() * C, y = P.H * 0.62 + R() * (ust - P.H * 0.62), r = 1.6 + R() * 2.4;
      sar(() => yildizCiz(c, x, y, r));
    }
  } else if (P.desen === "kar") {
    const n = Math.round(((C * (ust - alt)) / 260) * P.yogun);
    for (let i = 0; i < n; i++) {
      const r = 3 + R() * 6;
      const x = R() * C, y = alt + r + R() * (ust - alt - 2 * r);
      sar(() => karCiz(c, x, y, r));
    }
  } else {
    // Yıldızlı gece: hilal ay, yıldızlar, altta tepeler
    const ay = { x: C * 0.12, y: P.H * 0.7, r: Math.min(P.H * 0.12, 12) };
    sar(() => {
      c.beginPath(); c.arc(ay.x, ay.y, ay.r, 0, Math.PI * 2); c.fill();
      c.save(); c.globalCompositeOperation = "destination-out";
      c.beginPath(); c.arc(ay.x + ay.r * 0.45, ay.y + ay.r * 0.2, ay.r * 0.85, 0, Math.PI * 2); c.fill();
      c.restore();
      c.beginPath(); c.moveTo(0, 0);
      for (let x = 0; x <= C; x += 2) c.lineTo(x, alt + 6 + 5 * Math.sin((x / C) * Math.PI * 2 * 2 + 1) + 3 * Math.sin((x / C) * Math.PI * 2 * 5));
      c.lineTo(C, 0); c.closePath(); c.fill();
    });
    const n = Math.round(((C * (ust - P.H * 0.3)) / 160) * P.yogun);
    for (let i = 0; i < n; i++) {
      const x = R() * C, y = P.H * 0.3 + R() * (ust - P.H * 0.3);
      const r = R() < 0.7 ? 1.2 + R() * 1.2 : 2.4 + R() * 2.2;
      sar(() => (r < 2 ? (c.beginPath(), c.arc(x, y, r * 0.6, 0, Math.PI * 2), c.fill()) : yildizCiz(c, x, y, r)));
    }
  }

  // Yazı: ön yüzde (φ = −90° → u = 0.75), arkasında boş levha
  if (P.isim) {
    const tip = YAZI_TIPI[P.tip];
    const kx = C * 0.75, ky = P.H * 0.5;
    const kw = Math.min(C * 0.3, 90), kh = Math.min(P.H * 0.2, 26);
    c.save();
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.ellipse(kx, ky, kw * 0.62, kh * 0.95, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
    let boy = kh * 1.25;
    c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
    let m = c.measureText(P.isim);
    boy *= Math.min(1, kw / Math.max(1e-6, m.width));
    c.font = `${tip.agirlik} ${boy}px ${tip.aile}`;
    m = c.measureText(P.isim);
    const asc = m.actualBoundingBoxAscent || boy * 0.72, desc = m.actualBoundingBoxDescent || 0;
    c.save();
    c.translate(kx, ky);
    c.scale(1, -1);
    c.textAlign = "center";
    c.fillText(P.isim, 0, (asc - desc) / 2);
    c.restore();
  }

  // Yumuşatma. Sarkma yalnız motiflerin alt/üst kenarında olur (dik
  // basılan duvarda kalınlığın yükseklikle değiştiği yer): dikeyde
  // kutu ortalaması, geçiş uzunluğu ≥ 1,15 × kalınlık farkı → ≤ ~41°.
  // Yatayda yalnız hafif kenar yumuşatma: desen keskin kalır.
  const yumusak = document.createElement("canvas");
  yumusak.width = tuval.width;
  yumusak.height = tuval.height;
  const y = yumusak.getContext("2d", { willReadFrequently: true });
  y.filter = "blur(0.8px)";
  for (const dx of [-tuval.width, 0, tuval.width]) y.drawImage(tuval, dx, 0);
  const veri = y.getImageData(0, 0, yumusak.width, yumusak.height).data;
  const W = yumusak.width, Hh = yumusak.height;
  let v = new Float32Array(W * Hh);
  for (let i = 0, j = 3; i < v.length; i++, j += 4) v[i] = veri[j] / 255;
  const L = Math.max(1, Math.round((P.kalin - P.ince) * 1.15 * PX));
  for (let gecis = 0; gecis < 2; gecis++) {
    const yeni = new Float32Array(W * Hh);
    const yar = Math.floor(L / 2);
    for (let x = 0; x < W; x++) {
      let top = 0, say = 0;
      for (let yy = -yar; yy <= yar; yy++) if (yy >= 0 && yy < Hh) { top += v[yy * W + x]; say++; }
      for (let yy = 0; yy < Hh; yy++) {
        yeni[yy * W + x] = top / say;
        const cik = yy - yar, gir = yy + yar + 1;
        if (cik >= 0) { top -= v[cik * W + x]; say--; }
        if (gir < Hh) { top += v[gir * W + x]; say++; }
      }
    }
    v = yeni;
  }
  return { v, w: W, h: Hh };
}

function ornekle(D, u, t) {
  const x = (((u % 1) + 1) % 1) * D.w;
  const y = (1 - clamp(t, 0, 1)) * (D.h - 1);
  const x0 = Math.floor(x) % D.w, y0 = Math.floor(y);
  const x1 = (x0 + 1) % D.w, y1 = Math.min(D.h - 1, y0 + 1);
  const fx = x - Math.floor(x), fy = y - y0;
  const a = D.v[y0 * D.w + x0], b = D.v[y0 * D.w + x1], c = D.v[y1 * D.w + x0], d = D.v[y1 * D.w + x1];
  return a + (b - a) * fx + (c - a) * fy + (a - b - c + d) * fx * fy;
}

// ---------------------------------------------------------------- SAHNE
const S_ = sahneKur({ tuval: el("yf-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.05, -0.95, 0.32);
const matGun = malzeme(RENK.beyaz, { roughness: 0.55 });
const matIsik = new THREE.MeshBasicMaterial({ vertexColors: true, color: RENK.beyaz });
let isikAcik = false;
let SON = null;

// "Işığı yak" düğmesi (müşteri önizlemesi; ölçüme ve çıktıya girmez)
const altBar = document.createElement("div");
altBar.className = "yb-sahne-alt";
altBar.innerHTML = '<button type="button" class="yb-ikincil" id="yf-isik">💡 Işığı yak</button>';
document.querySelector(".yb-sahne").appendChild(altBar);
el("yf-isik").addEventListener("click", () => {
  isikAcik = !isikAcik;
  el("yf-isik").textContent = isikAcik ? "☀ Gündüz görünümü" : "💡 Işığı yak";
  if (SON) SON.ag.material = isikAcik ? matIsik : matGun;
  S_.sahne.background = isikAcik ? new THREE.Color(0x15161a) : null;
  S_.izgara.visible = !isikAcik && !VITRIN;
  S_.kirli = true;
});

function kur() {
  const P = oku();
  const ri0 = P.D / 2 - P.kalin;
  const ic = (t) => {
    if (P.bicim === "fici") return ri0 * (0.88 + 0.12 * Math.sin(Math.PI * t));
    if (P.bicim === "konik") return ri0 * (1 - 0.2 * t);
    return ri0;
  };
  const C = Math.PI * 2 * ri0;
  const desen = desenCiz(P, C);
  const fark = P.kalin - P.ince;
  const kalinlik = (t, f) => {
    const z = t * P.H;
    if (z < BANT || z > P.H - BANT) return P.kalin;
    // φ ∈ [0, 2π) → u = φ/2π; ön yüz (kameraya bakan, −Y) φ = 270° → u = 0.75.
    // φ arttıkça dışarıdan bakan için soldan sağa: yazı düz okunur.
    const u = f / (Math.PI * 2);
    const vv = ornekle(desen, u, t);
    return P.ters ? P.kalin - fark * vv : P.ince + fark * vv;
  };
  const M = clamp(Math.round(C / P.adim), 180, 640);
  const n = clamp(Math.round(P.H / P.adim), 80, 360);
  const g = kapKur({
    H: P.H, M, n,
    dis: (t, f) => ic(t) + kalinlik(t, f),
    ic: (t) => ic(t),
    taban: 0,
  });
  // Işık önizlemesi: geçen ışık ≈ e^(−k·kalınlık)
  const pos = g.attributes.position;
  const renk = new Float32Array(pos.count * 3);
  const sicak = new THREE.Color(0xffc777);
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i);
    const t = z / P.H;
    const r = Math.hypot(x, y);
    const k = Math.max(0, r - ic(t));
    const gecen = clamp(Math.exp(-1.35 * (k - P.ince)) * 1.05, 0.06, 1);
    renk[i * 3] = sicak.r * gecen + 0.03;
    renk[i * 3 + 1] = sicak.g * gecen + 0.02;
    renk[i * 3 + 2] = sicak.b * gecen + 0.015;
  }
  g.setAttribute("color", new THREE.BufferAttribute(renk, 3));

  matGun.color.setHex(RENK[P.renk] ?? RENK.beyaz);
  matIsik.color.setHex(RENK[P.renk] ?? RENK.beyaz);
  const a = ag(g, isikAcik ? matIsik : matGun, "fener");
  S_.modeliYaz([a]);
  const v = hacim(g);
  const kutleG = (v / 1000) * PLA;
  const sureSaat = v / 4.5 / 3600 + 0.3; // litofan: ince katman, yavaş
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, g, ag: a, v, olcum: { kutleG, sureSaat }, boyut, icCap: 2 * Math.min(ic(0), ic(1)) };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_YF = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `Ø${boyut.x.toFixed(0)} × ${boyut.z.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v, icCap } = SON;
  el("yf-olcu").textContent = `Ø${boyut.x.toFixed(0)} × ${boyut.z.toFixed(0)} mm`;
  const u = el("yf-uyari");
  const uyar = icCap < 40 ? "İç çap mum LED için dar: çapı büyütün" : "";
  u.hidden = !uyar;
  u.textContent = uyar;
  tabloYaz(el("yf-tablo"), [
    ["Dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Desen", `${P.desen} #${P.tohum} · %${Math.round(P.yogun * 100)}${P.ters ? " · motifler parlak" : ""}`],
    ["Duvar", `${P.ince}–${P.kalin} mm (bant ${BANT} mm)`],
    ["İç çap (en dar)", `${icCap.toFixed(1)} mm`],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(0)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `FENER_${P.desen}${P.tohum}_D${Math.round(P.D)}_H${Math.round(P.H)}_${P.renk}`;
}
el("yf-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.g], onEk()), `${onEk()}.stl`, "model/stl");
});
el("yf-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Desen", P.desen], ["Desen_no", P.tohum], ["Yogunluk", P.yogun], ["Motifler_parlak", P.ters ? "evet" : "hayir"],
    ["Yazi", P.isim], ["Cap_mm", P.D], ["Yukseklik_mm", P.H], ["Bicim", P.bicim], ["Duvar_mm", `${P.ince}-${P.kalin}`],
    ["Renk", P.renk], ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(0)], ["Sure_sa", o.sureSaat.toFixed(2)],
    ["Baski", "dik, %100 dolgu, 0.12 mm katman, beyaz/acik renk PLA"],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

const HAZIR = {
  orman: { "yf-desen": "orman", "yf-tohum": 8, "yf-yogun": 60, "yf-ters": false, "yf-isim": "" },
  kar: { "yf-desen": "kar", "yf-tohum": 21, "yf-yogun": 55, "yf-ters": true, "yf-isim": "" },
  gece: { "yf-desen": "gece", "yf-tohum": 5, "yf-yogun": 70, "yf-ters": true, "yf-isim": "" },
  isim: { "yf-desen": "orman", "yf-tohum": 14, "yf-yogun": 45, "yf-ters": false, "yf-isim": "Mutlu Yıllar" },
};
document.querySelectorAll("[data-hazir]").forEach((b) => {
  b.addEventListener("click", () => {
    alanlariYaz(HAZIR[b.dataset.hazir] || {});
    document.querySelectorAll("[data-hazir]").forEach((x) => x.classList.toggle("on", x === b));
  });
});
formBagla((t) => {
  if (t && ["yf-cap", "yf-yuk"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
if (document.fonts) {
  const yukle = Object.values(YAZI_TIPI).map((t) => document.fonts.load(`${t.agirlik} 40px ${t.aile}`, "ĞğŞşİıÖöÜüÇç2027"));
  Promise.allSettled(yukle).then(() => S_.yenile?.());
}
