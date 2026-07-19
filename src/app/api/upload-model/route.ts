import { NextRequest, NextResponse } from "next/server";
import { cloudinary } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";

// ==========================================
// POST /api/upload-model
// Müşteri STL yüklemesi için Cloudinary imzası üretir.
// Dosya istemciden doğrudan Cloudinary'ye gider (9MB STL,
// Vercel'in istek gövdesi limitine sığmaz); bu endpoint
// yalnızca kısa ömürlü imza döndürür.
// ==========================================

const UPLOAD_FOLDER = "adjy/customer-models";

export async function POST(request: NextRequest) {
  try {
    const ip =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
    const { success } = await rateLimit(`upload-model:${ip}`, {
      windowMs: 60_000,
      max: 10,
    });
    if (!success) {
      return NextResponse.json({ error: "Çok fazla istek" }, { status: 429 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_SECRET) {
      return NextResponse.json(
        { error: "Cloudinary yapılandırılmamış" },
        { status: 500 }
      );
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const paramsToSign: Record<string, string | number> = {
      folder: UPLOAD_FOLDER,
      timestamp,
    };
    const signature = cloudinary.utils.api_sign_request(
      paramsToSign,
      process.env.CLOUDINARY_API_SECRET
    );

    return NextResponse.json({
      cloudName: process.env.CLOUDINARY_CLOUD_NAME,
      apiKey: process.env.CLOUDINARY_API_KEY,
      timestamp,
      folder: UPLOAD_FOLDER,
      signature,
    });
  } catch (error) {
    console.error("POST /api/upload-model error:", error);
    return NextResponse.json({ error: "İmza üretilemedi" }, { status: 500 });
  }
}
