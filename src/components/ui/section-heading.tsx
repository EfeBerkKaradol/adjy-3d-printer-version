import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

// ==========================================
// BÖLÜM BAŞLIĞI
// Ana sayfa ve liste sayfalarında tek bir başlık
// ritmi kurar: üst etiket · başlık · alt metin · bağlantı.
// ==========================================

interface SectionHeadingProps {
  eyebrow?: string;
  title: string;
  description?: string;
  action?: { label: string; href: string };
  className?: string;
  /** Başlık seviyesi — sayfada tek h1 olması için ayarlanabilir */
  as?: "h2" | "h3";
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  action,
  className,
  as: Tag = "h2",
}: SectionHeadingProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between",
        className
      )}
    >
      <div className="max-w-2xl">
        {eyebrow && <p className="adjy-eyebrow mb-4">{eyebrow}</p>}
        <Tag className="adjy-display text-[clamp(1.75rem,3.4vw,2.75rem)]">{title}</Tag>
        {description && (
          <p className="mt-4 text-[15px] leading-relaxed text-muted-foreground md:text-base">
            {description}
          </p>
        )}
      </div>

      {action && (
        <Link
          href={action.href}
          className="group inline-flex shrink-0 items-center gap-2 border-b border-foreground pb-1 text-sm font-medium transition-colors hover:border-muted-foreground hover:text-muted-foreground"
        >
          {action.label}
          <ArrowRight
            className="h-4 w-4 transition-transform duration-200 group-hover:translate-x-0.5"
            aria-hidden
          />
        </Link>
      )}
    </div>
  );
}
