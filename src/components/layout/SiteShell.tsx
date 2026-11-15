"use client";

import { usePathname } from "next/navigation";
import { SayfaKari } from "@/components/yilbasi/SayfaKari";

// ==========================================
// SİTE ÇERÇEVESİ
//
// Mağaza başlığı ve altbilgisi kök yerleşimde durduğu için admin
// tarafındaki tam ekran çalışan sayfalara da sarılıyordu: ürün
// ajanı paneli, üstünde mağaza menüsü altında altbilgi ve çerez
// şeridiyle avuç içi kadar bir alana sıkışıyordu.
//
// Bu sayfalar çerçevesiz açılır; geri kalan her şey eskisi gibi.
// ==========================================

/** Tam ekran açılan yollar (bu yol ve altındakiler) */
const TAM_EKRAN = ["/admin/ajan", "/admin/uretim"];

/**
 * Tasarım aracının açıldığı sayfa: /tasarla/<ürün>/ozellestir.
 * Model ve ayarların tamamı kaydırmadan tek ekrana sığsın diye
 * çerçevesiz açılır; ürün sayfasına dönüş stüdyonun kendi çubuğunda.
 */
const OZELLESTIRME = /^\/tasarla\/[^/]+\/ozellestir\/?$/;

interface Props {
  /** Üstteki hizmet şeridi — tam ekran sayfalarda da gösterilmez */
  announcement?: React.ReactNode;
  header: React.ReactNode;
  footer: React.ReactNode;
  cookieConsent: React.ReactNode;
  children: React.ReactNode;
}

export function SiteShell({ announcement, header, footer, cookieConsent, children }: Props) {
  const yol = usePathname() ?? "";
  const tamEkran =
    TAM_EKRAN.some((p) => yol === p || yol.startsWith(`${p}/`)) || OZELLESTIRME.test(yol);

  if (tamEkran) return <>{children}</>;

  return (
    <>
      <div className="flex min-h-screen flex-col">
        {announcement}
        {header}
        <main id="main" className="flex-1">
          {children}
        </main>
        {footer}
      </div>
      {cookieConsent}
      {/* Yılbaşı döneminde sayfa geneli piksel kar (dönem dışında boş) */}
      <SayfaKari />
    </>
  );
}
