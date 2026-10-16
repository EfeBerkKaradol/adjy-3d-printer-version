"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Bot, Loader2, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * ADJY Ürün Ajanı paneli (yalnız admin; /admin layout'u rolü veritabanından doğrular).
 *
 * Güvenlik: panel HTML'i sandbox="allow-scripts" iframe'de, allow-same-origin OLMADAN çalışır →
 * opak köken; admin çerezlerine, oturuma ve bu sitenin API'lerine doğrudan erişemez.
 * Veri ve işlemler yalnızca bu bileşen üzerinden postMessage ile akar; işlemler sunucuda zod ile doğrulanır.
 */

type Pending = { id: string; kind: string; payload: unknown; createdAt: string; userEmail?: string | null };
type PanelMeta = { generatedAt: string; updatedAt: string };

const ALLOWED_KINDS = new Set(["decision", "content", "maket", "request", "settings"]);

export default function AgentPanelPage() {
  const frame = useRef<HTMLIFrameElement>(null);
  const [srcDoc, setSrcDoc] = useState<string | null>(null);
  const [meta, setMeta] = useState<PanelMeta | null>(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    const [st, pe] = await Promise.all([
      fetch("/api/admin/agent/state", { cache: "no-store" }),
      fetch("/api/admin/agent/actions", { cache: "no-store" }),
    ]);
    if (!st.ok) throw new Error((await st.json().catch(() => ({}))).error || "Panel verisi alınamadı");
    const state = await st.json();
    const pending: Pending[] = pe.ok ? (await pe.json()).pending : [];
    setPendingCount(pending.length);
    return { state, pending };
  }, []);

  const sendState = useCallback(async () => {
    const win = frame.current?.contentWindow;
    if (!win) return;
    try {
      const data = await fetchData();
      // sandbox'lı iframe'in kökeni "null" — hedef köken belirtilemez; veri yalnızca bu iframe penceresine gider.
      win.postMessage({ type: "adjy:state", ...data }, "*");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Veri alınamadı");
    }
  }, [fetchData]);

  // Her yükleme iframe'i baştan kurar. Aynı panel yeniden geldiğinde
  // srcdoc metni birebir aynı olduğu için yeniden atamak tek başına
  // yeniden yükleme başlatmıyor; "Yenile" bu sayede çalışır.
  const [nesil, setNesil] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/agent/panel", { cache: "no-store" });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error || "Panel yüklenemedi");
      setMeta({ generatedAt: body.generatedAt, updatedAt: body.updatedAt });
      // Panel kodu site kipini bu bayraktan anlar (veriyi postMessage ile bekler).
      const flag = "<script>window.ADJY_SITE=true;</script>";
      const html = String(body.html);
      setSrcDoc(/<head[^>]*>/i.test(html) ? html.replace(/<head[^>]*>/i, (m) => m + flag) : flag + html);
      setNesil((n) => n + 1);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Panel yüklenemedi");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // ==========================================
  // PANEL HTML'İNİ IFRAME'E YAZMA
  //
  // srcdoc'u iframe'e daha oluşturulurken vermek güvenilir değil:
  // belge about:blank'te kalıyor, panelin betikleri hiç çalışmıyor
  // ve admin boş bir çerçeve görüyordu. Iframe önce boş kurulur,
  // ancak DOM'a girdikten sonra içerik yazılır.
  // ==========================================
  useEffect(() => {
    if (frame.current && srcDoc) frame.current.srcdoc = srcDoc;
  }, [srcDoc, nesil]);

  useEffect(() => {
    async function onMessage(e: MessageEvent) {
      const win = frame.current?.contentWindow;
      if (!win || e.source !== win) return; // yalnızca kendi iframe'imiz
      const msg = e.data as { type?: string; req?: number; kind?: string; payload?: unknown };
      if (!msg || typeof msg !== "object") return;
      if (msg.type === "adjy:ready") {
        sendState();
        return;
      }
      if (msg.type === "adjy:refresh") {
        sendState();
        return;
      }
      if (msg.type === "adjy:action") {
        const reply = (body: Record<string, unknown>) => win.postMessage({ type: "adjy:ack", req: msg.req, ...body }, "*");
        if (!msg.kind || !ALLOWED_KINDS.has(msg.kind)) return reply({ ok: false, error: "Bu işlem site panelinde yok" });
        try {
          const res = await fetch("/api/admin/agent/actions", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ kind: msg.kind, payload: msg.payload }),
          });
          const body = await res.json().catch(() => ({}));
          if (!res.ok) return reply({ ok: false, error: body.error || "Kaydedilemedi" });
          setPendingCount(body.pending.length);
          reply({ ok: true, pending: body.pending });
        } catch {
          reply({ ok: false, error: "Sunucuya ulaşılamadı" });
        }
      }
    }
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [sendState]);

  const fmt = (s?: string) => (s ? new Date(s).toLocaleString("tr-TR", { dateStyle: "medium", timeStyle: "short" }) : "—");

  return (
    <div className="flex h-[calc(100vh-4rem)] flex-col gap-3 lg:h-[calc(100vh-2rem)]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Bot className="h-6 w-6" />
          <div>
            <h1 className="text-2xl font-bold">Ürün Ajanı</h1>
            <p className="text-sm text-muted-foreground">
              Ajan verisi: {fmt(meta?.generatedAt)} · siteye gönderim: {fmt(meta?.updatedAt)}
              {pendingCount > 0 && ` · ajana iletilmeyi bekleyen ${pendingCount} işlem`}
            </p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Yenile
        </Button>
      </div>
      {error && (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm">
          {error}
          {error.includes("senkron") && (
            <span className="block text-muted-foreground">
              Bilgisayarda: <code>python3 -m adjy site-push</code>
            </span>
          )}
        </div>
      )}
      {srcDoc && (
        <iframe
          ref={frame}
          key={nesil}
          title="ADJY Ürün Ajanı paneli"
          // Panel yüklenir yüklenmez veriyi gönderiyoruz. Eskiden yalnızca
          // panelin "adjy:ready" mesajı beklenirdi; o mesaj iframe hazır
          // olmadan ya da dinleyici yeniden kurulurken gelebildiği için
          // kaçıyor ve panel boş bir çerçeve olarak kalıyordu.
          onLoad={() => void sendState()}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="min-h-0 w-full flex-1 rounded-lg border bg-background"
        />
      )}
    </div>
  );
}
