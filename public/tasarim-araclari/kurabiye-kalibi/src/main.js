/* ==========================================================================
   YILBAŞI KURABİYE KALIBI

   Kurabiye şekli S tuvale çizilir (bkz. ../_adjy/arac-ortak.js):
     bıçak   → S'in hemen DIŞINDA b kalınlığında bant: kurabiye tam S
               biçiminde kesilir. Son 3 mm 0,55·b'ye incelir (keskin kenar).
     kenar   → bıçağın çevresinde daha geniş bant, tablaya oturan tutma
               kenarı; bastırırken parmağı korur. İsteğe bağlı asma deliği.
   Ölçü: şekil önce kaba çizilir, dış hattının gerçek boyu ölçülür, sonra
   istenen kurabiye boyuna ölçeklenip yeniden çizilir.

   Baskı: kenar tablada, bıçak yukarı; desteksiz.
   ========================================================================== */
import {
  THREE, el, sayi, clamp, VITRIN, sahneKur, malzeme, ag, hacim, stl, indir, csv,
  formBagla, tabloYaz, sureYaz, maske, maskeBirlestir, konturlar, sekiller, ekstrude,
  genislet, maskeKopya, PLA,
} from "../../_adjy/arac-ortak.js";

if (VITRIN) document.documentElement.classList.add("yb-vitrin");

const RENK = {
  kirmizi: 0xc4202b, yesil: 0x1f6b3a, beyaz: 0xf3f1ea, altin: 0xd2a347,
  gumus: 0xb9bcc2, pembe: 0xe58fb0, mavi: 0x5d9bd8, siyah: 0x25262a,
};
const UST_INCE = 3; // bıçağın incelen son kısmı (mm)

