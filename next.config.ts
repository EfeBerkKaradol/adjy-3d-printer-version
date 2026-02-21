import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,

  // AR model dosyalari icin CORS header'lari
  // iOS AR Quick Look ve Android Scene Viewer bunlari gerektirir
  async headers() {
    return [
      {
        // GLB dosyalari
        source: "/ar-models/:path*.glb",
        headers: [
          {
            key: "Content-Type",
            value: "model/gltf-binary",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=300",
          },
        ],
      },
      {
        // USDZ dosyalari (iOS AR Quick Look)
        source: "/ar-models/:path*.usdz",
        headers: [
          {
            key: "Content-Type",
            value: "model/vnd.usdz+zip",
          },
          {
            key: "Access-Control-Allow-Origin",
            value: "*",
          },
          {
            key: "Cache-Control",
            value: "public, max-age=300",
          },
        ],
      },
    ];
  },
};

export default nextConfig;
