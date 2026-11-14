import type { Metadata } from "next";

// Sayfa istemci bileşeni olduğu için başlık burada veriliyor;
// yoksa sekmede sitenin genel başlığı görünüyordu.
export const metadata: Metadata = {
  title: "Kayıt Ol",
  description: "ADJY hesabı oluşturun; siparişlerinizi ve favorilerinizi tek yerden takip edin.",
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