// Birim çizimler (yaklaşık 1 birim), +Y yukarı. Çizgiler yuvarlak uçlu.
function cizgi(c, pts, w) {
  c.save();
  c.lineWidth = w;
  c.lineCap = "round";
  c.lineJoin = "round";
  c.beginPath();
  pts.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
  c.stroke();
  c.restore();
}
function daire(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, Math.PI * 2);
  c.fill();
}
const SEKIL = {
  yildiz: { ad: "Yıldız", ciz(c) {
    const R = 0.5, r = 0.21;
    c.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = Math.PI / 2 + (i * Math.PI) / 5, q = i % 2 ? r : R;
      i ? c.lineTo(q * Math.cos(a), q * Math.sin(a)) : c.moveTo(q * Math.cos(a), q * Math.sin(a));
    }
    c.closePath();
    c.fill();
    c.lineJoin = "round";
    c.lineWidth = 0.05;
    c.stroke();
  } },
  agac: { ad: "Çam", ciz(c) {
    c.beginPath();
    for (const [g, y0, y1] of [[0.92, -0.32, 0.02], [0.74, -0.1, 0.24], [0.54, 0.1, 0.48]]) {
      c.moveTo(-g / 2, y0); c.lineTo(g / 2, y0); c.lineTo(0, y1); c.closePath();
    }
    c.rect(-0.08, -0.48, 0.16, 0.18);
    c.fill();
    c.lineJoin = "round";
    c.lineWidth = 0.04;
    c.stroke();
  } },
  kardan: { ad: "Kardan adam", ciz(c) {
    daire(c, 0, 0.26, 0.17);
    daire(c, 0, -0.18, 0.28);
    c.fillRect(-0.12, 0.4, 0.24, 0.11);
    c.fillRect(-0.18, 0.39, 0.36, 0.035);
  } },
  can: { ad: "Çan", ciz(c) {
    c.beginPath();
    c.moveTo(0, 0.38);
    c.bezierCurveTo(0.2, 0.38, 0.27, 0.22, 0.28, 0.03);
    c.bezierCurveTo(0.29, -0.15, 0.36, -0.22, 0.47, -0.29);
    c.lineTo(0.47, -0.35); c.lineTo(-0.47, -0.35); c.lineTo(-0.47, -0.29);
    c.bezierCurveTo(-0.36, -0.22, -0.29, -0.15, -0.28, 0.03);
    c.bezierCurveTo(-0.27, 0.22, -0.2, 0.38, 0, 0.38);
    c.closePath();
    c.fill();
    daire(c, 0, -0.41, 0.075);
    daire(c, 0, 0.43, 0.06);
  } },
  kurabiye: { ad: "Kurabiye adam", ciz(c) {
    daire(c, 0, 0.33, 0.155);
    c.beginPath();
    c.ellipse(0, 0, 0.18, 0.23, 0, 0, Math.PI * 2);
    c.fill();
    cizgi(c, [[-0.36, 0.11], [0.36, 0.11]], 0.15);
    cizgi(c, [[-0.06, -0.1], [-0.21, -0.46]], 0.16);
    cizgi(c, [[0.06, -0.1], [0.21, -0.46]], 0.16);
  } },
  eldiven: { ad: "Eldiven", ciz(c) {
    c.beginPath();
    c.roundRect(-0.21, -0.36, 0.42, 0.78, 0.2);
    c.fill();
    c.beginPath();
    c.roundRect(-0.24, -0.5, 0.48, 0.17, 0.04);
    c.fill();
    c.save();
    c.translate(0.24, -0.02);
    c.rotate(-0.55);
    c.beginPath();
    c.ellipse(0, 0, 0.09, 0.17, 0, 0, Math.PI * 2);
    c.fill();
    c.restore();
  } },
  baston: { ad: "Şeker baston", ciz(c) {
    c.save();
    c.lineWidth = 0.15;
    c.lineCap = "round";
    c.beginPath();
    c.moveTo(0.09, -0.48);
    c.lineTo(0.09, 0.22);
    c.arc(-0.08, 0.22, 0.17, 0, Math.PI, false);
    c.stroke();
    c.restore();
  } },
  kalp: { ad: "Kalp", ciz(c) {
    c.beginPath();
    c.moveTo(0, -0.42);
    c.bezierCurveTo(-0.16, -0.3, -0.48, -0.1, -0.48, 0.15);
    c.bezierCurveTo(-0.48, 0.36, -0.31, 0.45, -0.2, 0.45);
    c.bezierCurveTo(-0.08, 0.45, -0.01, 0.38, 0, 0.3);
    c.bezierCurveTo(0.01, 0.38, 0.08, 0.45, 0.2, 0.45);
    c.bezierCurveTo(0.31, 0.45, 0.48, 0.36, 0.48, 0.15);
    c.bezierCurveTo(0.48, -0.1, 0.16, -0.3, 0, -0.42);
    c.closePath();
    c.fill();
  } },
  ev: { ad: "Ev", ciz(c) {
    c.beginPath();
    c.moveTo(-0.46, 0.06); c.lineTo(0, 0.46); c.lineTo(0.46, 0.06); c.closePath();
    c.fill();
    c.fillRect(-0.36, -0.46, 0.72, 0.54);
    c.fillRect(0.17, 0.18, 0.11, 0.24);
  } },
  kar: { ad: "Kar tanesi", ciz(c) {
    for (let i = 0; i < 6; i++) {
      c.save();
      c.rotate((i * Math.PI) / 3);
      cizgi(c, [[0, 0], [0, 0.46]], 0.09);
      cizgi(c, [[0, 0.27], [0.12, 0.39]], 0.075);
      cizgi(c, [[0, 0.27], [-0.12, 0.39]], 0.075);
      c.restore();
    }
    daire(c, 0, 0, 0.12);
  } },
};

