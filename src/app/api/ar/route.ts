import { NextRequest, NextResponse } from "next/server";
import { writeFile, unlink, mkdir, readFile, readdir, stat } from "fs/promises";
import { existsSync } from "fs";
import path from "path";
import os from "os";

// ==========================================
// AR MODEL ENDPOINT
//
// POST: GLB veya USDZ binary data alir, /tmp/ar-models/ altina yazar
//       ve sunulabilir URL dondurur.
// GET:  id ve format parametreleriyle /tmp'den dosya servis eder.
//
// Content-Type header'ina gore format belirlenir:
//   model/gltf-binary  -> .glb
//   model/vnd.usdz+zip -> .usdz
//
// Vercel'de public/ dizini read-only oldugu icin /tmp kullanilir.
// POST ve GET ayni route dosyasinda → ayni serverless fonksiyon →
// /tmp paylasimi saglanir.
// ==========================================

const AR_MODELS_DIR = path.join(os.tmpdir(), "ar-models");

async function ensureDir() {
  if (!existsSync(AR_MODELS_DIR)) {
    await mkdir(AR_MODELS_DIR, { recursive: true });
  }
}

// 10 dakikadan eski dosyalari temizle
async function cleanupOldModels() {
  try {
    await ensureDir();
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

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const format = searchParams.get("format");

    if (!id || !format) {
      return NextResponse.json(
        { error: "id ve format parametreleri gerekli" },
        { status: 400 }
      );
    }

    // Guvenlik: id'de sadece UUID karakterleri kabul et
    if (!/^[a-f0-9-]+$/.test(id)) {
      return NextResponse.json(
        { error: "Gecersiz id formati" },
        { status: 400 }
      );
    }

    const ext = format === "usdz" ? "usdz" : "glb";
    const filePath = path.join(AR_MODELS_DIR, `${id}.${ext}`);

    if (!existsSync(filePath)) {
      return NextResponse.json(
        { error: "Dosya bulunamadi" },
        { status: 404 }
      );
    }

    const fileBuffer = await readFile(filePath);
    const contentType =
      ext === "usdz" ? "model/vnd.usdz+zip" : "model/gltf-binary";

    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Disposition": `inline; filename="${id}.${ext}"`,
        "Cache-Control": "public, max-age=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (error) {
    console.error("[AR] Dosya okuma hatasi:", error);
    return NextResponse.json(
      { error: "Dosya okunamadi" },
      { status: 500 }
    );
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

    // URL artik /api/ar?id=...&format=... seklinde (GET handler ile servis edilir)
    return NextResponse.json({
      id,
      url: `/api/ar?id=${id}&format=${ext}`,
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
