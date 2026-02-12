import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...\n");

  // ==========================================
  // 1. TEST USER
  // ==========================================
  console.log("👤 Creating test users...");

  const hashedPassword = await bcrypt.hash("Test1234!", 12);

  const adminUser = await prisma.user.upsert({
    where: { email: "admin@adjy.com" },
    update: {},
    create: {
      email: "admin@adjy.com",
      fullName: "ADJY Admin",
      passwordHash: hashedPassword,
      role: "ADMIN",
      phone: "+905551234567",
    },
  });

  const testUser = await prisma.user.upsert({
    where: { email: "test@adjy.com" },
    update: {},
    create: {
      email: "test@adjy.com",
      fullName: "Test Kullanici",
      passwordHash: hashedPassword,
      role: "USER",
      phone: "+905559876543",
    },
  });

  console.log(`  ✅ Admin: ${adminUser.email}`);
  console.log(`  ✅ User: ${testUser.email}`);
  console.log(`  🔑 Password for both: Test1234!\n`);

  // ==========================================
  // 2. TAGS
  // ==========================================
  console.log("🏷️  Creating tags...");

  const tags = await Promise.all(
    [
      { name: "Yeni", slug: "yeni" },
      { name: "Populer", slug: "populer" },
      { name: "Indirimli", slug: "indirimli" },
      { name: "El Yapimi", slug: "el-yapimi" },
      { name: "Hediye", slug: "hediye" },
      { name: "Ofis", slug: "ofis" },
      { name: "Dekoratif", slug: "dekoratif" },
      { name: "Fonksiyonel", slug: "fonksiyonel" },
    ].map((tag) =>
      prisma.tag.upsert({
        where: { slug: tag.slug },
        update: {},
        create: tag,
      })
    )
  );

  console.log(`  ✅ ${tags.length} tags created\n`);

  // ==========================================
  // 3. CATEGORIES
  // ==========================================
  console.log("📂 Creating categories...");

  const catEv = await prisma.category.upsert({
    where: { slug: "ev-dekorasyon" },
    update: {},
    create: {
      name: "Ev & Dekorasyon",
      slug: "ev-dekorasyon",
      description: "3D baski ile uretilen ev dekorasyon urunleri",
      imageUrl: "/assets/categories/ev-dekorasyon.jpg",
      sortOrder: 1,
    },
  });

  const catOfis = await prisma.category.upsert({
    where: { slug: "ofis-aksesuarlari" },
    update: {},
    create: {
      name: "Ofis Aksesuarlari",
      slug: "ofis-aksesuarlari",
      description: "Masanuzu guzellestirin, veriminizi artirin",
      imageUrl: "/assets/categories/ofis.jpg",
      sortOrder: 2,
    },
  });

  const catTakilar = await prisma.category.upsert({
    where: { slug: "takilar" },
    update: {},
    create: {
      name: "Takilar & Aksesuarlar",
      slug: "takilar",
      description: "Kisisellestirilmis 3D baski takilar",
      imageUrl: "/assets/categories/takilar.jpg",
      sortOrder: 3,
    },
  });

  const catHediye = await prisma.category.upsert({
    where: { slug: "hediye" },
    update: {},
    create: {
      name: "Hediye & Ozel Gun",
      slug: "hediye",
      description: "Sevdiklerinize ozel hediyeler",
      imageUrl: "/assets/categories/hediye.jpg",
      sortOrder: 4,
    },
  });

  const catTeknik = await prisma.category.upsert({
    where: { slug: "teknik-parcalar" },
    update: {},
    create: {
      name: "Teknik Parcalar",
      slug: "teknik-parcalar",
      description: "Fonksiyonel mekanik ve teknik parcalar",
      imageUrl: "/assets/categories/teknik.jpg",
      sortOrder: 5,
    },
  });

  console.log(
    `  ✅ Categories: ${catEv.name}, ${catOfis.name}, ${catTakilar.name}, ${catHediye.name}, ${catTeknik.name}\n`
  );

  // ==========================================
  // 4. PRODUCTS + PARAMETERS
  // ==========================================
  console.log("📦 Creating products with parameters...");

  // --- Product 1: Vazo ---
  const vazo = await prisma.product.upsert({
    where: { slug: "parametrik-vazo" },
    update: {},
    create: {
      name: "Parametrik Vazo",
      slug: "parametrik-vazo",
      description:
        "Yukseklik, genislik ve dalga sikligi ayarlanabilen modern vazo. Evinize benzersiz bir dokunustur.",
      basePrice: 249.99,
      categoryId: catEv.id,
      thumbnailUrl: "/assets/products/vazo-thumb.jpg",
      modelFileUrl: "/models/vazo.glb",
      gallery: [
        "/assets/products/vazo-1.jpg",
        "/assets/products/vazo-2.jpg",
        "/assets/products/vazo-3.jpg",
      ],
      printTimeEst: 180,
      materialType: "PLA",
      materialWeight: 120.0,
      featured: true,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: vazo.id,
        name: "height",
        displayName: "Yukseklik",
        type: "SLIDER",
        minValue: 100,
        maxValue: 300,
        defaultValue: "200",
        step: 10,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 200)",
        affectsGeometry: true,
        sortOrder: 1,
      },
      {
        productId: vazo.id,
        name: "width",
        displayName: "Genislik",
        type: "SLIDER",
        minValue: 60,
        maxValue: 150,
        defaultValue: "100",
        step: 5,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 100)",
        affectsGeometry: true,
        sortOrder: 2,
      },
      {
        productId: vazo.id,
        name: "waveFrequency",
        displayName: "Dalga Sikligi",
        type: "SLIDER",
        minValue: 1,
        maxValue: 10,
        defaultValue: "4",
        step: 1,
        unit: null,
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 3,
      },
      {
        productId: vazo.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#FFFFFF",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 4,
      },
    ],
  });

  // --- Product 2: Telefon Standı ---
  const stand = await prisma.product.upsert({
    where: { slug: "telefon-standi" },
    update: {},
    create: {
      name: "Telefon Standi",
      slug: "telefon-standi",
      description:
        "Aci ve genislik ayarlanabilen minimalist telefon standi. Tum telefonlarla uyumlu.",
      basePrice: 89.99,
      categoryId: catOfis.id,
      thumbnailUrl: "/assets/products/stand-thumb.jpg",
      modelFileUrl: "/models/phone-stand.glb",
      gallery: [
        "/assets/products/stand-1.jpg",
        "/assets/products/stand-2.jpg",
      ],
      printTimeEst: 90,
      materialType: "PETG",
      materialWeight: 45.0,
      featured: true,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: stand.id,
        name: "angle",
        displayName: "Goruntuleme Acisi",
        type: "SLIDER",
        minValue: 30,
        maxValue: 75,
        defaultValue: "45",
        step: 5,
        unit: "derece",
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 1,
      },
      {
        productId: stand.id,
        name: "width",
        displayName: "Genislik",
        type: "DROPDOWN",
        minValue: null,
        maxValue: null,
        defaultValue: "70",
        step: null,
        unit: "mm",
        affectsPrice: false,
        affectsGeometry: true,
        validationRules: { options: ["60", "70", "80", "90"] },
        sortOrder: 2,
      },
      {
        productId: stand.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#1A1A1A",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 3,
      },
    ],
  });

  // --- Product 3: Isimli Anahtarlik ---
  const anahtarlik = await prisma.product.upsert({
    where: { slug: "isimli-anahtarlik" },
    update: {},
    create: {
      name: "Isimli Anahtarlik",
      slug: "isimli-anahtarlik",
      description:
        "Kendi isminizi veya ozel bir mesaji 3D olarak yazdirabileceginiz kisisel anahtarlik.",
      basePrice: 39.99,
      categoryId: catHediye.id,
      thumbnailUrl: "/assets/products/anahtarlik-thumb.jpg",
      modelFileUrl: "/models/keychain.glb",
      gallery: [
        "/assets/products/anahtarlik-1.jpg",
        "/assets/products/anahtarlik-2.jpg",
      ],
      printTimeEst: 30,
      materialType: "PLA",
      materialWeight: 8.0,
      featured: true,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: anahtarlik.id,
        name: "text",
        displayName: "Yazi",
        type: "TEXT",
        minValue: null,
        maxValue: null,
        defaultValue: "ADJY",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: true,
        validationRules: { maxLength: 12, minLength: 1 },
        sortOrder: 1,
      },
      {
        productId: anahtarlik.id,
        name: "thickness",
        displayName: "Kalinlik",
        type: "SLIDER",
        minValue: 2,
        maxValue: 6,
        defaultValue: "3",
        step: 0.5,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 3)",
        affectsGeometry: true,
        sortOrder: 2,
      },
      {
        productId: anahtarlik.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#E74C3C",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 3,
      },
    ],
  });

  // --- Product 4: Masa Lambasi ---
  const lamba = await prisma.product.upsert({
    where: { slug: "geometrik-masa-lambasi" },
    update: {},
    create: {
      name: "Geometrik Masa Lambasi",
      slug: "geometrik-masa-lambasi",
      description:
        "Geometrik desene sahip, boyut ve desen yogunlugu ayarlanabilen modern masa lambasi kaplamasi.",
      basePrice: 349.99,
      categoryId: catEv.id,
      thumbnailUrl: "/assets/products/lamba-thumb.jpg",
      modelFileUrl: "/models/lamp.glb",
      gallery: [
        "/assets/products/lamba-1.jpg",
        "/assets/products/lamba-2.jpg",
      ],
      printTimeEst: 240,
      materialType: "PLA",
      materialWeight: 200.0,
      featured: false,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: lamba.id,
        name: "diameter",
        displayName: "Cap",
        type: "SLIDER",
        minValue: 100,
        maxValue: 250,
        defaultValue: "150",
        step: 10,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 150)",
        affectsGeometry: true,
        sortOrder: 1,
      },
      {
        productId: lamba.id,
        name: "height",
        displayName: "Yukseklik",
        type: "SLIDER",
        minValue: 150,
        maxValue: 350,
        defaultValue: "250",
        step: 10,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 250)",
        affectsGeometry: true,
        sortOrder: 2,
      },
      {
        productId: lamba.id,
        name: "patternDensity",
        displayName: "Desen Yogunlugu",
        type: "SLIDER",
        minValue: 1,
        maxValue: 5,
        defaultValue: "3",
        step: 1,
        unit: null,
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 3,
      },
      {
        productId: lamba.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#F5F5DC",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 4,
      },
    ],
  });

  // --- Product 5: Kalem Kutusu ---
  const kalemKutusu = await prisma.product.upsert({
    where: { slug: "modular-kalem-kutusu" },
    update: {},
    create: {
      name: "Modular Kalem Kutusu",
      slug: "modular-kalem-kutusu",
      description:
        "Bolme sayisi ve boyutu ayarlanabilen modular masa duzenleyici.",
      basePrice: 129.99,
      categoryId: catOfis.id,
      thumbnailUrl: "/assets/products/kalem-kutusu-thumb.jpg",
      modelFileUrl: "/models/pencil-holder.glb",
      gallery: ["/assets/products/kalem-1.jpg"],
      printTimeEst: 120,
      materialType: "PLA",
      materialWeight: 85.0,
      featured: false,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: kalemKutusu.id,
        name: "compartments",
        displayName: "Bolme Sayisi",
        type: "DROPDOWN",
        minValue: null,
        maxValue: null,
        defaultValue: "3",
        step: null,
        unit: null,
        affectsPrice: true,
        priceFormula: "base * (value / 3)",
        affectsGeometry: true,
        validationRules: { options: ["2", "3", "4", "5"] },
        sortOrder: 1,
      },
      {
        productId: kalemKutusu.id,
        name: "height",
        displayName: "Yukseklik",
        type: "SLIDER",
        minValue: 80,
        maxValue: 150,
        defaultValue: "100",
        step: 10,
        unit: "mm",
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 2,
      },
      {
        productId: kalemKutusu.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#2C3E50",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 3,
      },
    ],
  });

  // --- Product 6: Bileklik ---
  const bileklik = await prisma.product.upsert({
    where: { slug: "kisisel-bileklik" },
    update: {},
    create: {
      name: "Kisisel Bileklik",
      slug: "kisisel-bileklik",
      description:
        "Cap ve kalinlik ayarlanabilen, isim yazdirma opsiyonlu esnek bileklik.",
      basePrice: 59.99,
      categoryId: catTakilar.id,
      thumbnailUrl: "/assets/products/bileklik-thumb.jpg",
      modelFileUrl: "/models/bracelet.glb",
      gallery: ["/assets/products/bileklik-1.jpg"],
      printTimeEst: 45,
      materialType: "TPU",
      materialWeight: 15.0,
      featured: false,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: bileklik.id,
        name: "diameter",
        displayName: "Bilek Capi",
        type: "SLIDER",
        minValue: 55,
        maxValue: 85,
        defaultValue: "65",
        step: 5,
        unit: "mm",
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 1,
      },
      {
        productId: bileklik.id,
        name: "bandWidth",
        displayName: "Bant Genisligi",
        type: "SLIDER",
        minValue: 8,
        maxValue: 25,
        defaultValue: "15",
        step: 1,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * (value / 15)",
        affectsGeometry: true,
        sortOrder: 2,
      },
      {
        productId: bileklik.id,
        name: "text",
        displayName: "Yazi (opsiyonel)",
        type: "TEXT",
        minValue: null,
        maxValue: null,
        defaultValue: "",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: true,
        validationRules: { maxLength: 20 },
        sortOrder: 3,
      },
      {
        productId: bileklik.id,
        name: "color",
        displayName: "Renk",
        type: "COLOR",
        minValue: null,
        maxValue: null,
        defaultValue: "#000000",
        step: null,
        unit: null,
        affectsPrice: false,
        affectsGeometry: false,
        sortOrder: 4,
      },
    ],
  });

  // --- Product 7: Disli Cark ---
  const disli = await prisma.product.upsert({
    where: { slug: "parametrik-disli-cark" },
    update: {},
    create: {
      name: "Parametrik Disli Cark",
      slug: "parametrik-disli-cark",
      description:
        "Dis sayisi, modul ve kalinligi ayarlanabilen teknik disli cark. Prototipleme icin ideal.",
      basePrice: 19.99,
      categoryId: catTeknik.id,
      thumbnailUrl: "/assets/products/disli-thumb.jpg",
      modelFileUrl: "/models/gear.glb",
      gallery: ["/assets/products/disli-1.jpg"],
      printTimeEst: 40,
      materialType: "PETG",
      materialWeight: 12.0,
      featured: false,
    },
  });

  await prisma.parameter.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: disli.id,
        name: "teethCount",
        displayName: "Dis Sayisi",
        type: "NUMBER",
        minValue: 8,
        maxValue: 60,
        defaultValue: "24",
        step: 1,
        unit: null,
        affectsPrice: true,
        priceFormula: "base * (value / 24)",
        affectsGeometry: true,
        sortOrder: 1,
      },
      {
        productId: disli.id,
        name: "module",
        displayName: "Modul",
        type: "DROPDOWN",
        minValue: null,
        maxValue: null,
        defaultValue: "1",
        step: null,
        unit: "mm",
        affectsPrice: true,
        priceFormula: "base * value",
        affectsGeometry: true,
        validationRules: { options: ["0.5", "1", "1.5", "2"] },
        sortOrder: 2,
      },
      {
        productId: disli.id,
        name: "thickness",
        displayName: "Kalinlik",
        type: "SLIDER",
        minValue: 3,
        maxValue: 15,
        defaultValue: "5",
        step: 1,
        unit: "mm",
        affectsPrice: false,
        affectsGeometry: true,
        sortOrder: 3,
      },
    ],
  });

  // ==========================================
  // 5. TAG CONNECTIONS
  // ==========================================
  console.log("🔗 Connecting product tags...");

  const tagMap = Object.fromEntries(tags.map((t) => [t.slug, t.id]));

  const productTagPairs = [
    { productId: vazo.id, tagId: tagMap["populer"] },
    { productId: vazo.id, tagId: tagMap["dekoratif"] },
    { productId: vazo.id, tagId: tagMap["hediye"] },
    { productId: stand.id, tagId: tagMap["populer"] },
    { productId: stand.id, tagId: tagMap["ofis"] },
    { productId: stand.id, tagId: tagMap["fonksiyonel"] },
    { productId: anahtarlik.id, tagId: tagMap["hediye"] },
    { productId: anahtarlik.id, tagId: tagMap["yeni"] },
    { productId: lamba.id, tagId: tagMap["dekoratif"] },
    { productId: lamba.id, tagId: tagMap["el-yapimi"] },
    { productId: kalemKutusu.id, tagId: tagMap["ofis"] },
    { productId: kalemKutusu.id, tagId: tagMap["fonksiyonel"] },
    { productId: bileklik.id, tagId: tagMap["hediye"] },
    { productId: bileklik.id, tagId: tagMap["yeni"] },
    { productId: disli.id, tagId: tagMap["fonksiyonel"] },
  ];

  for (const pair of productTagPairs) {
    await prisma.productTag
      .create({ data: pair })
      .catch(() => {}); // skip duplicates
  }

  // ==========================================
  // 6. SAMPLE REVIEWS
  // ==========================================
  console.log("⭐ Creating sample reviews...");

  await prisma.review.createMany({
    skipDuplicates: true,
    data: [
      {
        productId: vazo.id,
        userId: testUser.id,
        rating: 5,
        title: "Muhtesem bir urun!",
        comment:
          "Boyutlari tam istedigim gibi ayarlayabildim. Baski kalitesi cok iyi.",
        verifiedPurchase: true,
      },
      {
        productId: stand.id,
        userId: testUser.id,
        rating: 4,
        title: "Cok kullanisli",
        comment:
          "Aci ayari harika calisiyor, telefonum mukemmel duruyor. Sadece biraz daha agir olabilirdi.",
        verifiedPurchase: true,
      },
      {
        productId: anahtarlik.id,
        userId: testUser.id,
        rating: 5,
        title: "Hediye olarak aldim",
        comment: "Isim yazdirma ozelligi cok guzel. Arkdasim bayildi!",
        verifiedPurchase: true,
      },
    ],
  });

  // ==========================================
  // SUMMARY
  // ==========================================
  const productCount = await prisma.product.count();
  const paramCount = await prisma.parameter.count();
  const catCount = await prisma.category.count();
  const reviewCount = await prisma.review.count();

  console.log("\n🎉 Seed completed!");
  console.log("────────────────────────");
  console.log(`  📂 Categories:  ${catCount}`);
  console.log(`  📦 Products:    ${productCount}`);
  console.log(`  🎛️  Parameters:  ${paramCount}`);
  console.log(`  🏷️  Tags:        ${tags.length}`);
  console.log(`  ⭐ Reviews:     ${reviewCount}`);
  console.log(`  👤 Users:       2`);
  console.log("────────────────────────\n");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
