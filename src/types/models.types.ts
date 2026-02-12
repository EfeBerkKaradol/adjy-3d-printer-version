export interface ModelViewerConfig {
  src: string;
  alt: string;
  ar?: boolean;
  arModes?: string;
  cameraControls?: boolean;
  autoRotate?: boolean;
  shadowIntensity?: number;
  environmentImage?: string;
}

export interface ParametricTransform {
  scaleX: number;
  scaleY: number;
  scaleZ: number;
  color?: string;
}

export interface ProcessingJob {
  id: string;
  status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
  progress: number;
  outputUrl?: string;
  errorMessage?: string;
}
