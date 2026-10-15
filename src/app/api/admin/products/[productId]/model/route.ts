import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/admin";
import { BUILD, routeForMaterial } from "@/lib/production";

// ==========================================
// POST /api/admin/products/:id/model
//
// Ürünün 3D dosyasını kaydeder ve isteniyorsa özelleştirmeyi
// açar.
//
// Ölçü aralığı modelin gerçek boyutundan türetilir ve tabla
// sınırına kırpılır: elle girilen aralıklar modelle tutarsız
// kalıp üretilemeyen siparişlere yol açıyordu.
//
// Döküm ürünlerde özelleştirme açılmaz — kalıp tek ölçüdür.
// ==========================================

const sema = z.object({
  modelFileUrl: z.url(),
  dimensions: z.object({ xMm: z.number().positive(), yMm: z.number().positive(), zMm: z.number().positive() }),
  weightGrams: z.number().nonnegative(),
  printMinutes: z.number().nonnegative(),
  enableCustomization: z.boolean(),
});

/** Modelin ölçüsünden ayarlanabilir aralık — tablaya kırpılır */
function araliklar(varsayilanMm: number) {
  const min = Math.max(20, Math.round(varsayilanMm * 0.6));
  const max = Math.min(BUILD.maxMm, Math.round(varsayilanMm * 1.6));
  return { min, max, varsayilan: Math.round(varsayilanMm) };
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ productId: string }> }
) {
  // requireAdmin yetkisizlikte yanıt, yetkiliyse userId döner
  const yetki = await requireAdmin();
  if (yetki instanceof NextResponse) return yetki;

  const { productId } = await params;
  const parsed = sema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Geçersiz veri" }, { status: 400 });
  }
  const { modelFileUrl, dimensions, weightGrams, printMinutes, enableCustomization } = parsed.data;

  const urun = await prisma.product.findUnique({
    where: { id: productId },
    select: { id: true, materialType: true },
  });
  if (!urun) return NextResponse.json({ error: "Ürün bulunamadı" }, { status: 404 });

  const enUzun = Math.max(dimensions.xMm, dimensions.yMm, dimensions.zMm);
  if (enUzun > BUILD.maxMm) {
    return NextResponse.json(
      { error: `En uzun kenar ${BUILD.maxMm} mm'yi aşıyor` },
      { status: 400 }
    );
  }

  await prisma.product.update({
    where: { id: productId },
    data: {
      modelFileUrl,
      materialWeight: weightGrams,
      printTimeEst: Math.round(printMinutes),
    },
  });

  const rota = routeForMaterial(urun.materialType);
  let olusan = 0;

  if (enableCustomization && rota === "fdm") {
    const alanlar = [
      { name: "width", displayName: "Genişlik", mm: dimensions.xMm, sort: 1 },
      { name: "height", displayName: "Yükseklik", mm: dimensions.zMm, sort: 2 },
    ];

    for (const a of alanlar) {
      const { min, max, varsayilan } = araliklar(a.mm);
      if (max <= min) continue;
      await prisma.parameter.upsert({
        where: { productId_name: { productId, name: a.name } },
        update: { minValue: min, maxValue: max, defaultValue: String(varsayilan), unit: "mm" },
        create: {
          productId,
          name: a.name,
          displayName: a.displayName,
          type: "SLIDER",
          minValue: min,
          maxValue: max,
          defaultValue: String(varsayilan),
          step: 5,
          unit: "mm",
          // Ölçü değişince fiyat da değişmeli; formül tek
          // parametrede durur, iki yerde olursa çarpan iki kez
          // uygulanıyor.
          affectsPrice: a.name === "width",
          priceFormula:
            a.name === "width"
              ? `base * (width * height) / (${varsayilan} * ${Math.round(dimensions.zMm)})`
              : null,
          affectsGeometry: true,
          sortOrder: a.sort,
        },
      });
      olusan += 1;
    }
  }

  return NextResponse.json({
    ok: true,
    route: rota,
    parametersCreated: olusan,
    largestMm: Math.round(enUzun),
    largeFormat: enUzun > BUILD.standardMm,
  });
}
