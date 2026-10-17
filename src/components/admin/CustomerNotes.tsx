"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Plus, Trash2, X } from "lucide-react";

// ==========================================
// MÜŞTERİ NOTLARI VE ETİKETLERİ
//
// Bir siparişin arkasındaki konuşma hiçbir tabloda durmuyor:
// kim aradı, ne söz verildi, neden iade istedi. Bunlar burada
// durur ki bir dahaki sefere baştan sorulmasın.
// ==========================================

export interface Not {
  id: string;
  body: string;
  authorEmail: string | null;
  createdAt: string;
}

interface Props {
  userId: string;
  notes: Not[];
  tags: string[];
}

export function CustomerNotes({ userId, notes, tags }: Props) {
  const router = useRouter();
  const [metin, setMetin] = useState("");
  const [yeniEtiket, setYeniEtiket] = useState("");
  const [hata, setHata] = useState<string | null>(null);
  const [bekliyor, basla] = useTransition();

  async function gonder(govde: Record<string, unknown>) {
    setHata(null);
    const res = await fetch(`/api/admin/customers/${userId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(govde),
    });
    if (!res.ok) {
      setHata((await res.json().catch(() => ({}))).error ?? "Kaydedilemedi");
      return false;
    }
    basla(() => router.refresh());
    return true;
  }

  return (
    <div className="space-y-8">
      <section>
        <h2 className="text-sm font-medium">Etiketler</h2>
        <p className="mt-1 text-xs text-muted-foreground">
          Listede süzmek için: toptan, dikkat, kurumsal…
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {tags.map((t) => (
            <span
              key={t}
              className="inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-xs"
            >
              {t}
              <button
                type="button"
                aria-label={`${t} etiketini kaldır`}
                onClick={() => void gonder({ tags: tags.filter((x) => x !== t) })}
                className="text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-3 w-3" aria-hidden />
              </button>
            </span>
          ))}
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const v = yeniEtiket.trim();
              if (!v) return;
              if (await gonder({ tags: [...tags, v] })) setYeniEtiket("");
            }}
            className="flex items-center gap-1.5"
          >
            <input
              value={yeniEtiket}
              onChange={(e) => setYeniEtiket(e.target.value)}
              placeholder="etiket ekle"
              aria-label="Yeni etiket"
              className="w-28 rounded-full border border-border/60 bg-background px-2.5 py-1 text-xs"
            />
            <button
              type="submit"
              aria-label="Etiketi ekle"
              className="rounded-full border border-border/60 p-1 transition-colors hover:bg-muted"
            >
              <Plus className="h-3 w-3" aria-hidden />
            </button>
          </form>
        </div>
      </section>

      <section>
        <h2 className="text-sm font-medium">Notlar</h2>
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            const v = metin.trim();
            if (!v) return;
            if (await gonder({ note: v })) setMetin("");
          }}
          className="mt-3"
        >
          <textarea
            value={metin}
            onChange={(e) => setMetin(e.target.value)}
            placeholder="Telefonla aradı, kargo gecikmesini sordu…"
            aria-label="Yeni not"
            className="min-h-24 w-full resize-y rounded-lg border border-border/60 bg-background p-3 text-sm"
          />
          <div className="mt-2 flex items-center gap-3">
            <button
              type="submit"
              disabled={!metin.trim() || bekliyor}
              className="inline-flex items-center gap-2 rounded-lg bg-foreground px-4 py-2 text-sm font-medium text-background disabled:opacity-50"
            >
              {bekliyor && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
              Not ekle
            </button>
            {hata && <span className="text-sm text-destructive">{hata}</span>}
          </div>
        </form>

        <ul className="mt-5 space-y-3">
          {notes.length === 0 && (
            <li className="text-sm text-muted-foreground">Henüz not yok.</li>
          )}
          {notes.map((n) => (
            <li key={n.id} className="rounded-lg border border-border/40 bg-card p-4">
              <p className="whitespace-pre-wrap text-sm leading-relaxed">{n.body}</p>
              <div className="mt-3 flex items-center justify-between gap-3 text-xs text-muted-foreground">
                <span>
                  {new Date(n.createdAt).toLocaleString("tr-TR", {
                    day: "numeric",
                    month: "short",
                    year: "numeric",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                  {n.authorEmail && ` · ${n.authorEmail}`}
                </span>
                <button
                  type="button"
                  aria-label="Notu sil"
                  onClick={async () => {
                    const res = await fetch(
                      `/api/admin/customers/${userId}?noteId=${n.id}`,
                      { method: "DELETE" }
                    );
                    if (res.ok) basla(() => router.refresh());
                  }}
                  className="transition-colors hover:text-destructive"
                >
                  <Trash2 className="h-3.5 w-3.5" aria-hidden />
                </button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
