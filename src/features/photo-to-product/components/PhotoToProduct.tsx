"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { GeneratedModel, PhotoAnalysis, PipelineStepId } from "../types";
import { runPipeline } from "../services/pipeline";
import { loadSavedModel } from "../services/resume";
import { track } from "../services/analytics";
import { PhotoPreview, PhotoUploader } from "./PhotoUploader";
import { AnalysisProgress } from "./AnalysisProgress";
import { ResultWorkspace } from "./ResultWorkspace";

// ==========================================
// FOTOĞRAFTAN ÜRÜNE — AKIŞ
//
// Dört durum: seçim, analiz, sonuç, hata. Her hata durumunda
// kullanıcıya ne yapabileceği söylenir; çıkmaz sokak yok.
// ==========================================

type Phase =
  | { name: "idle" }
  | { name: "analyzing"; step: PipelineStepId }
  | { name: "result"; analysis: PhotoAnalysis; model: GeneratedModel }
  | { name: "error"; message: string };

/** Seçilen fotoğraf ve önizleme adresi birlikte tutulur */
interface Source {
  file: File;
  url: string;
}

export function PhotoToProduct({ modelId }: { modelId?: string }) {
  const [phase, setPhase] = useState<Phase>({ name: "idle" });
  const [source, setSource] = useState<Source | null>(null);

  // Önizleme adresi seçim anında üretilir. Efekt içinde
  // üretmek zincirleme render'a yol açıyordu; burada yalnızca
  // sayfadan çıkarken serbest bırakılır.
  const liveUrl = useRef<string | null>(null);
  useEffect(() => () => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
  }, []);

  // Modellerim'den gelindiyse doğrudan sonuç ekranı açılır
  useEffect(() => {
    if (!modelId) return;
    let cancelled = false;
    loadSavedModel(modelId)
      .then(({ analysis, model }) => {
        if (!cancelled) setPhase({ name: "result", analysis, model });
      })
      .catch((e: Error) => {
        if (!cancelled) setPhase({ name: "error", message: e.message });
      });
    return () => {
      cancelled = true;
    };
  }, [modelId]);

  const select = useCallback((file: File) => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    const url = URL.createObjectURL(file);
    liveUrl.current = url;
    setSource({ file, url });
    setPhase({ name: "idle" });
  }, []);

  const start = useCallback(async (selected: File) => {
    setPhase({ name: "analyzing", step: "analyze" });
    try {
      const { analysis, model } = await runPipeline(selected, {
        onStep: (step) => setPhase({ name: "analyzing", step }),
      });
      track("configurator_opened", { kind: model.kind });
      setPhase({ name: "result", analysis, model });
    } catch (e) {
      const message =
        e instanceof Error
          ? e.message
          : "Bu fotoğraftan yeterince net bir model oluşturamadık. Farklı bir açıdan tekrar deneyebilirsin.";
      track("model_generation_failed", {});
      setPhase({ name: "error", message });
    }
  }, []);

  const restart = useCallback(() => {
    if (liveUrl.current) URL.revokeObjectURL(liveUrl.current);
    liveUrl.current = null;
    setSource(null);
    setPhase({ name: "idle" });
  }, []);

  if (phase.name === "result") {
    return (
      <>
        {/* Engellemeyen uyarılar sonucu bloke etmez, yalnızca bilgilendirir */}
        {phase.analysis.issues.length > 0 && (
          <div className="mb-8 rounded-md bg-surface-2 p-4">
            <ul className="space-y-1.5">
              {phase.analysis.issues.map((issue) => (
                <li key={issue.code} className="text-sm leading-relaxed text-muted-foreground">
                  {issue.message}
                </li>
              ))}
            </ul>
          </div>
        )}
        <ResultWorkspace
          analysis={phase.analysis}
          model={phase.model}
          onRestart={restart}
        />
      </>
    );
  }

  return (
    <div className="mx-auto max-w-xl">
      {phase.name === "idle" && (
        <>
          {source ? (
            <div className="space-y-6">
              <PhotoPreview src={source.url} onChange={restart} />
              <Button className="w-full" size="lg" onClick={() => start(source.file)}>
                Bu fotoğrafla devam et
              </Button>
            </div>
          ) : (
            <PhotoUploader onSelect={select} />
          )}
          <p className="mt-6 text-xs leading-relaxed text-muted-foreground">
            Yüklediğin görseller ve oluşturduğun modeller üzerinde gerekli kullanım
            haklarına sahip olduğundan emin ol.
          </p>
        </>
      )}

      {phase.name === "analyzing" && (
        <div className="py-10">
          {source && (
            <div className="mb-10 flex justify-center">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={source.url}
                alt="Yüklediğin fotoğraf"
                className="h-40 w-40 rounded-lg object-cover"
              />
            </div>
          )}
          <AnalysisProgress current={phase.step} />
        </div>
      )}

      {phase.name === "error" && (
        <div className="rounded-md border border-border p-6">
          <AlertTriangle className="h-5 w-5 text-muted-foreground" aria-hidden />
          <p className="mt-3 text-[15px] leading-relaxed">{phase.message}</p>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button onClick={restart}>Başka bir fotoğraf dene</Button>
            {source && (
              <Button variant="outline" onClick={() => start(source.file)}>
                Tekrar dene
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
