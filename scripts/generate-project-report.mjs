import XLSX from "xlsx";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputPath = path.join(__dirname, "..", "ADJY_Proje_Durum_Raporu.xlsx");

const wb = XLSX.utils.book_new();

// ============================================================
// SAYFA 1: GENEL BAKIS
// ============================================================
const overviewData = [
  ["ADJY 3D Printer E-Commerce Platform - Proje Durum Raporu"],
  ["Tarih", new Date().toLocaleDateString("tr-TR")],
  [],
  ["Proje Teknoloji Yigini"],
  ["Kategori", "Teknoloji", "Versiyon"],
  ["Framework", "Next.js", "16.1.6"],
  ["UI Library", "React", "19"],
  ["Dil", "TypeScript", "5.x"],
  ["CSS", "TailwindCSS", "v4"],
  ["3D Engine", "Three.js", "0.182.0"],
  ["3D React", "React Three Fiber", "9.5.0"],
  ["3D Helpers", "Drei", "10.7.7"],
  ["AR Viewer", "@google/model-viewer", "4.1.0"],
  ["ORM", "Prisma", "6.x"],
  ["Veritabani", "PostgreSQL", "-"],
  ["Auth", "NextAuth.js", "5.x"],
  ["UI Components", "shadcn/ui", "-"],
  [],
  ["Faz Durumu Ozeti"],
  ["Faz", "Durum", "Tamamlanma"],
  ["Faz 1 - Altyapi", "TAMAMLANDI", "100%"],
  ["Faz 1.5 - Backend", "TAMAMLANDI", "100%"],
  ["Faz 2 - 3D Viewer", "TAMAMLANDI", "100%"],
  ["Faz 3 - AR Entegrasyonu", "TAMAMLANDI", "95%"],
  ["Faz 4 - Siparis & Odeme", "PLANLANACAK", "0%"],
  ["Faz 5 - UX Iyilestirme", "PLANLANACAK", "0%"],
  ["Faz 6 - Admin Panel", "PLANLANACAK", "0%"],
  ["Faz 7 - Performans & Production", "PLANLANACAK", "0%"],
  ["Faz 8 - Gelismis Ozellikler", "PLANLANACAK", "0%"],
];

