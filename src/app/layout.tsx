import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteShell } from "@/components/layout/SiteShell";
import { AnnouncementBar } from "@/components/layout/AnnouncementBar";
import { VisitTracker } from "@/components/analytics/VisitTracker";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { CartSyncProvider } from "@/components/cart-sync-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/layout/CookieConsent";
import "./globals.css";
import { getAbsoluteUrl } from "@/lib/url";

const GA4_ID = process.env.NEXT_PUBLIC_GA4_ID;

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const orbitron = Orbitron({
  variable: "--font-orbitron",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

export const metadata: Metadata = {
  title: {
    default: "ADJY — Özel Ölçüde Tasarım Ürünleri",
    template: "%s | ADJY",
  },
  description:
    "Vazo, saksı, aydınlatma ve dekoratif ürünler; kendi atölyemizde 3D baskı, seramik ve alçı ile üretiliyor. Çoğunun ölçüsünü kendinize göre belirleyebilirsiniz.",
  keywords: [
    "dekoratif ürünler",
    "tasarım vazo",
    "dekoratif saksı",
    "özel ölçü üretim",
    "3D baskı dekorasyon",
    "seramik dekoratif ürün",
    "alçı dekoratif ürün",
    "kişiye özel hediye",
  ],
  authors: [{ name: "ADJY" }],
  creator: "ADJY",
  // Tek kaynaktan: canonical, og:url ve og:image hep sitenin
  // gerçekten sunulduğu adresten üretilsin. Eski yedek adres
  // artık kullanılmayan bir önizleme alan adına işaret ediyordu.
  metadataBase: new URL(getAbsoluteUrl()),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "ADJY",
    title: "ADJY — Özel Ölçüde Tasarım Ürünleri",
    description:
      "Vazo, saksı, aydınlatma ve dekoratif ürünler. Kendi atölyemizde üretiliyor; çoğunda ölçüyü siz belirliyorsunuz.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ADJY — Özel Ölçüde Tasarım Ürünleri",
    description:
      "Vazo, saksı, aydınlatma ve dekoratif ürünler. Kendi atölyemizde üretiliyor; çoğunda ölçüyü siz belirliyorsunuz.",
  },
  manifest: "/manifest.json",
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr" suppressHydrationWarning>
      {/* Google Analytics 4 — yalnızca GA4_ID tanımlıysa yüklenir */}
      {GA4_ID && (
        <>
          <Script
            src={`https://www.googletagmanager.com/gtag/js?id=${GA4_ID}`}
            strategy="afterInteractive"
          />
          <Script id="ga4-init" strategy="afterInteractive">
            {`
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', '${GA4_ID}', { page_path: window.location.pathname });
            `}
          </Script>
        </>
      )}
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${orbitron.variable} antialiased`}
      >
        <SessionProvider>
          <CartSyncProvider>
          <WishlistProvider>
            <ThemeProvider
              attribute="class"
              defaultTheme="light"
              enableSystem
              disableTransitionOnChange
            >
              <SiteShell
                announcement={<AnnouncementBar />}
                header={<Header />}
                footer={<Footer />}
                cookieConsent={<CookieConsent />}
              >
                {children}
              </SiteShell>
              <Toaster richColors position="top-right" />
              {/* useSearchParams Suspense sınırı ister; ölçüm
                  sayfanın çizilmesini bekletmemeli. */}
              <Suspense fallback={null}>
                <VisitTracker />
              </Suspense>
              <SpeedInsights />
              <Analytics />
            </ThemeProvider>
          </WishlistProvider>
          </CartSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
