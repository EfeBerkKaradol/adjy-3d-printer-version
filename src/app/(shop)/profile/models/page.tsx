"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatTRY } from "@/lib/slicer";
import { formatDimensions } from "@/lib/units";

// ==========================================
// MODELLERİM
//
// Fotoğraftan oluşturulup kaydedilen modeller. Buradan
// tekrar açıldığında model aynı ölçülerle yeniden kurulur —
// yani kaydedilen şey bir resim değil, üretilebilir bir tarif.
// ==========================================

interface SavedModel {
  id: string;
  previewUrl: string | null;
  createdAt: string;
  parameters: {
    name?: string;
    dimensions?: { widthMm: number; depthMm: number; heightMm: number };
    priceGross?: number;
  };
}

export default function MyModelsPage() {
  const { status } = useSession();
  const [models, setModels] = useState<SavedModel[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (status !== "authenticated") return;
    let cancelled = false;
    fetch("/api/generated-products")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Modeller yüklenemedi"))))
      .then((d) => {
        if (!cancelled) setModels(d.models ?? []);
      })
      .catch((e: Error) => {
        if (!cancelled) setError(e.message);
      });
    return () => {
      cancelled = true;
    };
  }, [status]);

  if (status === "loading") {
    return (
      <div className="adjy-container adjy-section flex justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
      </div>
    );
  }

  if (status !== "authenticated") {
    return (
      <div className="adjy-container adjy-section">
        <h1 className="adjy-display text-[clamp(1.6rem,3.4vw,2.25rem)]">Modellerim</h1>
        <p className="mt-3 text-[15px] text-muted-foreground">
          Kaydettiğin modelleri görmek için giriş yapman gerekiyor.
        </p>
        <Button asChild className="mt-6">
          <Link href="/login">Giriş yap</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="adjy-container adjy-section">
      <p className="adjy-eyebrow mb-5">Profil</p>
      <h1 className="adjy-display text-[clamp(1.6rem,3.4vw,2.25rem)]">Modellerim</h1>
      <p className="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
        Fotoğraftan oluşturup kaydettiğin modeller. Açıp ölçüsünü yeniden
        değiştirebilir, üretime gönderebilirsin.
      </p>

      {error && <p className="mt-8 text-sm text-destructive">{error}</p>}

      {!models && !error && (
        <div className="mt-12 flex justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" aria-hidden />
        </div>
      )}

      {models && models.length === 0 && (
        <div className="mt-12 rounded-lg border border-dashed border-border p-10 text-center">
          <p className="text-[15px]">Henüz kaydettiğin bir model yok.</p>
          <Button asChild className="mt-5">
            <Link href="/uret/fotograftan-olustur">Fotoğraftan Oluştur</Link>
          </Button>
        </div>
      )}

      {models && models.length > 0 && (
        <ul className="mt-12 grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2 lg:grid-cols-3">
          {models.map((m) => {
            const d = m.parameters?.dimensions;
            return (
              <li key={m.id} className="bg-background">
                <Link
                  href={`/uret/fotograftan-olustur?model=${m.id}`}
                  className="block p-5 transition-colors hover:bg-surface-2"
                >
                  <div className="aspect-square overflow-hidden rounded bg-surface-2">
                    {m.previewUrl && (
                      // Kaydedilen önizleme bir data URL — optimizasyona girmez
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={m.previewUrl}
                        alt=""
                        className="h-full w-full object-cover"
                      />
                    )}
                  </div>
                  <p className="mt-4 text-[15px] font-medium">
                    {m.parameters?.name ?? "Fotoğraftan model"}
                  </p>
                  {d && (
                    <p className="mt-1 text-sm tabular-nums text-muted-foreground">
                      {formatDimensions(d.widthMm, d.depthMm, d.heightMm)}
                    </p>
                  )}
                  {typeof m.parameters?.priceGross === "number" && (
                    <p className="mt-1 text-sm text-muted-foreground">
                      {formatTRY(m.parameters.priceGross)}
                    </p>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
