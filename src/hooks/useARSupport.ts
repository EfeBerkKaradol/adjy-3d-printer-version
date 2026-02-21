"use client";

import { useState, useEffect } from "react";
import {
  detectARCapabilities,
  getARModesString,
} from "@/lib/ar/deviceDetection";
import type { ARCapabilities } from "@/types/ar.types";

export function useARSupport() {
  const [capabilities, setCapabilities] = useState<ARCapabilities>({
    supported: false,
    platform: "unknown",
    availableModes: [],
    preferredMode: null,
  });
  const [isChecking, setIsChecking] = useState(true);

  useEffect(() => {
    const caps = detectARCapabilities();
    setCapabilities(caps);
    setIsChecking(false);
  }, []);

  const arModesString = getARModesString(capabilities);

  const statusMessage = isChecking
    ? "AR destegi kontrol ediliyor..."
    : capabilities.supported
      ? "AR destekleniyor"
      : "Bu cihaz AR desteklemiyor";

  return {
    capabilities,
    isChecking,
    arModesString,
    statusMessage,
    isSupported: capabilities.supported,
  };
}
