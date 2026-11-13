"use client";

import { useEffect, useRef } from "react";
import { mix, shade, spriteFor, type Sprite } from "./sprites";

// ==========================================
// PİKSEL 3D YAZICI
//
// Tuval 104×100 "mantıksal" pikselden ibaret; CSS ile tam sayı
// katına büyütülür ve image-rendering: pixelated ile keskin kalır.
// Her karede sahnenin tamamı baştan çizilir — birkaç bin
// fillRect, bir telefonda bile önemsiz.
//
// Döngü (her ürün için):
//   ısınma → baskı (alttan yukarı, satır satır, yılan gibi) →
//   hazır (lamba yanar, bitki büyür) → parçalanıp kaybolur → sıradaki
//
// Bölüm ekrandan çıkınca ya da sekme gizlenince durur.
// Hareket azaltma açıksa tek bir bitmiş kare çizilir, döngü yok.
// ==========================================

export const PRINTER_W = 104;
export const PRINTER_H = 100;

const BED_Y = 81; // nesnenin alt satırı
const BED_CX = 52;
const GANTRY_IDLE = 30;
const NOZZLE_DROP = 9; // köprü üstünden baskı satırına mesafe

type Phase = "heat" | "print" | "done" | "eject";

const T_HEAT = 0.8;
const T_DONE = 2.4;
const T_EJECT = 0.9;

export interface PrinterTick {
  phase: Phase;
  /** 0…100 */
  percent: number;
}

interface Palette {
  frameDark: string;
  frame: string;
  frameHi: string;
  metal: string;
  metalHi: string;
  head: string;
  headDark: string;
  bed: string;
  bedHi: string;
  lcdBg: string;
  lcdOn: string;
  shadow: string;
}

const LIGHT: Palette = {
  frameDark: "#232327",
  frame: "#37373d",
  frameHi: "#5a5a63",
  metal: "#9b9ba4",
  metalHi: "#c9c9d0",
  head: "#f2f0ea",
  headDark: "#2b2b30",
  bed: "#3f464e",
  bedHi: "#5b6570",
  lcdBg: "#0f1b15",
  lcdOn: "#5ef2a0",
  shadow: "rgba(0,0,0,0.10)",
};

const DARK: Palette = {
  frameDark: "#3a3a42",
  frame: "#50505a",
  frameHi: "#7a7a86",
  metal: "#a4a4ae",
  metalHi: "#d6d6dc",
  head: "#f2f0ea",
  headDark: "#26262b",
  bed: "#4a535c",
  bedHi: "#6a7682",
  lcdBg: "#08110c",
  lcdOn: "#5ef2a0",
  shadow: "rgba(0,0,0,0.35)",
};

interface Cell {
  x: number;
  y: number;
  c: string;
}

/** Baskı sırası: alttan yukarı, her satırda yön değişir */
function cellsOf(s: Sprite): Cell[] {
  const out: Cell[] = [];
  let dir = 1;
  for (let y = s.h - 1; y >= 0; y--) {
    const row: Cell[] = [];
    for (let x = 0; x < s.w; x++) {
      const c = s.rows[y][x];
      if (c) row.push({ x, y, c });
    }
    if (dir < 0) row.reverse();
    out.push(...row);
    dir = -dir;
  }
  return out;
}

function hash(x: number, y: number) {
  const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453;
  return n - Math.floor(n);
}

interface Props {
  /** Basılacak nesnelerin sprite anahtarları, sırasıyla */
  keys: string[];
  reduceMotion: boolean;
  /** Yeni nesneye geçildiğinde */
  onObject?: (index: number) => void;
  /** Her karede değil, yüzde değiştikçe */
  onTick?: (tick: PrinterTick) => void;
  className?: string;
}

