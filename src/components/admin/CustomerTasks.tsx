"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2, Trash2 } from "lucide-react";

// ==========================================
// TAKİP GÖREVLERİ
//
// "Cuma ara", "numune gönder" — söz verilen şeyler. Tarihi
// geçmiş olan kırmızı durur; yapılan, üstü çizili olarak altta
// kalır ki ne konuşulduğu kaybolmasın.
// ==========================================

export interface Gorev {
  id: string;
  title: string;
  dueAt: string | null;
  doneAt: string | null;
  createdBy: string | null;
}

function gecikmis(g: Gorev): boolean {
  return !g.doneAt && !!g.dueAt && new Date(g.dueAt).getTime() < Date.now();
}

function tarihYaz(iso: string): string {
  return new Date(iso).toLocaleDateString("tr-TR", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function CustomerTasks({ userId, tasks }: { userId: string; tasks: Gorev[] }) {
  const router = useRouter();
  const [baslik, setBaslik] = useState("");
  const [tarih, setTarih] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  async function istek(init: RequestInit) {
    setHata(null);
    const res = await fetch(`/api/admin/customers/${userId}/tasks`, init);
    if (!res.ok) {
      setHata((await res.json().catch(() => ({}))).error ?? "İşlem başarısız");
      return false;
    }
    basla(() => router.refresh());
    return true;
  }

  const acik = tasks.filter((t) => !t.doneAt);
  const biten = tasks.filter((t) => t.doneAt);

  return (
    <section>
      <h2 className="text-sm font-medium">Takip</h2>
      <p className="mt-1 text-xs text-muted-foreground">
        Söz verilen şeyler burada durur; yapılana kadar düşmez.
      </p>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const v = baslik.trim();
          if (!v) return;
          const ok = await istek({
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ title: v, dueAt: tarih || null }),
          });
          if (ok) {
            setBaslik("");
            setTarih("");
          }
        }}
        className="mt-3 space-y-2"
      >
        <input
          value={baslik}
          onChange={(e) => setBaslik(e.target.value)}
          placeholder="Cuma ara, numune gönder…"
          aria-label="Görev"
          className="w-full rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
        />
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={tarih}
            onChange={(e) => setTarih(e.target.value)}
            aria-label="Son tarih"
            className="rounded-lg border border-border/60 bg-background px-3 py-2 text-sm"
          />
          <button
            type="submit"
            disabled={!baslik.trim() || bekliyor}
            className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
          >
            {bekliyor && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
            Ekle
          </button>
        </div>
        {hata && <p className="text-sm text-destructive">{hata}</p>}
      </form>

      <ul className="mt-4 space-y-2">
        {acik.length === 0 && biten.length === 0 && (
          <li className="text-sm text-muted-foreground">Takip edilen bir şey yok.</li>
        )}

        {acik.map((t) => (
          <li
            key={t.id}
            className={`flex items-start gap-3 rounded-lg border p-3 ${
              gecikmis(t) ? "border-destructive/40 bg-destructive/5" : "border-border/40 bg-card"
            }`}
          >
            <button
              type="button"
              aria-label="Yapıldı olarak işaretle"
              onClick={() =>
                void istek({
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ taskId: t.id, done: true }),
                })
              }
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border transition-colors hover:bg-muted"
            >
              <Check className="h-3 w-3 opacity-0 hover:opacity-50" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug">{t.title}</p>
              {t.dueAt && (
                <p
                  className={`mt-1 text-xs ${
                    gecikmis(t) ? "font-medium text-destructive" : "text-muted-foreground"
                  }`}
                >
                  {gecikmis(t) ? "Gecikti · " : ""}
                  {tarihYaz(t.dueAt)}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Görevi sil"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/customers/${userId}/tasks?taskId=${t.id}`,
                  { method: "DELETE" }
                );
                if (res.ok) basla(() => router.refresh());
              }}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}

        {biten.map((t) => (
          <li
            key={t.id}
            className="flex items-start gap-3 rounded-lg border border-border/40 bg-muted/30 p-3"
          >
            <button
              type="button"
              aria-label="Yapılmadı olarak işaretle"
              onClick={() =>
                void istek({
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ taskId: t.id, done: false }),
                })
              }
              className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border border-foreground/40 bg-foreground/80 text-background"
            >
              <Check className="h-3 w-3" aria-hidden />
            </button>
            <div className="min-w-0 flex-1">
              <p className="text-sm leading-snug text-muted-foreground line-through">
                {t.title}
              </p>
              {t.doneAt && (
                <p className="mt-1 text-xs text-muted-foreground">
                  {tarihYaz(t.doneAt)} tarihinde yapıldı
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Görevi sil"
              onClick={async () => {
                const res = await fetch(
                  `/api/admin/customers/${userId}/tasks?taskId=${t.id}`,
                  { method: "DELETE" }
                );
                if (res.ok) basla(() => router.refresh());
              }}
              className="text-muted-foreground transition-colors hover:text-destructive"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