function oku() {
  return {
    sekil: SEKIL[el("kk-sekil").value] ? el("kk-sekil").value : "yildiz",
    boy: clamp(sayi("kk-boy", 75), 40, 130),
    derin: clamp(sayi("kk-derin", 13), 8, 22),
    kenar: clamp(sayi("kk-kenar", 4.5), 2, 8),
    aski: el("kk-aski").checked,
    renk: el("kk-renk").value,
    bicak: clamp(sayi("kk-bicak", 1.0), 0.8, 1.8),
    kenarKal: clamp(sayi("kk-kenar-kal", 2), 1.2, 3),
    px: clamp(sayi("kk-cozunurluk", 10), 6, 16),
  };
}

/** Şekli çizer; k: birimden mm'ye ölçek */
function sekilMaskesi(S, k, gen, yuk, px) {
  return maske(gen, yuk, px, (c) => {
    c.save();
    c.scale(k, k);
    S.ciz(c);
    c.restore();
  });
}

function sinirlar(donguler) {
  let x0 = Infinity, x1 = -Infinity, y0 = Infinity, y1 = -Infinity;
  for (const d of donguler) for (const q of d) {
    x0 = Math.min(x0, q.x); x1 = Math.max(x1, q.x); y0 = Math.min(y0, q.y); y1 = Math.max(y1, q.y);
  }
  return { x0, x1, y0, y1, w: x1 - x0, h: y1 - y0 };
}

const S_ = sahneKur({ tuval: el("kk-tuval"), kutu: document.querySelector(".yb-sahne") });
S_.bakis.set(-0.2, -0.75, 0.9);
const mat = malzeme(RENK.kirmizi, { roughness: 0.45 });
let SON = null;

function kur() {
  const P = oku();
  const S = SEKIL[P.sekil];
  // 1) Kaba çizimle gerçek boyu ölç (100 mm birim)
  const kaba = sekilMaskesi(S, 100, 140, 140, 2);
  const b0 = sinirlar(konturlar(kaba, 0.2));
  const k = (100 * P.boy) / Math.max(1e-6, Math.max(b0.w, b0.h));
  const pay = P.bicak + P.kenar + (P.aski ? 12 : 2);
  const gen = (b0.w * k) / 100 + pay * 2 + 4;
  const yuk = (b0.h * k) / 100 + pay * 2 + 4;
  // Şekil tuvalin ortasına: kaba ölçümdeki merkez kayması düzeltilir
  const cx = ((b0.x0 + b0.x1) / 2) * (k / 100), cy = ((b0.y0 + b0.y1) / 2) * (k / 100);
  const S2 = { ciz: (c) => { c.translate(-cx / k, -cy / k); S.ciz(c); } };

  // 2) Asıl maske ve bantlar
  const sk = sekilMaskesi(S2, k, gen, yuk, P.px);
  const bicak = genislet(maskeKopya(sk), P.bicak);
  maskeBirlestir(bicak, sk, "destination-out");
  const ince = genislet(maskeKopya(sk), P.bicak * 0.55);
  maskeBirlestir(ince, sk, "destination-out");
  const kenar = genislet(maskeKopya(sk), P.bicak + P.kenar);
  const ustY = (b0.h * k) / 200;
  if (P.aski) {
    const c = kenar.ctx;
    c.save();
    c.translate(kenar.w / 2, kenar.h / 2);
    c.scale(P.px, -P.px);
    c.fillStyle = "#fff";
    const hy = ustY + P.bicak + P.kenar + 3.2;
    c.beginPath();
    c.arc(0, hy, 4.6, 0, Math.PI * 2);
    c.fill();
    c.fillRect(-3, ustY, 6, hy - ustY);
    c.globalCompositeOperation = "destination-out";
    c.beginPath();
    c.arc(0, hy, 2, 0, Math.PI * 2);
    c.fill();
    c.restore();
  }
  maskeBirlestir(kenar, sk, "destination-out");

  const govdeH = Math.max(2, P.derin - UST_INCE);
  const gKenar = ekstrude(sekiller(konturlar(kenar)), P.kenarKal, 0);
  const gBicak = ekstrude(sekiller(konturlar(bicak)), govdeH, P.kenarKal);
  const gUst = ekstrude(sekiller(konturlar(ince)), UST_INCE, P.kenarKal + govdeH);
  mat.color.setHex(RENK[P.renk] ?? RENK.kirmizi);
  S_.modeliYaz([ag(gKenar, mat, "kenar"), ag(gBicak, mat, "bicak"), ag(gUst, mat, "bicak-ucu")]);
  const v = hacim(gKenar) + hacim(gBicak) + hacim(gUst);
  const kutleG = (v / 1000) * PLA;
  const sureSaat = v / 6 / 3600 + 0.2;
  const boyut = S_.kutu.getSize(new THREE.Vector3());
  SON = { P, gKenar, gBicak, gUst, v, olcum: { kutleG, sureSaat }, boyut, kurabiye: { w: (b0.w * k) / 100, h: (b0.h * k) / 100 } };
  bilgiYaz();
  if (!S_.elleOynandi) S_.ortala();
  window.__ADJY_KK = {
    hazir: true,
    olcum: SON.olcum,
    olcu: `Kurabiye ${SON.kurabiye.w.toFixed(0)} × ${SON.kurabiye.h.toFixed(0)} mm`,
  };
}

