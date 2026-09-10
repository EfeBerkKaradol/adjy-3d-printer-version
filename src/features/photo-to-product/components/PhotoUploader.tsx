"use client";

import { useCallback, useRef, useState } from "react";
import { Camera, ImagePlus, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { track } from "../services/analytics";

// ==========================================
// FOTOĞRAF YÜKLEME
//
// Masaüstünde sürükle-bırak ve dosya seçici, mobilde ayrıca
// doğrudan kamera. Kamera girişi ayrı bir input olarak durur:
// aynı input'a capture eklemek masaüstünde dosya seçiciyi
// bozuyor.
// ==========================================

const ACCEPT = "image/jpeg,image/png,image/webp,image/heic,image/heif";
const MAX_MB = 12;

interface PhotoUploaderProps {
  onSelect: (file: File) => void;
  disabled?: boolean;
}

export function PhotoUploader({ onSelect, disabled }: PhotoUploaderProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const accept = useCallback(
    (file: File | undefined | null) => {
      if (!file) return;
      if (!file.type.startsWith("image/")) {
        setError("Lütfen bir fotoğraf seç.");
        return;
      }
      if (file.size > MAX_MB * 1024 * 1024) {
        setError(`Fotoğraf ${MAX_MB} MB'tan küçük olmalı.`);
        return;
      }
      setError(null);
      track("photo_uploaded", { size: file.size });
      onSelect(file);
    },
    [onSelect]
  );

  return (
    <div>
      <div
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          if (!disabled) accept(e.dataTransfer.files?.[0]);
        }}
        className={`rounded-lg border border-dashed px-6 py-14 text-center transition-colors ${
          dragging ? "border-foreground bg-surface-2" : "border-border bg-surface-2/50"
        }`}
      >
        <ImagePlus className="mx-auto h-7 w-7 text-muted-foreground" aria-hidden />
        <p className="mt-4 text-[15px] font-medium">Fotoğrafı buraya bırak</p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          JPG, PNG veya WEBP · en fazla {MAX_MB} MB
        </p>

        <div className="mt-6 flex flex-col items-center justify-center gap-2.5 sm:flex-row">
          <Button
            type="button"
            disabled={disabled}
            onClick={() => {
              track("photo_upload_started", { source: "picker" });
              fileRef.current?.click();
            }}
          >
            Fotoğraf Yükle
          </Button>
          {/* Kamera yalnızca dokunmatik cihazlarda anlamlı */}
          <Button
            type="button"
            variant="outline"
            disabled={disabled}
            className="sm:hidden"
            onClick={() => {
              track("photo_upload_started", { source: "camera" });
              cameraRef.current?.click();
            }}
          >
            <Camera className="mr-2 h-4 w-4" aria-hidden />
            Fotoğraf Çek
          </Button>
        </div>

        <input
          ref={fileRef}
          type="file"
          accept={ACCEPT}
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
        <input
          ref={cameraRef}
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => accept(e.target.files?.[0])}
        />
      </div>

      {error && <p className="mt-3 text-sm text-destructive">{error}</p>}
    </div>
  );
}

// ==========================================
// SEÇİLEN FOTOĞRAFIN ÖNİZLEMESİ
// ==========================================

interface PhotoPreviewProps {
  src: string;
  onChange: () => void;
  busy?: boolean;
}

export function PhotoPreview({ src, onChange, busy }: PhotoPreviewProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-md bg-surface-2">
        {/* Yerel dosya önizlemesi: blob/data URL, Next optimizasyonuna girmez */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt="Yüklediğin fotoğraf" className="h-full w-full object-cover" />
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">Fotoğrafın</p>
        <button
          type="button"
          onClick={onChange}
          disabled={busy}
          className="mt-1 inline-flex items-center gap-1.5 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline disabled:opacity-50"
        >
          <RefreshCw className="h-3.5 w-3.5" aria-hidden />
          Başka bir fotoğraf seç
        </button>
      </div>
    </div>
  );
}
