import { Suspense } from "react";
import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics } from "@vercel/analytics/next";
import { Header } from "@/components/layout/Header";
import { Footer } from "@/components/layout/Footer";
import { SiteShell } from "@/components/layout/SiteShell";
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
    default: "ADJY — Tasarım Nesneleri ve Parametrik Üretim",
    template: "%s | ADJY",
  },
  description:
    "3D baskı, seramik ve alçı dekoratif nesneler. Ölçüsünü kendi alanına göre değiştir, odanda gör, ürettir.",
  keywords: [
    "3D baskı",
    "seramik dekoratif ürün",
    "alçı dekoratif ürün",
    "parametrik tasarım",
    "AR",
    "özelleştirilebilir ürünler",
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
    title: "ADJY — Tasarım Nesneleri ve Parametrik Üretim",
    description:
      "3D baskı, seramik ve alçı dekoratif nesneler. Ölçüsünü değiştir, odanda gör, ürettir.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ADJY — Tasarım Nesneleri ve Parametrik Üretim",
    description:
      "3D baskı, seramik ve alçı dekoratif nesneler. Ölçüsünü değiştir, odanda gör, ürettir.",
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
