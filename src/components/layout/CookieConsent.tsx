"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useHydrated } from "@/hooks/useClientState";

// ==========================================
// ÇEREZ BİLDİRİMİ
// Sayfanın altında ince bir şerit — ilk ekranı
// kapatmaz. Karar localStorage'da saklanır.
// ==========================================

const STORAGE_KEY = "cookie-consent";

function readConsent(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    // Gizli sekme / engellenmiş depolama: bildirim gösterilmez
    return "unavailable";
  }
}

export function CookieConsent() {
  const hydrated = useHydrated();
  const [decided, setDecided] = useState(false);

  // Hidrasyondan önce sunucuyla aynı çıktıyı ver (hiçbir şey)
  const alreadyDecided = hydrated ? Boolean(readConsent()) : true;
  const visible = hydrated && !alreadyDecided && !decided;

  function decide(value: "accepted" | "rejected") {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Depolama yoksa da bildirimi kapat
    }
    setDecided(true);
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-[60] border-t border-border bg-background/95 backdrop-blur-md"
      role="region"
      aria-label="Çerez bildirimi"
    >
      <div className="adjy-container flex flex-col gap-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          Deneyiminizi iyileştirmek için çerez kullanıyoruz.{" "}
          <Link
            href="/cerez-politikasi"
            className="underline underline-offset-4 transition-colors hover:text-foreground"
          >
            Çerez politikamızı
          </Link>{" "}
          inceleyebilirsiniz.
        </p>
        <div className="flex shrink-0 gap-2">
          <Button variant="outline" size="sm" onClick={() => decide("rejected")}>
            Reddet
          </Button>
          <Button size="sm" onClick={() => decide("accepted")}>
            Kabul et
          </Button>
        </div>
      </div>
    </div>
  );
}
