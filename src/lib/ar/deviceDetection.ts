import type { ARCapabilities, ARPlatform, ARMode } from "@/types/ar.types";

export function detectARPlatform(): ARPlatform {
  if (typeof navigator === "undefined") return "unknown";
  const ua = navigator.userAgent;

  if (
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
  ) {
    return "ios";
  }

  if (/Android/.test(ua)) {
    return "android";
  }

  return "desktop";
}

export function detectARCapabilities(): ARCapabilities {
  const platform = detectARPlatform();
  const modes: ARMode[] = [];

  switch (platform) {
    case "ios":
      modes.push("quick-look");
      break;
    case "android":
      modes.push("scene-viewer");
      if ("xr" in navigator) {
        modes.push("webxr");
      }
      break;
    case "desktop":
      if ("xr" in navigator) {
        modes.push("webxr");
      }
      break;
  }

  return {
    supported: modes.length > 0,
    platform,
    availableModes: modes,
    preferredMode: modes[0] ?? null,
  };
}

export function getARModesString(capabilities: ARCapabilities): string {
  return capabilities.availableModes.join(" ");
}
