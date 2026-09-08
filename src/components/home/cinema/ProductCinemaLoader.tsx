"use client";

import dynamic from "next/dynamic";
import type { CinemaProduct } from "./ProductCinema";

// ==========================================
// SAHNE YÜKLEYİCİ
//
// three.js tarayıcıya ait; sunucuda render edilmez.
// Yer tutucu bölümle aynı yüksekliği kaplar, böylece
// sahne devreye girerken sayfa zıplamaz.
// ==========================================

const ProductCinema = dynamic(
  () => import("./ProductCinema").then((m) => m.ProductCinema),
  {
    ssr: false,
    loading: () => (
      <div
        style={{ height: "300vh" }}
        className="relative"
        aria-hidden
      >
        <div className="sticky top-0 h-screen bg-[#DBD8D0]" />
      </div>
    ),
  }
);

export function ProductCinemaLoader({ product }: { product?: CinemaProduct | null }) {
  return <ProductCinema product={product} />;
}
