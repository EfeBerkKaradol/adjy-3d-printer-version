export type ARPlatform = "ios" | "android" | "desktop" | "unknown";

export type ARMode = "scene-viewer" | "webxr" | "quick-look";

export interface ARCapabilities {
  supported: boolean;
  platform: ARPlatform;
  availableModes: ARMode[];
  preferredMode: ARMode | null;
}

export interface ARViewerProps {
  glbSrc: string;
  usdzSrc?: string;
  alt: string;
  ar: boolean;
  arModes: string;
  poster?: string;
  onARStart?: () => void;
  onAREnd?: () => void;
  onError?: (error: Error) => void;
}

export interface GLBExportResult {
  blob: Blob;
  blobUrl: string;
  sizeBytes: number;
}

export interface USDZExportResult {
  blob: Blob;
  blobUrl: string;
  sizeBytes: number;
}

export interface ARExportResult {
  glbUrl: string;
  usdzUrl?: string;
}

export interface RealSizeDimensions {
  widthMm: number;
  heightMm: number;
  depthMm: number;
}
