"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, PackagePlus } from "lucide-react";

// ==========================================
// ÖRNEK SİPARİŞLERİ OLUŞTUR (Kendin Üret Atölyesi)
//
// Her Kendin Üret ürünü için bir, hazır ürünlerden üç örnek
// sipariş açar ya da yeniler. Ödemesi beklemede açılır; ciroya
// karışmaz.
// ==========================================

export function OrnekSiparisDugmesi({ varMi }: { varMi: boolean }) {
  const router = useRouter();
  const [durum, setDurum] = useState<"bos" | "calisiyor">("bos");
  const [mesaj, setMesaj] = useState<string | null>(null);

  async function kur() {
    setDurum("calisiyor");
    setMesaj(null);
    try {
      const r = await fetch("/api/admin/ornek-siparisler", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error ?? "Kurulamadı");
      const atlanan = (j.atlanan ?? []) as { urun: string; neden: string }[];
      setMesaj(
        `${j.kurulan?.length ?? 0} örnek sipariş hazır.` +
          (atlanan.length ? ` Atlanan: ${atlanan.map((a) => `${a.urun} (${a.neden})`).join(", ")}` : "")
      );
      router.refresh();
    } catch (e) {
      setMesaj(e instanceof Error ? e.message : "Kurulamadı");
    } finally {
      setDurum("bos");
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button
        type="button"
        onClick={kur}
        disabled={durum === "calisiyor"}
        className="inline-flex h-9 items-center gap-2 rounded-lg border-2 border-foreground px-3 text-sm font-medium transition-colors hover:bg-foreground hover:text-background disabled:opacity-50"
      >
        {durum === "calisiyor" ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
        ) : (
          <PackagePlus className="h-4 w-4" aria-hidden />
        )}
        {varMi ? "Örnek siparişleri yenile" : "Örnek siparişleri oluştur"}
      </button>
      {mesaj && <p className="max-w-sm text-right text-xs text-muted-foreground">{mesaj}</p>}
    </div>
  );
}
