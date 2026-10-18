import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  reactCompiler: true,

  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },

  // Eski bağlantılar, yer imleri ve dış linkler kırılmasın diye
  // kalıcı yönlendirmeler.
  //
  // Ürün adresleri bir kez değişti: adlar ürün brifinginden
  // geliyordu ve teknik terim taşıyordu ("…-coil-…",
  // "…-tealight-lantern", "…-e14-e27"). Adlar sadeleşince
  // adresler de sadeleşti.
  async redirects() {
    return [
      {
        source: "/customize/:productId",
        destination: "/configure/:productId",
        permanent: true,
      },
      { source: "/products/mantar-formlu-masa-gece-lambasi-kablolu-e14-e27", destination: "/products/mantar-masa-lambasi", permanent: true },
      { source: "/products/kisiye-ozel-fotografli-litofan-lamba-kup-silindir", destination: "/products/fotografli-litofan-gece-lambasi", permanent: true },
      { source: "/products/ay-litofan-lamba-standli-dalgali-taban", destination: "/products/ay-gece-lambasi", permanent: true },
      { source: "/products/heykelsi-samdan-ince-mum-icin", destination: "/products/heykelsi-samdan", permanent: true },
      { source: "/products/kul-tutuculu-tutsuluk-2-si-1-arada", destination: "/products/kul-tutuculu-tutsuluk", permanent: true },
      { source: "/products/isikli-yilbasi-koy-evi-tealight-lantern", destination: "/products/isikli-minyatur-ev", permanent: true },
      { source: "/products/cok-renkli-kisisellestirilebilir-yilbasi-susu-seti", destination: "/products/isme-ozel-sus-seti", permanent: true },
      { source: "/products/boyanabilir-alci-figur-seti-coklu-boya-firca-dahil", destination: "/products/boyanabilir-alci-figur-seti", permanent: true },
      { source: "/products/tekli-hediye-kutulu-alci-boyama-kiti-figur-boya-firca", destination: "/products/hediye-kutulu-alci-boyama-seti", permanent: true },
      { source: "/products/minimal-low-poly-kedi-biblo-seti", destination: "/products/minimal-kedi-biblo-seti", permanent: true },
      { source: "/products/soyut-sarilan-cift-heykeli", destination: "/products/sarilan-cift-heykeli", permanent: true },
      { source: "/products/kulaklik-standi-telefon-yuvasi-kalemlik-tepsi-birlesik-masa-istasyonu", destination: "/products/kulaklik-standli-masa-duzenleyici", permanent: true },
      { source: "/products/oyun-kolu-ps5-xbox-standi-tekli-ciftli", destination: "/products/oyun-kolu-standi", permanent: true },
      { source: "/products/gizli-hazneli-kendinden-sulamali-saksi", destination: "/products/kendinden-sulamali-saksi", permanent: true },
      { source: "/products/deney-tuplu-koklendirme-istasyonu", destination: "/products/cam-tuplu-koklendirme-standi", permanent: true },
      { source: "/products/ayakli-saksi-yukseltici-stand", destination: "/products/ayakli-saksi", permanent: true },
      { source: "/products/isikli-vintage-seramik-yilbasi-agaci-masaustu", destination: "/products/isikli-masaustu-yilbasi-agaci", permanent: true },
      { source: "/products/findikkiran-asker-figuru-cok-renkli-fdm-boyanabilir-alci-kit", destination: "/products/findikkiran-asker-figuru", permanent: true },
      { source: "/products/heykelsi-fiyonk-sus-agac-tepeligi", destination: "/products/fiyonk-agac-tepeligi", permanent: true },
      { source: "/products/sirk-cizgili-fun-haus-fistolu-agizli-vazo-saksi", destination: "/products/cizgili-fistolu-vazo", permanent: true },
      { source: "/products/afrohemian-berberi-motifli-kabartma-saksi", destination: "/products/berberi-motifli-kabartma-saksi", permanent: true },
      { source: "/products/elde-sarilmis-coil-comlek-dokulu-vazo", destination: "/products/comlek-dokulu-vazo", permanent: true },
    ];
  },

  async headers() {
    return [
      // Guvenlik basiklari — tum route'lar
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-DNS-Prefetch-Control", value: "on" },
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(self), microphone=(), geolocation=()",
          },
        ],
      },
      // AR model dosyalari /api/ar GET handler uzerinden servis edilir
      // (headers response'a eklenir, static config gerekmez)
    ];
  },
};

export default nextConfig;
