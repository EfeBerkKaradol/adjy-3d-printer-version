import type { Metadata } from "next";
import { Geist, Geist_Mono, Orbitron } from "next/font/google";
import Script from "next/script";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { ThemeProvider } from "@/components/theme-provider";
import { SessionProvider } from "@/components/session-provider";
import { CartSyncProvider } from "@/components/cart-sync-provider";
import { WishlistProvider } from "@/components/wishlist-provider";
import { Toaster } from "sonner";
import { CookieConsent } from "@/components/layout/CookieConsent";
import "./globals.css";

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
    default: "ADJY - 3D Baskı E-Ticaret Platformu",
    template: "%s | ADJY",
  },
  description:
    "3D modelleri parametrik olarak özelleştir, AR ile görüntüle ve satın al. Türkiye'nin ilk parametrik 3D baskı e-ticaret platformu.",
  keywords: ["3D baskı", "3D print", "parametrik tasarım", "AR", "e-ticaret", "özelleştirilebilir ürünler"],
  authors: [{ name: "ADJY" }],
  creator: "ADJY",
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL ||
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "https://v0-adjy-3d-printer-version.vercel.app")
  ),
  openGraph: {
    type: "website",
    locale: "tr_TR",
    siteName: "ADJY",
    title: "ADJY - 3D Baskı E-Ticaret Platformu",
    description: "3D modelleri parametrik olarak özelleştir, AR ile görüntüle ve satın al.",
  },
  twitter: {
    card: "summary_large_image",
    title: "ADJY - 3D Baskı E-Ticaret Platformu",
    description: "3D modelleri parametrik olarak özelleştir, AR ile görüntüle ve satın al.",
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
              defaultTheme="dark"
              enableSystem
              disableTransitionOnChange
            >
              <div className="flex min-h-screen flex-col">
                <Navbar />
                <main className="flex-1">{children}</main>
                <Footer />
              </div>
              <Toaster richColors position="top-right" />
              <CookieConsent />
              <SpeedInsights />
            </ThemeProvider>
          </WishlistProvider>
          </CartSyncProvider>
        </SessionProvider>
      </body>
    </html>
  );
}
