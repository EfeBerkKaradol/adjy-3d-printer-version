"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Button } from "@/components/ui/button";
import { X, Smartphone, Info, AlertCircle, Camera, Loader2 } from "lucide-react";
import { ARViewer } from "./ARViewer";
import { useARSupport } from "@/hooks/useARSupport";
import { Badge } from "@/components/ui/badge";
import type { RealSizeDimensions } from "@/types/ar.types";

interface ARModalProps {
  isOpen: boolean;
  onClose: () => void;
  glbUrl: string;
  usdzUrl?: string | null;
  productName: string;
  dimensions?: RealSizeDimensions;
}

/**
 * ARModal - Full screen modal for 3D preview + AR
 *
 * AR Tetikleme Stratejisi (model-viewer KULLANMADAN):
 *
 * iOS: <a rel="ar" href="model.usdz"> linki ile AR Quick Look
 *   - USDZ formatinda dosya ZORUNLU
 *   - <img> tag'i <a>'nin ilk child'i olmali
 *   - Kullanicinin dogrudan bu linke tiklamasi gerekli
 *
 * Android: Scene Viewer intent URL ile
 *   - GLB dosyasi kullanilir
 *   - intent:// URL scheme ile Google Scene Viewer acilir
 *
 * Desktop: Sadece 3D preview (model-viewer ile)
 */
