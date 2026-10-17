import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";

// ==========================================
// TAM EKRAN PANEL YERLEŞİMİ
//
// Ürün ajanı kendi başına bir yönetim ekranı: sekmeleri, listeleri
// ve kendi gezinmesi var. Admin kenar çubuğunun yanındaki dar
// içerik sütununa sığmıyordu, mağaza başlığı ve altbilgisiyle
// birlikte iyice eziliyordu.
//
// Bu yüzden admin yerleşiminin dışında, ekranın tamamını kullanan
// ayrı bir sayfa olarak durur. Yetki kontrolü admin yerleşimiyle
// aynı: rol JWT'den değil veritabanından okunur.
// ==========================================

export const metadata = {
  title: "ADJY Ürün Ajanı",
};

export default async function PanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user?.id) redirect("/login?callbackUrl=/admin/ajan");

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (user?.role !== "ADMIN") redirect("/");

  return (
    <SessionProvider>
      <ThemeProvider
        attribute="class"
        defaultTheme="dark"
        enableSystem
        disableTransitionOnChange
      >
        <div className="h-screen w-full overflow-hidden bg-background">{children}</div>
      </ThemeProvider>
    </SessionProvider>
  );
}
