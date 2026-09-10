// ==========================================
// AKIŞ
//
// Fotoğraftan modele giden adımları sırayla yürütür ve her
// adımı arayüze bildirir.
//
// Yüzde göstermiyoruz. Gerçek ilerleme oranı bilinmediği için
// uydurma bir çubuk sadece yanıltır; bunun yerine hangi adımda
// olunduğu yazılır. Adımlar arasına kısa bir bekleme konur —
// bu bir gecikme değil, okunabilirlik içindir: aksi hâlde beş
// satır tek karede geçip kullanıcı ne olduğunu göremiyor.
// ==========================================

import type { GeneratedModel, PhotoAnalysis, PipelineStepId } from "../types";
import { imageAnalysisProvider, modelGenerationProvider } from "../providers";
import { track } from "./analytics";

const MIN_STEP_MS = 260;

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

export interface PipelineResult {
  analysis: PhotoAnalysis;
  model: GeneratedModel;
}

export interface PipelineHandlers {
  onStep: (step: PipelineStepId) => void;
}

async function step<T>(
  id: PipelineStepId,
  handlers: PipelineHandlers,
  work: () => Promise<T>
): Promise<T> {
  handlers.onStep(id);
  const started = Date.now();
  const result = await work();
  const left = MIN_STEP_MS - (Date.now() - started);
  if (left > 0) await wait(left);
  return result;
}

export async function runPipeline(
  file: File,
  handlers: PipelineHandlers
): Promise<PipelineResult> {
  track("ai_analysis_started");

  const analysis = await step("analyze", handlers, () =>
    imageAnalysisProvider.analyze(file)
  );

  const blocking = analysis.issues.find((i) => i.blocking);
  if (blocking) {
    track("model_generation_failed", { reason: blocking.code });
    throw new Error(blocking.message);
  }

  await step("shape", handlers, async () => analysis.profile);
  track("ai_analysis_completed", { symmetry: Math.round(analysis.symmetry * 100) });

  track("model_generation_started");
  const model = await step("build", handlers, () =>
    modelGenerationProvider.generate(analysis)
  );

  await step("process", handlers, async () => true);
  await step("check", handlers, async () => true);

  track("model_generation_completed", { kind: model.kind });
  return { analysis, model };
}