const wsOverview = XLSX.utils.aoa_to_sheet(overviewData);
wsOverview["!cols"] = [{ wch: 35 }, { wch: 30 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wb, wsOverview, "Genel Bakis");

// ============================================================
// SAYFA 2: FAZ 1, 1.5, 2 DETAYLARI
// ============================================================
const phase12Data = [
  ["FAZ 1 - ALTYAPI (Infrastructure)"],
  ["Durum: TAMAMLANDI"],
  [],
  ["Ozellik", "Aciklama", "Durum"],
  ["Next.js 16 Kurulumu", "App Router, Turbopack, React 19 destegi", "✓"],
  ["TypeScript Konfigurasyonu", "Strict mode, path alias'lar", "✓"],
  ["TailwindCSS v4", "Utility-first CSS framework", "✓"],
  ["Prisma ORM", "Veritabani erisim katmani", "✓"],
  ["PostgreSQL", "Ana veritabani", "✓"],
  ["NextAuth.js", "Kimlik dogrulama sistemi", "✓"],
  ["shadcn/ui", "UI component kutuphanesi", "✓"],
  ["Sayfa Yapisi", "App Router ile routing", "✓"],
  [],
  [],
  ["FAZ 1.5 - BACKEND"],
  ["Durum: TAMAMLANDI"],
  [],
  ["Ozellik", "Aciklama", "Durum"],
  ["Urun CRUD", "Urun olusturma, okuma, guncelleme, silme", "✓"],
  ["Veritabani Modelleri", "Product, User, Order, CartItem vb.", "✓"],
  ["API Endpoint'leri", "RESTful API route'lari", "✓"],
  ["Admin Panel Altyapisi", "Studio layout ve temel sayfalar", "✓"],
  ["Parametrik Urun Yapisi", "JSON parameters ile esnek model tanimlama", "✓"],
  [],
  [],
  ["FAZ 2 - 3D VIEWER"],
  ["Durum: TAMAMLANDI"],
  [],
  ["Ozellik", "Aciklama", "Durum"],
  ["Three.js Entegrasyonu", "React Three Fiber + Drei ile 3D render", "✓"],
  ["Parametrik Model Sistemi", "7 farkli urun tipi icin dinamik geometri", "✓"],
  ["Gercek Zamanli Duzenleme", "Slider'larla parametre degistirme", "✓"],
  ["Kamera Kontrolleri", "Orbit controls, zoom, pan", "✓"],
  ["Customize Sayfasi", "/customize/[productId] ile urun ozellestirme", "✓"],
  ["Malzeme Sistemi", "MeshStandardMaterial ile PBR render", "✓"],
  [],
  ["Desteklenen Parametrik Modeller"],
  ["Model Tipi", "Parametreler", "Geometri"],
  ["Vazo (vase)", "height, topRadius, bottomRadius, segments", "LatheGeometry"],
  ["Stand (stand)", "width, height, depth, phoneAngle", "Box + Boolean ops"],
  ["Anahtarlik (keychain)", "width, height, thickness, ringSize", "Extrude + Torus"],
  ["Lamba (lamp)", "height, topRadius, bottomRadius, segments", "LatheGeometry (wireframe)"],
  ["Kalemlik (pencilHolder)", "height, radius, segments, wallThickness", "Cylinder (hollow)"],
  ["Bileklik (bracelet)", "diameter, thickness, width", "TorusGeometry"],
  ["Disli (gear)", "teeth, outerRadius, innerRadius, thickness", "Custom gear geometry"],
];

const wsPhase12 = XLSX.utils.aoa_to_sheet(phase12Data);
wsPhase12["!cols"] = [{ wch: 30 }, { wch: 50 }, { wch: 12 }];
XLSX.utils.book_append_sheet(wb, wsPhase12, "Faz 1-2 Detay");

// ============================================================
// SAYFA 3: FAZ 3 AR DETAYLARI
// ============================================================
const phase3Data = [
  ["FAZ 3 - AR ENTEGRASYONU"],
  ["Durum: TAMAMLANDI (test bekleniyor)"],
  [],
  ["OLUSTURULAN DOSYALAR (11 yeni dosya)"],
  [],
  ["Dosya Yolu", "Aciklama", "Satir Sayisi (tahmini)"],
  ["src/types/ar.types.ts", "AR tip tanimlari (ARPlatform, ARCapabilities, GLBExportResult, USDZExportResult, ARExportResult, RealSizeDimensions)", "~45"],
  ["src/lib/ar/deviceDetection.ts", "iOS/Android/Desktop cihaz algilama, AR mod belirleme", "~53"],
  ["src/lib/ar/realSizeCalibration.ts", "7 urun tipi icin gercek dunya boyutlari (mm → metre donusumu)", "~80"],
  ["src/lib/ar/sceneBuilder.ts", "ParametricModel.tsx'deki 7 modelin pure Three.js replikasi (React bagimsiz)", "~350"],
  ["src/lib/ar/glbExporter.ts", "GLB export (GLTFExporter) + USDZ export (USDZExporter, quickLookCompatible)", "~65"],
  ["src/hooks/useARSupport.ts", "AR yetenek algilama React hook'u", "~40"],
  ["src/hooks/useGLBExport.ts", "GLB + USDZ export pipeline hook'u (sahne olusturma → export → sunucuya yukleme)", "~115"],
  ["src/components/ar/ARViewer.tsx", "model-viewer wrapper - sadece 3D onizleme (AR tetiklemesi yok)", "~140"],
  ["src/components/ar/ARButton.tsx", "AR'da Gor / 3D Onizleme butonu (export tetikleyici)", "~100"],
  ["src/components/ar/ARModal.tsx", "Full-screen AR modal (iOS: <a rel=ar> USDZ linki, Android: Scene Viewer intent)", "~200"],
  ["src/components/ar/ProductARButton.tsx", "Urun detay sayfasi icin client component wrapper", "~70"],
  [],
  ["DEGISTIRILEN DOSYALAR (5 dosya)"],
  [],
  ["Dosya Yolu", "Degisiklik", "Neden"],
  ["src/app/(studio)/customize/[productId]/page.tsx", "ARButton + ARModal import ve entegrasyonu, arGlbUrl/arUsdzUrl state'leri", "Customize sayfasindan AR erisimi"],
  ["src/app/(shop)/products/[slug]/page.tsx", "ProductARButton import ve entegrasyonu", "Urun detay sayfasindan AR erisimi"],
  ["src/app/api/ar/route.ts", "GLB + USDZ dosya yukleme endpoint'i, otomatik temizlik", "Model dosyalarinin sunucuda barindirma"],
  ["next.config.ts", "GLB/USDZ icin MIME type ve CORS header'lari", "iOS AR Quick Look uyumlulugu"],
  [".gitignore", "/public/ar-models/*.glb ve *.usdz eklendi", "Gecici AR dosyalarinin repo'ya girmemesi"],
  [],
  ["AR PLATFORM STRATEJISI"],
  [],
  ["Platform", "AR Yontemi", "Dosya Formati", "Tetikleme"],
  ["iOS (iPhone/iPad)", "AR Quick Look", "USDZ (.usdz)", "<a rel='ar' href='model.usdz'> linki ile native tetikleme"],
  ["Android", "Google Scene Viewer", "GLB (.glb)", "intent:// URL scheme ile Scene Viewer uygulamasini acma"],
  ["Desktop", "Sadece 3D Onizleme", "GLB (.glb)", "model-viewer ile 3D goruntuleme (AR yok)"],
  [],
  ["COZULEN TEKNIK SORUNLAR"],
  [],
  ["Sorun", "Kok Neden", "Cozum"],
  ["model-viewer TypeScript hatasi", "React 19 JSX namespace degisikligi", "global JSX + React.JSX namespace'lerinde cift tanim"],
  ["Mobilde 'Load failed' hatasi", "localhost vs telefon IP adresi uyumsuzlugu", "window.location.origin kullanarak dinamik URL olusturma"],
  ["POST/GET arasi veri kaybi", "Turbopack worker izolasyonu (in-memory Map)", "Dosya sistemi depolama (public/ar-models/)"],
  ["iOS'ta AR kamerasi acilmiyor", "activateAR() programatik cagrisi iOS'ta calismiyor", "Native <a rel='ar'> USDZ linki + Three.js USDZExporter"],
  ["iOS USDZ formatini gerektiriyor", "AR Quick Look sadece USDZ/Reality destekler", "Three.js USDZExporter ile quickLookCompatible: true"],
  [],
  ["KALAN ISLER (Faz 3)"],
  [],
  ["Is", "Oncelik", "Durum"],
  ["iOS'ta USDZ ile AR Quick Look gercek test", "YUKSEK", "Test bekleniyor"],
  ["Android'de Scene Viewer intent testi", "YUKSEK", "Test bekleniyor"],
  ["Debug overlay'in kaldirilmasi", "DUSUK", "AR calistiktan sonra"],
  ["Hata durumlarinin UX iyilestirmesi", "ORTA", "Beklemede"],
  ["Gecici dosya temizleme iyilestirmesi", "DUSUK", "Beklemede"],
];

const wsPhase3 = XLSX.utils.aoa_to_sheet(phase3Data);
wsPhase3["!cols"] = [{ wch: 52 }, { wch: 55 }, { wch: 50 }];
XLSX.utils.book_append_sheet(wb, wsPhase3, "Faz 3 - AR Detay");

// ============================================================
// SAYFA 4: GELECEK FAZLAR
// ============================================================
const futurePhasesData = [
  ["GELECEK FAZLAR - YOL HARITASI"],
  [],
  ["FAZ 4 - SIPARIS & ODEME SISTEMI"],
  ["Oncelik: YUKSEK | Tahmini Sure: 2-3 hafta"],
  [],
  ["Ozellik", "Aciklama", "Karmasiklik"],
  ["Sepet (Cart) Sistemi", "Urun ekleme/cikarma, miktar guncelleme, localStorage + DB sync", "ORTA"],
  ["Siparis Olusturma Akisi", "Adres bilgisi, kargo secimi, siparis ozeti", "YUKSEK"],
  ["Parametrik Konfig Kaydi", "Ozellestirme parametrelerinin siparise JSON olarak kaydedilmesi", "DUSUK"],
  ["Odeme Entegrasyonu", "Stripe veya iyzico ile guvenli odeme", "YUKSEK"],
  ["Siparis Durumu Takibi", "Hazirlaniyor → Yazdiriliyor → Kargoda → Teslim Edildi", "ORTA"],
  ["Siparis Gecmisi", "Kullanicinin gecmis siparislerini goruntulemesi", "DUSUK"],
  ["Fatura/Makbuz", "PDF fatura olusturma ve e-posta ile gonderme", "ORTA"],
  [],
  [],
  ["FAZ 5 - KULLANICI DENEYIMI IYILESTIRMELERI"],
  ["Oncelik: ORTA | Tahmini Sure: 1-2 hafta"],
  [],
  ["Ozellik", "Aciklama", "Karmasiklik"],
  ["Responsive Tasarim", "Mobil, tablet, desktop tam uyum", "ORTA"],
  ["Loading Skeleton'lar", "Sayfa yuklenirken iskelet animasyonlari", "DUSUK"],
  ["Toast Bildirimleri", "Basarili/hata islemleri icin bildirimler", "DUSUK"],
  ["Favorilere Ekleme", "Urunleri favorilere ekleme/cikarma", "DUSUK"],
  ["Sosyal Paylasim", "AR deneyimini veya tasarimi paylasma", "ORTA"],
  ["Animasyonlar", "Sayfa gecisleri, buton animasyonlari", "DUSUK"],
  ["Dark/Light Mode", "Tema degistirme destegi", "DUSUK"],
  [],
  [],
  ["FAZ 6 - ADMIN PANEL & YONETIM"],
  ["Oncelik: YUKSEK | Tahmini Sure: 2-3 hafta"],
  [],
  ["Ozellik", "Aciklama", "Karmasiklik"],
  ["Urun Yonetimi Dashboard", "Urun ekleme/duzenleme/silme arayuzu", "ORTA"],
  ["Siparis Yonetimi", "Siparis listesi, durum guncelleme, filtreleme", "YUKSEK"],
  ["Kullanici Yonetimi", "Kullanici listesi, rol yonetimi", "ORTA"],
  ["Analitik & Raporlama", "Satis grafikleri, populer urunler, gelir raporlari", "YUKSEK"],
  ["Stok Takibi", "Malzeme stok durumu, uyarilar", "ORTA"],
  [],
  [],
  ["FAZ 7 - PERFORMANS & PRODUCTION"],
  ["Oncelik: YUKSEK | Tahmini Sure: 1-2 hafta"],
  [],
  ["Ozellik", "Aciklama", "Karmasiklik"],
  ["Production Build", "Optimizasyon, minification, tree-shaking", "DUSUK"],
  ["CDN Entegrasyonu", "GLB/USDZ dosyalari icin CDN (CloudFront/Vercel Edge)", "ORTA"],
  ["SEO Optimizasyonu", "Meta taglar, structured data, sitemap", "ORTA"],
  ["PWA Destegi", "Offline calisma, install prompt", "ORTA"],
  ["HTTPS Sertifikasi", "AR Quick Look production'da HTTPS zorunlu", "DUSUK"],
  ["Caching Stratejisi", "ISR, SWR, static generation", "ORTA"],
  ["Veritabani Optimizasyonu", "Index'ler, query optimizasyonu, connection pooling", "ORTA"],
  [],
  [],
  ["FAZ 8 - GELISMIS OZELLIKLER"],
  ["Oncelik: DUSUK | Tahmini Sure: 3-4 hafta"],
  [],
  ["Ozellik", "Aciklama", "Karmasiklik"],
  ["Tasarim Kaydetme/Paylasma", "Kullanicinin kendi tasarimini kaydetmesi ve paylasma linki", "ORTA"],
  ["Tasarim Galerisi", "Topluluk tasarimlari vitrin sayfasi", "ORTA"],
  ["Malzeme/Renk Secimi", "PLA, PETG, ABS malzeme ve renk secenekleri", "ORTA"],
  ["Yazdirma Suresi Tahmini", "Model karmasikligina gore sure ve maliyet hesaplama", "YUKSEK"],
  ["Coklu Dil Destegi", "i18n - Turkce, Ingilizce, diger diller", "ORTA"],
  ["Urun Karsilastirma", "Yan yana urun karsilastirma", "DUSUK"],
  ["Musteri Yorumlari", "Urun degerlendirme ve yorum sistemi", "ORTA"],
];

const wsFuture = XLSX.utils.aoa_to_sheet(futurePhasesData);
wsFuture["!cols"] = [{ wch: 35 }, { wch: 60 }, { wch: 15 }];
XLSX.utils.book_append_sheet(wb, wsFuture, "Gelecek Fazlar");

// ============================================================
// SAYFA 5: DOSYA YAPISI
// ============================================================
const fileStructureData = [
  ["PROJE DOSYA YAPISI - AR ILE ILGILI DOSYALAR"],
  [],
  ["Dizin / Dosya", "Tur", "Aciklama"],
  ["src/types/ar.types.ts", "Tip Tanimlari", "ARPlatform, ARCapabilities, GLBExportResult, USDZExportResult, ARExportResult, RealSizeDimensions"],
  [],
  ["src/lib/ar/", "Kutuphane", "AR ile ilgili yardimci fonksiyonlar"],
  ["  deviceDetection.ts", "Util", "detectARPlatform(), detectARCapabilities(), getARModesString()"],
  ["  realSizeCalibration.ts", "Util", "extractDimensions() - 7 urun tipi icin mm boyutlari"],
  ["  sceneBuilder.ts", "Util", "buildParametricScene() - pure Three.js sahne olusturucu (7 model)"],
  ["  glbExporter.ts", "Util", "exportSceneToGLB(), exportSceneToUSDZ(), revokeGLBUrl()"],
  [],
  ["src/hooks/", "React Hooks", "AR ile ilgili React hook'lari"],
  ["  useARSupport.ts", "Hook", "capabilities, isChecking, arModesString, isSupported"],
  ["  useGLBExport.ts", "Hook", "glbUrl, usdzUrl, isExporting, error, exportGLB, exportForAR"],
  [],
  ["src/components/ar/", "UI Components", "AR ile ilgili React component'leri"],
  ["  ARViewer.tsx", "Component", "model-viewer wrapper - 3D onizleme (AR tetiklemesi YOK)"],
  ["  ARButton.tsx", "Component", "AR'da Gor / 3D Onizleme butonu"],
  ["  ARModal.tsx", "Component", "Full-screen modal - iOS USDZ linki + Android intent"],
  ["  ProductARButton.tsx", "Component", "Urun detay sayfasi icin client wrapper"],
  [],
  ["src/app/api/ar/", "API", "AR model dosya endpoint'i"],
  ["  route.ts", "API Route", "POST: GLB/USDZ upload, otomatik cleanup (10dk)"],
  [],
  ["next.config.ts", "Config", "GLB/USDZ MIME type + CORS header'lari"],
  ["public/ar-models/", "Static", "Gecici AR model dosyalari (gitignore'da)"],
];

const wsFiles = XLSX.utils.aoa_to_sheet(fileStructureData);
wsFiles["!cols"] = [{ wch: 40 }, { wch: 20 }, { wch: 70 }];
XLSX.utils.book_append_sheet(wb, wsFiles, "Dosya Yapisi");

// ============================================================
// DOSYAYA YAZ
// ============================================================
XLSX.writeFile(wb, outputPath);
console.log(`✅ Excel raporu olusturuldu: ${outputPath}`);
