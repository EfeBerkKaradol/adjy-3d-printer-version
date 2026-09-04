import Link from "next/link";
import Image from "next/image";
import { FOOTER_NAV } from "@/lib/navigation";

// ==========================================
// FOOTER
// Dört sütun + güvenli ödeme rozetleri.
// Sosyal hesaplar projede tanımlı olmadığı için
// buraya uydurma bağlantı eklenmedi.
// ==========================================

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="adjy-container py-16 md:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_3fr]">
          {/* Marka */}
          <div className="max-w-sm">
            <span className="font-[family-name:var(--font-orbitron)] text-xl font-extrabold tracking-[0.22em]">
              ADJY
            </span>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground">
              Adaptive Design Joy. Dijitalden fiziksele geçen ürünler: hazır al,
              ölçünü değiştir ya da kendi modelini ürettir.
            </p>
          </div>

          {/* Bağlantı sütunları */}
          <nav aria-label="Alt navigasyon">
            <div className="grid grid-cols-2 gap-x-8 gap-y-10 sm:grid-cols-4">
              {FOOTER_NAV.map((group) => (
                <div key={group.title}>
                  <h2 className="adjy-eyebrow mb-4 text-foreground">{group.title}</h2>
                  <ul className="space-y-2.5">
                    {group.links.map((link) => (
                      <li key={link.href + link.label}>
                        <Link
                          href={link.href}
                          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </nav>
        </div>

        <div className="mt-16 flex flex-col items-start gap-6 border-t border-border pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            &copy; {new Date().getFullYear()} ADJY. Tüm hakları saklıdır.
          </p>

          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground">Güvenli ödeme</span>
            <Image
              src="/assets/payment/visa.svg"
              alt="Visa"
              width={60}
              height={38}
              className="h-7 w-auto opacity-60 transition-opacity hover:opacity-100"
            />
            <Image
              src="/assets/payment/mastercard.svg"
              alt="MasterCard"
              width={60}
              height={38}
              className="h-7 w-auto opacity-60 transition-opacity hover:opacity-100"
            />
            <Image
              src="/assets/payment/iyzico.svg"
              alt="iyzico ile öde"
              width={90}
              height={28}
              className="h-6 w-auto opacity-60 transition-opacity hover:opacity-100"
            />
          </div>
        </div>
      </div>
    </footer>
  );
}
