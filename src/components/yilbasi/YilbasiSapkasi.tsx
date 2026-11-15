"use client";

import { useSyncExternalStore } from "react";
import { yilbasiAktif } from "@/lib/yilbasi";

// ==========================================
// LOGODAKİ YILBAŞI ŞAPKASI
//
// ADJY yazısının A'sının tepesine eğik oturan piksel bir şapka.
// Kenar çizgisi yazının rengini (currentColor) alır; açık ve koyu
// temada logoyla birlikte döner. Dönem dışında hiç görünmez.
//
// Tarih yalnızca tarayıcıda okunur (sunucu "yok" der), böylece
// sunucu HTML'i ile ilk render aynı kalır; şapka hidrasyondan
// hemen sonra belirir.
// ==========================================

// K: kenar (yazı rengi) · R: kırmızı · W: beyaz
const SATIRLAR = [
  "..........KKK",
  ".........KWWK",
  "......KKKKWWK",
  ".....KRRRKKK.",
  "....KRRRRRK..",
  "...KRRRRRRK..",
  "..KRRRRRRRK..",
  ".KKKKKKKKKKK.",
  ".KWWWWWWWWWK.",
  ".KKKKKKKKKKK.",
];

const RENK: Record<string, string> = {
  K: "currentColor",
  R: "var(--yilbasi-sapka)",
  W: "var(--yilbasi-on)",
};

const bos = () => () => {};

export function YilbasiSapkasi({ className }: { className?: string }) {
  const aktif = useSyncExternalStore(bos, () => yilbasiAktif(), () => false);
  if (!aktif) return null;

  return (
    <svg
      aria-hidden
      viewBox={`0 0 ${SATIRLAR[0].length} ${SATIRLAR.length}`}
      shapeRendering="crispEdges"
      className={className}
    >
      {SATIRLAR.flatMap((satir, y) =>
        [...satir].map((c, x) =>
          RENK[c] ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={RENK[c]} /> : null
        )
      )}
    </svg>
  );
}
