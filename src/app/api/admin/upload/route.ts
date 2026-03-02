import { NextRequest, NextResponse } from "next/server";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { cloudinary } from "@/lib/cloudinary";
import { rateLimit } from "@/lib/rate-limit";

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin();
  if (isUnauthorized(authResult)) return authResult;

  try {
    const { success } = await rateLimit(`upload:${authResult.userId}`, { windowMs: 60_000, max: 20 });
    if (!success) {
      return NextResponse.json({ error: "Cok fazla istek" }, { status: 429 });
    }

    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "Sadece JPEG, PNG ve WebP desteklenir" }, { status: 400 });
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "Dosya boyutu en fazla 5MB olabilir" }, { status: 400 });
    }

    if (!process.env.CLOUDINARY_CLOUD_NAME) {
      return NextResponse.json({ error: "Cloudinary yapilandirilmamis" }, { status: 500 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);

    const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
      cloudinary.uploader
        .upload_stream(
          {
            folder: "adjy/products",
            resource_type: "image",
            transformation: [{ width: 800, height: 800, crop: "limit", quality: "auto" }],
          },
          (error, result) => {
            if (error || !result) reject(error || new Error("Upload failed"));
            else resolve(result);
          }
        )
        .end(buffer);
    });

    return NextResponse.json({
      url: result.secure_url,
      publicId: result.public_id,
    });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: "Yukleme basarisiz" }, { status: 500 });
  }
}
