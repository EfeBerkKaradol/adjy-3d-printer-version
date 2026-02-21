import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir } from "fs/promises";
import { existsSync } from "fs";
import path from "path";

// ==========================================
// AR MODEL ENDPOINT
//
// POST: GLB veya USDZ binary data alir, public/ar-models/ altina yazar
//       ve indirilebilir URL dondurur.
//
// Content-Type header'ina gore format belirlenir:
//   model/gltf-binary  -> .glb
//   model/vnd.usdz+zip -> .usdz
// ==========================================

const AR_MODELS_DIR = path.join(process.cwd(), "public", "ar-models");

async function ensureDir() {
  if (!existsSync(AR_MODELS_DIR)) {
    await mkdir(AR_MODELS_DIR, { recursive: true });
  }
}

// 10 dakikadan eski dosyalari temizle
async function cleanupOldModels() {
  try {
    await ensureDir();
    const { readdir, stat } = await import("fs/promises");
    const files = await readdir(AR_MODELS_DIR);
    const now = Date.now();
    const maxAge = 10 * 60 * 1000;

    for (const file of files) {
      if (!file.endsWith(".glb") && !file.endsWith(".usdz")) continue;
      const filePath = path.join(AR_MODELS_DIR, file);
      const fileStat = await stat(filePath);
      if (now - fileStat.mtimeMs > maxAge) {
        await unlink(filePath).catch(() => {});
      }
    }
  } catch {
    // Temizlik hatasi kritik degil
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDir();
    await cleanupOldModels();

    const contentType = request.headers.get("content-type") || "";
    const isUSDZ = contentType.includes("usdz");
    const ext = isUSDZ ? "usdz" : "glb";

    const data = await request.arrayBuffer();
    if (!data || data.byteLength === 0) {
      return NextResponse.json(
        { error: "Model verisi bos" },
        { status: 400 }
      );
    }

    const id = crypto.randomUUID();
    const filename = `${id}.${ext}`;
    const filePath = path.join(AR_MODELS_DIR, filename);

    await writeFile(filePath, Buffer.from(data));

    console.log(
      `[AR] ${ext.toUpperCase()} kaydedildi: ${filename} (${data.byteLength} bytes)`
    );

    return NextResponse.json({
      id,
      url: `/ar-models/${filename}`,
      format: ext,
    });
  } catch (error) {
    console.error("[AR] Model kayit hatasi:", error);
    return NextResponse.json(
      { error: "Model kaydedilemedi" },
      { status: 500 }
    );
  }
}
