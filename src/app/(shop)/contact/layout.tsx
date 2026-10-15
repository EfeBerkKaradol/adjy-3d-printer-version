import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "İletişim",
  description:
    "ADJY Beşiktaş/İstanbul. 3D baskı, seramik ve alçı üretim talepleri, toptan siparişler ve sorularınız için bize yazın.",
  alternates: { canonical: "/contact" },
  openGraph: {
    title: "İletişim | ADJY",
    description: "Üretim talepleri ve sorularınız için ADJY ile iletişime geçin.",
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
