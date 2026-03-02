"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Cookie } from "lucide-react";

export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const consent = localStorage.getItem("cookie-consent");
    if (!consent) {
      setVisible(true);
    }
  }, []);

  const handleAccept = () => {
    localStorage.setItem("cookie-consent", "accepted");
    setVisible(false);
  };

  const handleReject = () => {
    localStorage.setItem("cookie-consent", "rejected");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 p-4">
      <div className="container mx-auto max-w-4xl">
        <div className="bg-card border border-border/40 rounded-xl p-4 shadow-lg flex flex-col sm:flex-row items-start sm:items-center gap-4">
          <Cookie className="h-5 w-5 shrink-0 text-muted-foreground" />
          <p className="text-sm text-muted-foreground flex-1">
            Deneyiminizi iyilestirmek icin cerezler kullaniyoruz.{" "}
            <Link href="/privacy" className="underline hover:text-foreground">
              Gizlilik politikamizi
            </Link>{" "}
            inceleyebilirsiniz.
          </p>
          <div className="flex gap-2 shrink-0">
            <Button variant="outline" size="sm" onClick={handleReject}>
              Reddet
            </Button>
            <Button size="sm" onClick={handleAccept}>
              Kabul Et
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
