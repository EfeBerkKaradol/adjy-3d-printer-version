// ==========================================
// OLAY KAYDI
//
// Akışın her adımı tek bir yerden bildirilir. Şu an Vercel
// Analytics özel olayları varsa oraya gider, yoksa sessizce
// düşer — sayaç eksik diye ürün akışı durmaz.
// ==========================================

export type PhotoFlowEvent =
  | "photo_upload_started"
  | "photo_uploaded"
  | "ai_analysis_started"
  | "ai_analysis_completed"
  | "model_generation_started"
  | "model_generation_completed"
  | "model_generation_failed"
  | "configurator_opened"
  | "parameter_changed"
  | "material_changed"
  | "price_updated"
  | "ar_opened"
  | "ar_placed"
  | "generated_product_saved"
  | "add_to_cart"
  | "checkout_started";

type Payload = Record<string, string | number | boolean | null>;

interface VercelAnalyticsWindow {
  va?: (event: "event", payload: { name: string } & Payload) => void;
}

export function track(event: PhotoFlowEvent, payload: Payload = {}): void {
  if (typeof window === "undefined") return;
  const w = window as unknown as VercelAnalyticsWindow;
  try {
    w.va?.("event", { name: event, ...payload });
  } catch {
    // Ölçüm hatası kullanıcıyı etkilemez
  }
}
