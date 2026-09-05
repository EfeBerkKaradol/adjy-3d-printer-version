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

  // Konfigüratör /customize'tan /configure'a taşındı.
  // Eski bağlantılar, yer imleri ve dış linkler kırılmasın diye kalıcı yönlendirme.
  async redirects() {
    return [
      {
        source: "/customize/:productId",
        destination: "/configure/:productId",
        permanent: true,
      },
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
