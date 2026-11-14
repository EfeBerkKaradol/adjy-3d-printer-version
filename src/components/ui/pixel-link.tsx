import Link from "next/link";
import { cn } from "@/lib/utils";
import { PixelArrow } from "@/components/home/PixelMoreButton";

// ==========================================
// PİKSEL BAĞLANTI DÜĞMESİ
// İçerik sayfalarındaki çağrı düğmeleri (Ürünleri görün,
// Bize yazın): basamaklı köşeli çerçeve, mono versal yazı,
// üzerine gelince sert gölgeyle yukarı kalkar.
// "solid" dolu zemin, "outline" boş zemin.
// ==========================================

interface PixelLinkProps {
  href: string;
  children: React.ReactNode;
  variant?: "solid" | "outline";
  className?: string;
  external?: boolean;
}

export function PixelLink({ href, children, variant = "outline", className, external }: PixelLinkProps) {
  const cls = cn(
    "adjy-pixel-card inline-flex items-center gap-3 px-5 py-3 font-mono text-xs font-semibold uppercase tracking-[0.14em]",
    variant === "solid" && "adjy-pixel-card-solid",
    className
  );
  const icerik = (
    <>
      {children}
      <PixelArrow />
    </>
  );
  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {icerik}
      </a>
    );
  }
  return (
    <Link href={href} className={cls}>
      {icerik}
    </Link>
  );
}
