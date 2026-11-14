import type { Metadata } from "next";

// Sayfa istemci bileşeni olduğu için başlık burada veriliyor;
// yoksa sekmede sitenin genel başlığı görünüyordu.
export const metadata: Metadata = {
  title: "Şifremi Unuttum",
  robots: { index: false, follow: false },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
