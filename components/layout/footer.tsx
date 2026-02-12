import Link from "next/link";
import { Box, Mail, Phone, MapPin, Github, Twitter, Instagram, Youtube } from "lucide-react";
import { SITE_NAME } from "@/lib/constants";

const footerLinks = {
  urunler: [
    { label: "3D Yazicilar", href: "/urunler?category=3d-yazicilar" },
    { label: "Filamentler", href: "/urunler?category=filamentler" },
    { label: "Aksesuarlar", href: "/urunler?category=aksesuarlar" },
    { label: "Yedek Parcalar", href: "/urunler?category=parcalar" },
    { label: "Kisiye Ozel", href: "/urunler?category=kisiye-ozel" },
  ],
  sirket: [
    { label: "Hakkimizda", href: "/hakkimizda" },
    { label: "Iletisim", href: "/iletisim" },
    { label: "Blog", href: "/blog" },
    { label: "Kariyer", href: "/kariyer" },
  ],
  destek: [
    { label: "Yardim Merkezi", href: "/yardim" },
    { label: "Kargo Takibi", href: "/kargo-takibi" },
    { label: "Iade ve Degisim", href: "/iade" },
    { label: "SSS", href: "/sss" },
  ],
  yasal: [
    { label: "Gizlilik Politikasi", href: "/gizlilik" },
    { label: "Kullanim Kosullari", href: "/kosullar" },
    { label: "KVKK", href: "/kvkk" },
  ],
};

const socialLinks = [
  { icon: Twitter, href: "https://twitter.com", label: "Twitter" },
  { icon: Instagram, href: "https://instagram.com", label: "Instagram" },
  { icon: Youtube, href: "https://youtube.com", label: "YouTube" },
  { icon: Github, href: "https://github.com", label: "GitHub" },
];

export function Footer() {
  return (
    <footer className="relative border-t border-border bg-card/50">
      {/* Gradient top line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gradient-start to-transparent" />

      <div className="mx-auto max-w-7xl px-4 py-12 lg:px-8 lg:py-16">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-3 lg:grid-cols-6">
          {/* Brand */}
          <div className="col-span-2 md:col-span-3 lg:col-span-2">
            <Link href="/" className="flex items-center gap-2 mb-4">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-gradient-start to-gradient-end">
                <Box className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="text-xl font-bold tracking-tight font-heading">
                {SITE_NAME}
              </span>
            </Link>
            <p className="mb-6 max-w-xs text-sm leading-relaxed text-muted-foreground">
              Hayallerinizi 3D olarak uretiyoruz. Turkiye&apos;nin en kapsamli 3D baski platformu.
            </p>
            <div className="flex flex-col gap-2 text-sm text-muted-foreground">
              <a
                href="mailto:info@adjy.com.tr"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                info@adjy.com.tr
              </a>
              <a
                href="tel:+902121234567"
                className="flex items-center gap-2 hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                +90 (212) 123 45 67
              </a>
              <span className="flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Istanbul, Turkiye
              </span>
            </div>
          </div>

          {/* Link columns */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Urunler</h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.urunler.map((link) => (
                <li key={link.href}>
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

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Sirket</h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.sirket.map((link) => (
                <li key={link.href}>
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

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Destek</h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.destek.map((link) => (
                <li key={link.href}>
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

          <div>
            <h3 className="mb-3 text-sm font-semibold text-foreground">Yasal</h3>
            <ul className="flex flex-col gap-2">
              {footerLinks.yasal.map((link) => (
                <li key={link.href}>
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
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-border pt-8 md:flex-row">
          <p className="text-sm text-muted-foreground">
            &copy; 2026 {SITE_NAME}. Tum haklari saklidir.
          </p>
          <div className="flex items-center gap-3">
            {socialLinks.map((social) => (
              <a
                key={social.label}
                href={social.href}
                target="_blank"
                rel="noopener noreferrer"
                className="flex h-9 w-9 items-center justify-center rounded-lg bg-secondary/50 text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
                aria-label={social.label}
              >
                <social.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>
      </div>
    </footer>
  );
}
