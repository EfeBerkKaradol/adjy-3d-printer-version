"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Search, X, Box, CornerDownLeft, Clock } from "lucide-react";

// ==========================================
// ARAMA KATMANI
// Masaüstünde büyük bir örtü, mobilde tam ekran.
// /api/products?search= üzerinden anlık sonuç getirir;
// klavye ile gezilebilir (↑ ↓ Enter Esc).
// ==========================================

interface SearchProduct {
  id: string;
  name: string;
  slug: string;
  basePrice: number;
  thumbnailUrl: string | null;
  category: { name: string; slug: string };
}

interface SearchOverlayProps {
  open: boolean;
  onClose: () => void;
}

const RECENT_KEY = "adjy-recent-searches";
const MAX_RECENT = 5;

function readRecent(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? (JSON.parse(raw) as string[]).slice(0, MAX_RECENT) : [];
  } catch {
    return [];
  }
}

function pushRecent(term: string) {
  if (typeof window === "undefined" || !term.trim()) return;
  try {
    const next = [term, ...readRecent().filter((t) => t !== term)].slice(0, MAX_RECENT);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  } catch {
    // localStorage kullanılamıyor — arama yine de çalışır
  }
}

export function SearchOverlay({ open, onClose }: SearchOverlayProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const [active, setActive] = useState(-1);
  const [recent, setRecent] = useState<string[]>([]);

  // Açılışta odaklan, geçmişi tazele, arka planı kilitle
  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const t = setTimeout(() => inputRef.current?.focus(), 40);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      clearTimeout(t);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  // Kapanınca durumu sıfırla
  useEffect(() => {
    if (open) return;
    setQuery("");
    setResults([]);
    setActive(-1);
  }, [open]);

  // Debounce'lu arama
  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/products?search=${encodeURIComponent(term)}&limit=6`,
          { signal: controller.signal }
        );
        if (!res.ok) throw new Error("arama başarısız");
        const data = await res.json();
        setResults(data.products ?? []);
        setActive(-1);
      } catch (err) {
        if ((err as Error).name !== "AbortError") setResults([]);
      } finally {
        setLoading(false);
      }
    }, 220);
    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [query]);

  const goToSearchPage = useCallback(
    (term: string) => {
      const t = term.trim();
      if (!t) return;
      pushRecent(t);
      onClose();
      router.push(`/products?search=${encodeURIComponent(t)}`);
    },
    [onClose, router]
  );

  const goToProduct = useCallback(
    (product: SearchProduct) => {
      pushRecent(query.trim());
      onClose();
      router.push(`/products/${product.slug}`);
    },
    [onClose, query, router]
  );

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (results.length ? (i + 1) % results.length : -1));
      return;
    }
    if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (results.length ? (i - 1 + results.length) % results.length : -1));
      return;
    }
    if (e.key === "Enter") {
      e.preventDefault();
      if (active >= 0 && results[active]) goToProduct(results[active]);
      else goToSearchPage(query);
    }
  }

  if (!open) return null;

  const term = query.trim();

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col"
      role="dialog"
      aria-modal="true"
      aria-label="Ürün arama"
    >
      {/* Örtü */}
      <button
        type="button"
        aria-label="Aramayı kapat"
        onClick={onClose}
        className="absolute inset-0 bg-background/70 backdrop-blur-sm"
      />

      <div className="relative mx-auto w-full max-w-3xl px-4 pt-0 sm:pt-[12vh]">
        <div className="overflow-hidden border border-border bg-background shadow-2xl shadow-foreground/5 sm:rounded-lg">
          {/* Arama alanı */}
          <div className="flex items-center gap-3 border-b border-border px-4 sm:px-5">
            <Search className="h-[18px] w-[18px] shrink-0 text-muted-foreground" aria-hidden />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ürün, kategori veya malzeme ara"
              aria-label="Arama terimi"
              aria-autocomplete="list"
              className="h-16 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground sm:h-[68px] sm:text-lg"
            />
            <button
              type="button"
              onClick={onClose}
              aria-label="Kapat"
              className="rounded-sm p-1.5 text-muted-foreground transition-colors hover:text-foreground"
            >
              <X className="h-[18px] w-[18px]" />
            </button>
          </div>

          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {/* Sonuçlar */}
            {term.length >= 2 && (
              <div>
                {loading && (
                  <p className="px-5 py-6 text-sm text-muted-foreground">Aranıyor…</p>
                )}

                {!loading && results.length === 0 && (
                  <div className="px-5 py-8">
                    <p className="text-sm font-medium">
                      &ldquo;{term}&rdquo; için sonuç bulunamadı
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Farklı bir kelime deneyin ya da tüm ürünlere göz atın.
                    </p>
                  </div>
                )}

                {!loading && results.length > 0 && (
                  <ul role="listbox" aria-label="Arama sonuçları" className="py-2">
                    {results.map((p, i) => (
                      <li key={p.id} role="option" aria-selected={i === active}>
                        <button
                          type="button"
                          onMouseEnter={() => setActive(i)}
                          onClick={() => goToProduct(p)}
                          className={`flex w-full items-center gap-4 px-5 py-3 text-left transition-colors ${
                            i === active ? "bg-surface" : ""
                          }`}
                        >
                          <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-sm bg-surface-2">
                            {p.thumbnailUrl ? (
                              <Image
                                src={p.thumbnailUrl}
                                alt=""
                                width={48}
                                height={48}
                                className="h-full w-full object-cover"
                              />
                            ) : (
                              <Box className="h-5 w-5 text-muted-foreground" aria-hidden />
                            )}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium">{p.name}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {p.category?.name}
                            </span>
                          </span>
                          <span className="shrink-0 text-sm font-medium tabular-nums">
                            {Number(p.basePrice).toFixed(2)} TL
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <button
                  type="button"
                  onClick={() => goToSearchPage(term)}
                  className="flex w-full items-center justify-between border-t border-border px-5 py-3.5 text-left text-sm transition-colors hover:bg-surface"
                >
                  <span>
                    &ldquo;{term}&rdquo; için tüm sonuçları gör
                  </span>
                  <CornerDownLeft className="h-4 w-4 text-muted-foreground" aria-hidden />
                </button>
              </div>
            )}

            {/* Boş durum: geçmiş + hızlı erişim */}
            {term.length < 2 && (
              <div className="px-5 py-5">
                {recent.length > 0 && (
                  <div className="mb-6">
                    <p className="adjy-eyebrow mb-3">Son aramalar</p>
                    <div className="flex flex-wrap gap-2">
                      {recent.map((r) => (
                        <button
                          key={r}
                          type="button"
                          onClick={() => setQuery(r)}
                          className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs transition-colors hover:bg-surface"
                        >
                          <Clock className="h-3 w-3 text-muted-foreground" aria-hidden />
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <p className="adjy-eyebrow mb-3">Hızlı erişim</p>
                <div className="grid gap-1">
                  {[
                    { label: "Tüm ürünler", href: "/products" },
                    { label: "Özelleştirilebilir ürünler", href: "/products?customizable=true" },
                    { label: "Öne çıkanlar", href: "/products?featured=true" },
                    { label: "Kendi modelini üret", href: "/3d-baski-fiyati-hesapla" },
                  ].map((s) => (
                    <button
                      key={s.href}
                      type="button"
                      onClick={() => {
                        onClose();
                        router.push(s.href);
                      }}
                      className="-mx-2 rounded-sm px-2 py-2 text-left text-sm transition-colors hover:bg-surface"
                    >
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
