"use client";

import { useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";
import { useARSupport } from "@/hooks/useARSupport";
import { useGLBExport } from "@/hooks/useGLBExport";

function ARIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 2H2v5" />
      <path d="M17 2h5v5" />
      <path d="M7 22H2v-5" />
      <path d="M17 22h5v-5" />
      <path d="M12 8l4 2.5v5L12 18l-4-2.5v-5L12 8z" />
    </svg>
  );
}

interface ARButtonProps {
  parameters: Record<string, number | string>;
  productType: string;
  modelFileUrl?: string | null;
  productName: string;
  compact?: boolean;
  onActivateAR?: (glbUrl: string, usdzUrl?: string | null) => void;
}

export function ARButton({
  parameters,
  productType,
  modelFileUrl,
  productName,
  compact = false,
  onActivateAR,
}: ARButtonProps) {
  const { isSupported, isChecking } = useARSupport();
  const { isExporting, exportForAR } = useGLBExport({
    parameters,
    productType,
    modelFileUrl,
  });
  const [activating, setActivating] = useState(false);

  const handleClick = useCallback(async () => {
    setActivating(true);
    const result = await exportForAR();
    if (result && onActivateAR) {
      onActivateAR(result.glbUrl, result.usdzUrl);
    }
    setActivating(false);
  }, [exportForAR, onActivateAR]);

  if (isChecking) return null;

  const isLoading = isExporting || activating;

  if (compact) {
    return (
      <Button
        variant="outline"
        size="icon"
        onClick={handleClick}
        disabled={isLoading}
        title={isSupported ? "AR'da Gor" : "3D Onizleme"}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ARIcon className="h-4 w-4" />
        )}
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="lg"
      className="w-full gap-2"
      onClick={handleClick}
      disabled={isLoading}
    >
      {isLoading ? (
        <>
          <Loader2 className="h-5 w-5 animate-spin" />
          {isExporting ? "Model hazirlaniyor..." : "AR hazirlaniyor..."}
        </>
      ) : (
        <>
          <ARIcon className="h-5 w-5" />
          {isSupported ? "AR'da Gor" : "3D Onizleme"}
        </>
      )}
    </Button>
  );
}
