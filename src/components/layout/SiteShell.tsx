"use client";

import { usePathname } from "next/navigation";

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
const TAM_EKRAN = ["/admin/ajan"];

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
  const tamEkran = TAM_EKRAN.some((p) => yol === p || yol.startsWith(`${p}/`));

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
    </>
  );
}
