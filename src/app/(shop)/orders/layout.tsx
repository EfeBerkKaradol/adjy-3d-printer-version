import type { Metadata } from "next";

// Kişisel ve işlemsel sayfa: arama sonuçlarında yeri yok.
// robots.txt zaten engelliyor ama doğrudan bağlantıyla
// ulaşılan sayfalar için meta etiketi daha güvenilir.
export const metadata: Metadata = {
  title: "Sipariş Detayı",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
