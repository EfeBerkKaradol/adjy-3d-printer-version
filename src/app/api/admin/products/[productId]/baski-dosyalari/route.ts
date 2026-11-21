import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin, isUnauthorized } from "@/lib/admin";
import { cloudinary } from "@/lib/cloudinary";
import { BASKI_DOSYASI_SINIR, baskiDosyalariniOku, baskiDosyasiMi } from "@/lib/baskiDosyalari";

// ==========================================
// /api/admin/products/:id/baski-dosyalari
//
// Hazır ürünün baskı dosyaları (bkz. lib/baskiDosyalari).
//
//   GET  → kayıtlı dosyalar + yükleme hedefi. Dosya, STL'lerin
//          boyutu Vercel'in istek gövdesi sınırını aştığı için
//          tarayıcıdan doğrudan Cloudinary'ye gider; burası
//          yalnızca kısa ömürlü imzayı verir.
//   POST → yerel geliştirme: Cloudinary yapılandırılmamışsa
//          dosya public/uploads altına yazılır. Canlıda kapalı.
//   PUT  → dosya listesini kaydeder (ekleme, silme, sıra).
// ==========================================

const KLASOR = "adjy/print-files";

function cloudinaryVar(): boolean {
  return !!(
    process.env.CLOUDINARY_CLOUD_NAME &&
    process.env.CLOUDINARY_API_KEY &&
    process.env.CLOUDINARY_API_SECRET
  );
}

function yerelYuklemeAcik(): boolean {
  return !cloudinaryVar() && process.env.NODE_ENV !== "production";
}

type Baglam = { params: Promise<{ productId: string }> };

export async function GET(_req: NextRequest, { params }: Baglam) {
  const yetki = await requireAdmin();
  if (isUnauthorized(yetki)) return yetki;

  const { productId } = await params;
  const urun = await prisma.product.findUnique({
    where: { id: productId },
    select: { printFiles: true },
  });
  if (!urun) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  const dosyalar = baskiDosyalariniOku(urun.printFiles);

  if (cloudinaryVar()) {
    const timestamp = Math.floor(Date.now() / 1000);
    const folder = `${KLASOR}/${productId}`;
    const signature = cloudinary.utils.api_sign_request(
      { folder, timestamp },
      process.env.CLOUDINARY_API_SECRET!
    );
    return NextResponse.json({
      dosyalar,
      hedef: {
        tur: "cloudinary",
        cloudName: process.env.CLOUDINARY_CLOUD_NAME,
        apiKey: process.env.CLOUDINARY_API_KEY,
        timestamp,
        folder,
        signature,
      },
    });
  }

  return NextResponse.json({
    dosyalar,
    hedef: yerelYuklemeAcik() ? { tur: "yerel" } : null,
  });
}

/** Yalnızca yerel geliştirme: dosyayı public/uploads/baski-dosyalari/<ürün>/ altına yazar */
export async function POST(request: NextRequest, { params }: Baglam) {
  const yetki = await requireAdmin();
  if (isUnauthorized(yetki)) return yetki;
  if (!yerelYuklemeAcik()) {
    return NextResponse.json({ error: "Dosya deposu yapılandırılmamış" }, { status: 400 });
  }

  const { productId } = await params;
  if (!/^[a-z0-9]+$/i.test(productId)) {
    return NextResponse.json({ error: "Geçersiz ürün" }, { status: 400 });
  }

  const form = await request.formData();
  const dosya = form.get("file");
  if (!(dosya instanceof File)) {
    return NextResponse.json({ error: "Dosya gerekli" }, { status: 400 });
  }
  if (!baskiDosyasiMi(dosya.name)) {
    return NextResponse.json({ error: "Desteklenmeyen dosya türü" }, { status: 400 });
  }
  if (dosya.size > BASKI_DOSYASI_SINIR) {
    return NextResponse.json({ error: "Dosya çok büyük" }, { status: 400 });
  }

  // Ad yalnızca güvenli karakterlerle diske yazılır; özgün ad
  // listede ayrıca tutulur.
  const guvenli = `${Date.now().toString(36)}-${dosya.name.replace(/[^a-z0-9._-]+/gi, "_").slice(-80)}`;
  const dizin = path.join(process.cwd(), "public", "uploads", "baski-dosyalari", productId);
  await mkdir(dizin, { recursive: true });
  await writeFile(path.join(dizin, guvenli), Buffer.from(await dosya.arrayBuffer()));

  return NextResponse.json({ url: `/uploads/baski-dosyalari/${productId}/${guvenli}` });
}

const listeSemasi = z.object({
  dosyalar: z
    .array(
      z.object({
        ad: z.string().min(1).max(160),
        // Yalnızca kendi depomuz: Cloudinary ya da yerel geliştirme yolu
        url: z
          .string()
          .refine(
            (u) => u.startsWith("https://res.cloudinary.com/") || u.startsWith("/uploads/baski-dosyalari/"),
            "Geçersiz dosya adresi"
          ),
        boyut: z.number().int().nonnegative(),
      })
    )
    .max(60),
});

export async function PUT(request: NextRequest, { params }: Baglam) {
  const yetki = await requireAdmin();
  if (isUnauthorized(yetki)) return yetki;

  const { productId } = await params;
  const parsed = listeSemasi.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }

  const urun = await prisma.product.update({
    where: { id: productId },
    data: { printFiles: parsed.data.dosyalar },
    select: { printFiles: true },
  }).catch(() => null);
  if (!urun) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  return NextResponse.json({ dosyalar: baskiDosyalariniOku(urun.printFiles) });
}