function bilgiYaz() {
  const { P, boyut, olcum: o, v, kurabiye } = SON;
  el("kk-olcu").textContent = `Kurabiye ${kurabiye.w.toFixed(0)} × ${kurabiye.h.toFixed(0)} mm · kalıp ${boyut.z.toFixed(0)} mm`;
  const u = el("kk-uyari");
  u.hidden = true;
  tabloYaz(el("kk-tablo"), [
    ["Şekil", SEKIL[P.sekil].ad],
    ["Kurabiye", `${kurabiye.w.toFixed(1)} × ${kurabiye.h.toFixed(1)} mm`],
    ["Kalıp dış ölçü", `${boyut.x.toFixed(1)} × ${boyut.y.toFixed(1)} × ${boyut.z.toFixed(1)} mm`],
    ["Bıçak", `${P.bicak} mm → uçta ${(P.bicak * 0.55).toFixed(2)} mm`],
    ["Hacim", `${(v / 1000).toFixed(1)} cm³`],
    ["Filament (PLA)", `${o.kutleG.toFixed(1)} g`],
    ["Baskı süresi ≈", sureYaz(o.sureSaat)],
  ]);
}

function onEk() {
  const P = SON.P;
  return `KURABIYE_KALIBI_${P.sekil}_${Math.round(P.boy)}mm_${P.renk}`;
}
el("kk-stl").addEventListener("click", () => {
  if (!SON) return;
  indir(stl([SON.gKenar, SON.gBicak, SON.gUst], onEk()), `${onEk()}.stl`, "model/stl");
});
el("kk-csv").addEventListener("click", () => {
  if (!SON) return;
  const { P, boyut, olcum: o, kurabiye } = SON;
  indir(csv([
    ["Alan", "Deger"], ["Sekil", SEKIL[P.sekil].ad], ["Kurabiye_mm", `${kurabiye.w.toFixed(1)} x ${kurabiye.h.toFixed(1)}`],
    ["Kesme_derinligi_mm", P.derin], ["Tutma_kenari_mm", P.kenar], ["Bicak_mm", P.bicak], ["Asma_deligi", P.aski ? "evet" : "hayir"],
    ["Renk", P.renk], ["Olcu_mm", `${boyut.x.toFixed(1)} x ${boyut.y.toFixed(1)} x ${boyut.z.toFixed(1)}`],
    ["Kutle_g_PLA", o.kutleG.toFixed(1)], ["Sure_sa", o.sureSaat.toFixed(2)],
  ]), `${onEk()}_bilgi.csv`, "text/csv;charset=utf-8");
});

formBagla((t) => {
  if (t && ["kk-sekil", "kk-boy"].includes(t.id)) S_.elleOynandi = false;
  S_.yenile?.();
});
S_.dongu(kur);