export function ARModal({
  isOpen,
  onClose,
  glbUrl,
  usdzUrl,
  productName,
  dimensions,
}: ARModalProps) {
  const { capabilities, isSupported } = useARSupport();
  const [modelLoaded, setModelLoaded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const modelLoadCalledRef = useRef(false);

  const isIOS = capabilities.platform === "ios";
  const isAndroid = capabilities.platform === "android";

  // Modal acildiginda state sifirla
  useEffect(() => {
    if (isOpen) {
      setModelLoaded(false);
      setErrorMsg(null);
      modelLoadCalledRef.current = false;
    }
  }, [isOpen]);

  // Modal acikken body scroll'u kilitle
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  // ESC ile kapat
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    if (isOpen) window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [isOpen, onClose]);

  const handleModelLoad = useCallback(() => {
    // Birden fazla kez cagrilmasini engelle
    if (!modelLoadCalledRef.current) {
      modelLoadCalledRef.current = true;
      setModelLoaded(true);
    }
  }, []);

  // Android: Scene Viewer intent URL olustur
  const handleAndroidAR = useCallback(() => {
    const fileUrl = encodeURIComponent(glbUrl);
    const fallbackUrl = encodeURIComponent(glbUrl);
    const intentUrl =
      `intent://arvr.google.com/scene-viewer/1.0?` +
      `file=${fileUrl}` +
      `&mode=ar_preferred` +
      `&title=${encodeURIComponent(productName)}` +
      `#Intent;scheme=https;` +
      `package=com.google.android.googlequicksearchbox;` +
      `action=android.intent.action.VIEW;` +
      `S.browser_fallback_url=${fallbackUrl};end;`;

    window.location.href = intentUrl;
  }, [glbUrl, productName]);

  if (!isOpen) return null;

  const platformLabel = isIOS
    ? "AR Quick Look"
    : isAndroid
      ? "Scene Viewer"
      : "3D Onizleme";

  // iOS icin AR butonu: <a rel="ar"> linki
  // KRITIK: <img> tag'i <a>'nin ilk child'i OLMALI (iOS gereksinimleri)
  const renderARButton = () => {
    if (!modelLoaded) {
      return (
        <Button
          size="lg"
          className="w-full text-base gap-3 h-14 bg-gradient-to-r from-blue-600 to-purple-600"
          disabled
        >
          <Loader2 className="h-6 w-6 animate-spin" />
          Model Yukleniyor...
        </Button>
      );
    }

    // iOS: <a rel="ar"> ile USDZ dosyasina link
    if (isIOS && usdzUrl) {
      return (
        <a
          rel="ar"
          href={usdzUrl}
          className="flex items-center justify-center w-full text-base gap-3 h-14 rounded-lg text-white font-semibold no-underline"
          style={{
            background: "linear-gradient(to right, #2563eb, #9333ea)",
            boxShadow: "0 4px 14px rgba(37, 99, 235, 0.4)",
            WebkitTapHighlightColor: "transparent",
          }}
        >
          {/* img MUST be first child for iOS AR Quick Look to work */}
          <img
            src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7"
            alt=""
            width={1}
            height={1}
            style={{ position: "absolute", opacity: 0 }}
          />
          <Camera className="h-6 w-6" />
          Odana Yerlestir
        </a>
      );
    }

    // iOS ama USDZ yoksa: uyari goster
    if (isIOS && !usdzUrl) {
      return (
        <Button
          size="lg"
          className="w-full text-base gap-3 h-14 bg-gradient-to-r from-gray-500 to-gray-600"
          disabled
        >
          <AlertCircle className="h-6 w-6" />
          USDZ dosyasi olusturulamadi
        </Button>
      );
    }

    // Android: Scene Viewer intent
    if (isAndroid) {
      return (
        <Button
          size="lg"
          className="w-full text-base gap-3 h-14 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
          onClick={handleAndroidAR}
        >
          <Camera className="h-6 w-6" />
          Odana Yerlestir
        </Button>
      );
    }

    // Desktop: sadece 3D preview bilgisi
    return (
      <div className="text-center text-sm text-muted-foreground py-2">
        AR deneyimi icin bu sayfayi mobil cihazdan acin.
      </div>
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-background/95 backdrop-blur-sm">
      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between p-4 bg-gradient-to-b from-background via-background/80 to-transparent">
        <div>
          <h2 className="font-semibold text-lg">{productName}</h2>
          <div className="flex items-center gap-2 mt-1">
            <Badge variant="outline" className="text-xs gap-1">
              <Smartphone className="h-3 w-3" />
              {platformLabel}
            </Badge>
            {dimensions && (
              <span className="text-xs text-muted-foreground">
                {dimensions.widthMm.toFixed(0)} x{" "}
                {dimensions.heightMm.toFixed(0)} x{" "}
                {dimensions.depthMm.toFixed(0)} mm
              </span>
            )}
          </div>
        </div>
        <Button variant="ghost" size="icon" onClick={onClose}>
          <X className="h-5 w-5" />
        </Button>
      </div>

      {/* 3D Preview (model-viewer - sadece goruntuleme, AR yok) */}
      <div className="absolute inset-0 pt-20 pb-44">
        <ARViewer
          glbSrc={glbUrl}
          alt={`${productName} - 3D Onizleme`}
          onError={(err) => setErrorMsg(err.message)}
          onModelLoad={handleModelLoad}
        />
      </div>

      {/* Alt panel: AR butonu + bilgi */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-background via-background/90 to-transparent">
        <div className="space-y-3">
          {/* Hata mesaji */}
          {errorMsg && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/30">
              <AlertCircle className="h-4 w-4 text-red-500 mt-0.5 shrink-0" />
              <p className="text-xs text-red-500">{errorMsg}</p>
            </div>
          )}

          {/* AR Butonu */}
          {renderARButton()}

          {/* Bilgi */}
          <div className="flex items-start gap-2 p-3 rounded-lg bg-muted/50 border border-border/40">
            <Info className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
            <div className="text-xs text-muted-foreground">
              {isSupported ? (
                <p>
                  3D modeli parmaginizla dondurerek inceleyin. Gercek boyutta
                  odaniza yerlestirmek icin butona dokunun.
                </p>
              ) : (
                <p>
                  3D modeli fare ile dondurerek inceleyin. AR deneyimi icin
                  mobil cihazdan ziyaret edin.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
