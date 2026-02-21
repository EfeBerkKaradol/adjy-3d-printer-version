"use client";

import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

// model-viewer web component icin TypeScript tanimlari
type ModelViewerAttributes = React.HTMLAttributes<HTMLElement> & {
  src?: string;
  "ios-src"?: string;
  alt?: string;
  ar?: boolean | "";
  "ar-modes"?: string;
  "ar-scale"?: string;
  "ar-placement"?: string;
  "camera-controls"?: boolean | "";
  "auto-rotate"?: boolean | "";
  "shadow-intensity"?: string;
  "environment-image"?: string;
  poster?: string;
  loading?: string;
  reveal?: string;
  "interaction-prompt"?: string;
  "touch-action"?: string;
  style?: React.CSSProperties;
  ref?: React.Ref<HTMLElement>;
  children?: React.ReactNode;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}

declare module "react" {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": ModelViewerAttributes;
    }
  }
}

interface ARViewerProps {
  glbSrc: string;
  alt: string;
  onModelLoad?: () => void;
  onError?: (error: Error) => void;
}

/**
 * ARViewer - Sadece 3D model preview icin model-viewer wrapper.
 * AR tetiklemesi bu component'in DISINDA yapilir (ARModal icinde).
 * model-viewer burada sadece 3D goruntuleme + kamera kontrolleri icin.
 */
export function ARViewer({ glbSrc, alt, onModelLoad, onError }: ARViewerProps) {
  const viewerRef = useRef<HTMLElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [debugInfo, setDebugInfo] = useState<string>("");

  // model-viewer'i browser'da dynamic import et
  useEffect(() => {
    import("@google/model-viewer")
      .then(() => {
        setIsLoaded(true);
        setDebugInfo("model-viewer yuklendi");
      })
      .catch((err) => {
        setDebugInfo(`HATA: ${err.message}`);
        onError?.(err);
      });
  }, [onError]);

  // Model yukleme event listener'lari
  useEffect(() => {
    const el = viewerRef.current;
    if (!el || !isLoaded) return;

    const handleLoad = () => {
      setDebugInfo("Model yuklendi");
      onModelLoad?.();
    };

    const handleError = (event: Event) => {
      const detail = (event as CustomEvent).detail;
      const msg = detail?.message || detail?.type || "Bilinmeyen hata";
      setDebugInfo(`HATA: ${msg}`);
      onError?.(new Error(msg));
    };

    const handleProgress = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.totalProgress !== undefined) {
        const pct = Math.round(detail.totalProgress * 100);
        setDebugInfo(`Yukleniyor: %${pct}`);
        if (detail.totalProgress >= 1) {
          setDebugInfo("Model yuklendi");
          onModelLoad?.();
        }
      }
    };

    el.addEventListener("load", handleLoad);
    el.addEventListener("error", handleError);
    el.addEventListener("progress", handleProgress);

    // Zaten yuklenmis olabilir
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((el as any).loaded || (el as any).modelIsVisible) {
      onModelLoad?.();
    }

    return () => {
      el.removeEventListener("load", handleLoad);
      el.removeEventListener("error", handleError);
      el.removeEventListener("progress", handleProgress);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  if (!isLoaded) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-muted/30 rounded-xl">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">
            3D goruntuleyici yukleniyor...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* model-viewer: sadece 3D preview, AR yok */}
      <model-viewer
        ref={viewerRef}
        src={glbSrc}
        alt={alt}
        camera-controls=""
        auto-rotate=""
        shadow-intensity="1"
        environment-image="neutral"
        loading="eager"
        interaction-prompt="auto"
        touch-action="pan-y"
        style={{
          width: "100%",
          height: "100%",
          minHeight: "400px",
          backgroundColor: "transparent",
        }}
      />

      {/* Debug bilgisi */}
      <div className="absolute top-2 left-2 right-2 z-10 pointer-events-none">
        <p className="text-[10px] text-muted-foreground/70 bg-background/50 px-2 py-1 rounded">
          {debugInfo} | src: {glbSrc ? glbSrc.substring(0, 60) : "YOK"}
        </p>
      </div>
    </div>
  );
}