export function PixelPrinter({ keys, reduceMotion, onObject, onTick, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Geri çağrılar her render'da değişebilir; döngü yeniden kurulmasın
  const onObjectRef = useRef(onObject);
  const onTickRef = useRef(onTick);
  useEffect(() => {
    onObjectRef.current = onObject;
    onTickRef.current = onTick;
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (keys.length === 0) return;
    // Katalog büyük olabilir: sprite ve baskı sırası ancak sırası
    // gelince üretilir, sonra saklanır.
    const spriteCache: Sprite[] = [];
    const cellCache: Cell[][] = [];
    const spriteAt = (i: number) => (spriteCache[i] ??= spriteFor(keys[i]));
    const cellsAt = (i: number) => (cellCache[i] ??= cellsOf(spriteAt(i)));

    // Rastgele sıra: torba karıştırılır, bitince yeniden karıştırılır;
    // aynı ürün art arda gelmez.
    let torba: number[] = [];
    const sonraki = (onceki: number) => {
      if (torba.length === 0) {
        torba = keys.map((_, i) => i);
        for (let i = torba.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [torba[i], torba[j]] = [torba[j], torba[i]];
        }
        if (torba.length > 1 && torba[torba.length - 1] === onceki) torba.unshift(torba.pop()!);
      }
      return torba.pop()!;
    };

    // ---------- durum ----------
    let index = 0;
    let phase: Phase = "heat";
    let phaseT = 0;
    let clock = 0;
    let hx = 30;
    let gy = GANTRY_IDLE;
    let lastPercent = -1;
    let lastPhase: Phase | null = null;

    const printDuration = (i: number) =>
      Math.min(8, Math.max(5.5, cellsAt(i).length / 95));

    // ---------- çizim yardımcıları ----------
    const px = (x: number, y: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), 1, 1);
    };
    const rect = (x: number, y: number, w: number, h: number, c: string) => {
      ctx.fillStyle = c;
      ctx.fillRect(Math.round(x), Math.round(y), w, h);
    };

    const objLeft = (s: Sprite) => BED_CX - Math.floor(s.w / 2);
    const objTop = (s: Sprite) => BED_Y - s.h + 1;

    function drawGlow(s: Sprite, strength: number) {
      if (!s.glow || strength <= 0) return;
      const ox = objLeft(s) + s.glow.cx;
      const oy = objTop(s) + s.glow.cy;
      const r = s.glow.r;
      for (let y = -r; y <= r; y++) {
        for (let x = -r; x <= r; x++) {
          const d = Math.sqrt(x * x + y * y) / r;
          if (d > 1) continue;
          // Dama deseniyle titreşim: piksel sanatına uygun yumuşak hale
          if (d > 0.6 && (x + y) % 2 !== 0) continue;
          ctx!.globalAlpha = strength * 0.6 * (1 - d) * (1 - d);
          px(ox + x, oy + y, s.glow.color);
        }
      }
      ctx!.globalAlpha = 1;
    }

    function drawSpool(p: Palette, s: Sprite, spin: number) {
      // Makara: üst çubuğun sağ ucunda, dönerken bir işaret pikseli dolaşır
      const cx = 80;
      const cy = 9;
      rect(86, 6, 2, 12, p.frame);
      for (let y = -7; y <= 7; y++) {
        for (let x = -7; x <= 7; x++) {
          const d = Math.sqrt(x * x + y * y);
          if (d > 7.2) continue;
          let c = d > 6 ? p.metal : d > 2.2 ? s.filament : p.frameDark;
          if (d > 2.2 && d <= 6 && x < -1 && y < -1) c = shade(s.filament, 0.25);
          if (d > 2.2 && d <= 6 && x > 1 && y > 1) c = shade(s.filament, -0.2);
          px(cx + x, cy + y, c);
        }
      }
      const a = spin;
      px(cx + Math.cos(a) * 4.4, cy + Math.sin(a) * 4.4, shade(s.filament, 0.55));
      px(cx + Math.cos(a) * 1.2, cy + Math.sin(a) * 1.2, p.metalHi);
    }

    function drawFrame(p: Palette) {
      // üst çubuk
      rect(12, 18, 80, 3, p.frame);
      rect(12, 18, 80, 1, p.frameHi);
      // dikmeler
      rect(12, 18, 4, 69, p.frame);
      rect(88, 18, 4, 69, p.frame);
      rect(12, 18, 1, 69, p.frameHi);
      rect(88, 18, 1, 69, p.frameHi);
      // vidalı miller
      for (let y = 21; y < 85; y++) {
        const c = y % 2 === 0 ? p.metal : p.metalHi;
        px(18, y, c);
        px(85, y, c);
      }
    }

    function drawBed(p: Palette) {
      rect(34, 84, 36, 2, p.frameDark);
      rect(26, 82, 52, 2, p.bed);
      for (let x = 26; x < 78; x++) if (x % 3 === 0) px(x, 82, p.bedHi);
    }

    function drawBase(p: Palette, s: Sprite, percent: number) {
      rect(10, 98, 84, 2, p.shadow);
      rect(6, 86, 92, 10, p.frameDark);
      rect(6, 86, 92, 1, p.frameHi);
      rect(8, 96, 6, 2, p.frameDark);
      rect(90, 96, 6, 2, p.frameDark);
      // ekran
      rect(41, 88, 22, 6, p.frame);
      rect(42, 89, 20, 4, p.lcdBg);
      if (phase === "heat") {
        // ısınırken yanıp sönen sıcaklık çubukları
        const on = Math.floor(clock * 6) % 2 === 0;
        for (let i = 0; i < 6; i++) px(44 + i * 3, 90, on ? "#ffa04d" : "#5a2e14");
      } else {
        const fill = Math.round((percent / 100) * 18);
        rect(43, 91, 18, 1, "#123526");
        if (fill > 0) rect(43, 91, fill, 1, p.lcdOn);
        // üst satırda kayan iki piksel: "çalışıyor"
        const k = Math.floor(clock * 8) % 18;
        px(43 + k, 89, phase === "done" ? p.lcdOn : shade(p.lcdOn, -0.5));
        if (phase === "done") rect(43, 89, 18, 1, shade(p.lcdOn, -0.35));
      }
      // ayar düğmesi
      rect(67, 89, 3, 3, p.metal);
      px(68, 89, p.metalHi);
      // filamenti hatırlatan küçük renk şeridi
      rect(16, 90, 6, 2, s.filament);
    }

    function drawTube(p: Palette, s: Sprite) {
      // Bowden borusu: makaradan kafaya yumuşak bir eğri
      const x0 = 74;
      const y0 = 15;
      const x1 = hx + 2;
      const y1 = gy - 5;
      const cx = (x0 + x1) / 2 + 6;
      const cy = Math.min(y0, y1) - 8;
      let prevX = -1;
      let prevY = -1;
      for (let i = 0; i <= 48; i++) {
        const t = i / 48;
        const x = Math.round((1 - t) * (1 - t) * x0 + 2 * (1 - t) * t * cx + t * t * x1);
        const y = Math.round((1 - t) * (1 - t) * y0 + 2 * (1 - t) * t * cy + t * t * y1);
        if (x === prevX && y === prevY) continue;
        px(x, y, mix(p.metalHi, s.filament, 0.35));
        prevX = x;
        prevY = y;
      }
    }

    function drawHead(p: Palette, printing: boolean) {
      const x = Math.round(hx);
      const y = Math.round(gy);
      // X köprüsü
      rect(12, y, 80, 3, p.frame);
      rect(12, y, 80, 1, p.frameHi);
      // kafa gövdesi
      rect(x - 6, y - 4, 12, 11, p.headDark);
      rect(x - 5, y - 3, 10, 9, p.head);
      rect(x - 5, y - 3, 10, 1, "#ffffff");
      // fan: dönen pervane
      rect(x - 3, y - 1, 6, 6, p.headDark);
      const f = Math.floor(clock * (printing ? 14 : 4)) % 2;
      if (f === 0) {
        px(x - 1, y + 1, p.metal);
        px(x, y + 2, p.metal);
        px(x - 2, y, p.metal);
        px(x + 1, y + 3, p.metal);
      } else {
        px(x, y + 1, p.metal);
        px(x - 1, y + 2, p.metal);
        px(x + 1, y, p.metal);
        px(x - 2, y + 3, p.metal);
      }
      // durum ışığı
      px(x + 3, y - 2, printing ? (Math.floor(clock * 4) % 2 ? "#4ade80" : "#16a34a") : "#3f6b4f");
      // ısıtıcı blok ve meme
      rect(x - 2, y + 7, 4, 1, p.metal);
      rect(x - 1, y + 8, 2, 1, "#d4a24a");
      if (printing) {
        px(x, y + 8, "#ff8a3d");
      }
    }

    function drawObject(s: Sprite, cells: Cell[], shown: number, ejectT: number) {
      const ox = objLeft(s);
      const oy = objTop(s);
      const lift = ejectT > 0 ? Math.round(ejectT * 6) : 0;
      const HOT = 26;
      for (let i = 0; i < shown; i++) {
        const c = cells[i];
        if (ejectT > 0 && hash(c.x, c.y) < ejectT * 1.15 - 0.1) continue;
        const age = shown - 1 - i;
        const col = age < HOT ? mix("#ffb25e", c.c, age / HOT) : c.c;
        px(ox + c.x, oy + c.y - lift, col);
      }
    }

    function drawExtras(s: Sprite, t: number, ejectT: number) {
      if (!s.extras) return;
      const ox = objLeft(s);
      const oy = objTop(s);
      const lift = ejectT > 0 ? Math.round(ejectT * 6) : 0;
      for (const e of s.extras) {
        if (t < e.delay) continue;
        if (ejectT > 0 && hash(e.x + 50, e.y + 50) < ejectT * 1.15 - 0.1) continue;
        if (e.blink && Math.floor((clock + e.delay * 7) * 3) % 3 === 0) continue;
        px(ox + e.x, oy + e.y - lift, e.color);
      }
    }

    function render() {
      // Tema sınıfı her karede okunur; tema değişimi anında yansır
      const p = document.documentElement.classList.contains("dark") ? DARK : LIGHT;
      const s = spriteAt(index);
      const cells = cellsAt(index);
      ctx!.clearRect(0, 0, PRINTER_W, PRINTER_H);

      let shown = 0;
      let percent = 0;
      let glow = 0;
      let ejectT = 0;
      let doneT = 0;
      if (phase === "print") {
        const k = Math.min(1, phaseT / printDuration(index));
        shown = Math.floor(k * cells.length);
        percent = Math.round(k * 100);
      } else if (phase === "done") {
        shown = cells.length;
        percent = 100;
        doneT = phaseT;
        glow = Math.min(1, phaseT / 0.5);
      } else if (phase === "eject") {
        shown = cells.length;
        percent = 100;
        doneT = T_DONE + phaseT;
        ejectT = Math.min(1, phaseT / T_EJECT);
        glow = 1 - ejectT;
      }

      drawGlow(s, glow);
      drawSpool(p, s, clock * (phase === "print" ? 3.2 : 0.4));
      drawFrame(p);
      drawBed(p);
      drawObject(s, cells, shown, ejectT);
      if (phase === "done" || phase === "eject") drawExtras(s, doneT, ejectT);
      drawTube(p, s);
      drawHead(p, phase === "print");
      drawBase(p, s, percent);

      if (percent !== lastPercent || phase !== lastPhase) {
        lastPercent = percent;
        lastPhase = phase;
        onTickRef.current?.({ phase, percent });
      }
      return shown;
    }

    function step(dt: number) {
      clock += dt;
      phaseT += dt;
      const s = spriteAt(index);
      const cells = cellsAt(index);

      // kafa hedefi
      let tx = 24;
      let ty = GANTRY_IDLE;
      if (phase === "heat") {
        tx = objLeft(s) + (cells[0]?.x ?? 0);
        ty = BED_Y - NOZZLE_DROP;
      } else if (phase === "print") {
        const k = Math.min(1, phaseT / printDuration(index));
        const i = Math.min(cells.length - 1, Math.floor(k * cells.length));
        const c = cells[i];
        tx = objLeft(s) + c.x;
        ty = objTop(s) + c.y - NOZZLE_DROP;
      }
      const follow = phase === "print" ? 26 : 5;
      hx += (tx - hx) * (1 - Math.exp(-dt * follow));
      gy += (ty - gy) * (1 - Math.exp(-dt * (phase === "print" ? 14 : 4)));

      // faz geçişleri
      if (phase === "heat" && phaseT >= T_HEAT) {
        phase = "print";
        phaseT = 0;
      } else if (phase === "print" && phaseT >= printDuration(index)) {
        phase = "done";
        phaseT = 0;
      } else if (phase === "done" && phaseT >= T_DONE) {
        phase = "eject";
        phaseT = 0;
      } else if (phase === "eject" && phaseT >= T_EJECT) {
        index = sonraki(index);
        phase = "heat";
        phaseT = 0;
        onObjectRef.current?.(index);
      }
    }

    // ---------- hareket azaltma: tek kare ----------
    if (reduceMotion) {
      const lamba = keys.indexOf("mantar");
      index = lamba >= 0 ? lamba : 0;
      phase = "done";
      phaseT = 1;
      clock = 0;
      hx = 24;
      gy = GANTRY_IDLE;
      render();
      onObjectRef.current?.(index);
      // Tema değişince yeniden çizilsin diye gözlemci
      const mo = new MutationObserver(() => render());
      mo.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
      return () => mo.disconnect();
    }

    // ---------- döngü ----------
    let raf = 0;
    let last = 0;
    let visible = true;
    let running = false;

    const frame = (now: number) => {
      const dt = last ? Math.min(0.05, (now - last) / 1000) : 0;
      last = now;
      step(dt);
      render();
      raf = requestAnimationFrame(frame);
    };
    const start = () => {
      if (running) return;
      running = true;
      last = 0;
      raf = requestAnimationFrame(frame);
    };
    const stop = () => {
      running = false;
      cancelAnimationFrame(raf);
    };
    const sync = () => (visible && !document.hidden ? start() : stop());

    const io = new IntersectionObserver(
      ([entry]) => {
        visible = entry.isIntersecting;
        sync();
      },
      { threshold: 0 }
    );
    io.observe(canvas);
    document.addEventListener("visibilitychange", sync);
    index = sonraki(-1);
    onObjectRef.current?.(index);
    render();
    sync();

    return () => {
      stop();
      io.disconnect();
      document.removeEventListener("visibilitychange", sync);
    };
  }, [keys, reduceMotion]);

  return (
    <canvas
      ref={canvasRef}
      width={PRINTER_W}
      height={PRINTER_H}
      aria-hidden
      className={className}
      style={{ imageRendering: "pixelated" }}
    />
  );
}
