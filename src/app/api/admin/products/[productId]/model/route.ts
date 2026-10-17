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
    // ==========================================
    // ÖLÇÜ PARAMETRELERİ VE FİYAT FORMÜLÜ
    //
    // Her eksen slider olamaz: 5 mm kalınlığındaki bir süsün
    // kalınlığı tablaya göre anlamlı bir aralık vermiyor, o
    // parametre hiç oluşturulmuyor.
    //
    // Formül bu yüzden oluşturulan parametrelere göre yazılır.
    // Önceden iki eksen varsayılıyordu; tek eksenli üründe
    // formül olmayan bir değişkene atıf yapıyor, fiyat
    // motoru da onu haklı olarak reddediyordu — müşteri
    // ölçüyü büyütüyor, fiyat yerinde duruyordu.
    // ==========================================
    const adaylar = [
      { name: "width", displayName: "Genişlik", mm: dimensions.xMm, sort: 1 },
      { name: "height", displayName: "Yükseklik", mm: dimensions.zMm, sort: 2 },
    ];

    const kurulacak = adaylar
      .map((a) => ({ ...a, ...araliklar(a.mm) }))
      .filter((a) => a.max > a.min);

    // Malzeme alanla büyür. İki eksen varsa alan ikisinin
    // çarpımı; tek eksen kaldıysa düzlemde büyüme kareseldir.
    const carpanlar =
      kurulacak.length >= 2
        ? [kurulacak[0], kurulacak[1]]
        : kurulacak.length === 1
          ? [kurulacak[0], kurulacak[0]]
          : [];

    const formul =
      carpanlar.length === 2
        ? `base * (${carpanlar[0].name} * ${carpanlar[1].name}) / (${carpanlar[0].varsayilan} * ${carpanlar[1].varsayilan})`
        : null;

    // Formül tek parametrede durur; iki yerde olursa çarpan iki
    // kez uygulanır.
    const formulSahibi = kurulacak[0]?.name;

    for (const a of kurulacak) {
      await prisma.parameter.upsert({
        where: { productId_name: { productId, name: a.name } },
        update: {
          minValue: a.min,
          maxValue: a.max,
          defaultValue: String(a.varsayilan),
          unit: "mm",
          affectsPrice: a.name === formulSahibi && formul !== null,
          priceFormula: a.name === formulSahibi ? formul : null,
        },
        create: {
          productId,
          name: a.name,
          displayName: a.displayName,
          type: "SLIDER",
          minValue: a.min,
          maxValue: a.max,
          defaultValue: String(a.varsayilan),
          step: 5,
          unit: "mm",
          affectsPrice: a.name === formulSahibi && formul !== null,
          priceFormula: a.name === formulSahibi ? formul : null,
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
