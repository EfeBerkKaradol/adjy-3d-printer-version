// ==========================================
// KAYDEDİLEN MODELİ AÇMA
//
// Kaydedilen şey bir görsel değil, modelin tarifi: biçim
// profili, parametreleri ve ölçüleri. Bu yüzden geri
// yüklendiğinde model yeniden kurulur ve kullanıcı kaldığı
// yerden ölçü değiştirmeye devam edebilir.
// ==========================================

import type { GeneratedModel, ModelParameter, PhotoAnalysis } from "../types";

interface SavedRecord {
  id: string;
  previewUrl: string | null;
  parameters: {
    kind?: "revolve" | "extrude";
    profile?: number[];
    outline?: Array<[number, number]>;
    parameters?: ModelParameter[];
    dimensions?: { widthMm: number; depthMm: number; heightMm: number };
  };
}

export interface ResumedModel {
  analysis: PhotoAnalysis;
  model: GeneratedModel;
}

export async function loadSavedModel(id: string): Promise<ResumedModel> {
  const res = await fetch("/api/generated-products");
  if (res.status === 401) throw new Error("Bu modeli görmek için giriş yapman gerekiyor.");
  if (!res.ok) throw new Error("Model açılamadı.");

  const data: { models: SavedRecord[] } = await res.json();
  const row = data.models?.find((m) => m.id === id);
  const p = row?.parameters;

  if (!row || !p?.kind || !p.profile?.length || !p.parameters?.length || !p.dimensions) {
    throw new Error("Bu model açılamadı. Yeni bir fotoğrafla tekrar deneyebilirsin.");
  }

  const model: GeneratedModel = {
    kind: p.kind,
    profile: p.profile,
    outline: p.outline ?? [],
    parameters: p.parameters,
    dimensions: p.dimensions,
    color: "#e8e5de",
    dimensionsConfirmed: true,
  };

  // Kaydedilen kayıtta ham fotoğraf çözümlemesi tutulmaz;
  // sonuç ekranının ihtiyaç duyduğu asgari bilgi yeniden kurulur.
  const analysis: PhotoAnalysis = {
    aspectRatio: p.dimensions.widthMm / Math.max(1, p.dimensions.heightMm),
    profile: p.profile,
    outline: p.outline ?? [],
    symmetry: p.kind === "revolve" ? 1 : 0,
    color: "#e8e5de",
    issues: [],
    previewDataUrl: row.previewUrl ?? "",
  };

  return { analysis, model };
}
