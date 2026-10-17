"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Bot, Loader2, RefreshCw } from "lucide-react";
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

  // Ajan aynı paneli gönderdiğinde srcDoc metni değişmez ve React
  // yeniden çizmez; bu sayaç "Yenile"nin yine de yeni bir yükleme
  // başlatmasını sağlar.
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
  // PANEL HTML'İNİ IFRAME'E VERME
  //
  // Panel srcdoc ile yüklenmiyordu: belge about:blank'te kalıyor,
  // içindeki hiçbir betik çalışmıyor, panel "hazırım" diyemediği
  // için beklediği veri hiç gelmiyor ve admin boş bir çerçeve
  // görüyordu. İçeriği sonradan yazmak da kurtarmadı.
  //
  // Bunun yerine HTML bir blob'a yazılıp iframe'e src olarak
  // verilir — bu yol her seferinde çalışır. Her yüklemede yeni bir
  // blob adresi üretildiği için ajan birebir aynı paneli gönderse
  // bile "Yenile" gerçekten yeniden yükler.
  //
  // Güvenlik değişmez: sandbox'ta allow-same-origin olmadığı için
  // blob belgesi de opak kökendedir, admin oturumuna erişemez.
  // ==========================================
  useEffect(() => {
    const el = frame.current;
    if (!el || !srcDoc) return;
    const adres = URL.createObjectURL(new Blob([srcDoc], { type: "text/html" }));
    el.src = adres;
    return () => URL.revokeObjectURL(adres);
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
    <div className="flex h-screen flex-col">
      {/* Panelin kendi gezinmesi var; buradaki şerit yalnızca
          admin paneline dönüş ve tazeleme için ince tutuldu. */}
      <header className="flex items-center justify-between gap-3 border-b border-border/60 px-3 py-2">
        <div className="flex min-w-0 items-center gap-2 sm:gap-3">
          <Button variant="ghost" size="sm" asChild className="gap-2">
            <Link href="/admin">
              <ArrowLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Admin paneli</span>
              <span className="sr-only sm:hidden">Admin paneline dön</span>
            </Link>
          </Button>
          <span className="hidden h-5 w-px bg-border sm:block" aria-hidden />
          <div className="flex min-w-0 items-center gap-2">
            <Bot className="hidden h-5 w-5 shrink-0 sm:block" />
            <div className="min-w-0 leading-tight">
              <h1 className="text-sm font-semibold">Ürün Ajanı</h1>
              {/* Tarih satırı dar ekranda şeridi üç satıra yayıyordu */}
              <p className="hidden truncate text-xs text-muted-foreground md:block">
                Ajan verisi: {fmt(meta?.generatedAt)} · siteye gönderim: {fmt(meta?.updatedAt)}
                {pendingCount > 0 && ` · ajana iletilmeyi bekleyen ${pendingCount} işlem`}
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" className="shrink-0" onClick={load} disabled={loading}>
          {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
          Yenile
        </Button>
      </header>

      {error && (
        <div className="border-b border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
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
          title="ADJY Ürün Ajanı paneli"
          // Panel yüklenir yüklenmez veriyi gönderiyoruz. Eskiden yalnızca
          // panelin "adjy:ready" mesajı beklenirdi; o mesaj iframe hazır
          // olmadan ya da dinleyici yeniden kurulurken gelebildiği için
          // kaçıyor ve panel boş bir çerçeve olarak kalıyordu.
          onLoad={() => void sendState()}
          sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
          className="min-h-0 w-full flex-1 border-0 bg-background"
        />
      )}
    </div>
  );
}
