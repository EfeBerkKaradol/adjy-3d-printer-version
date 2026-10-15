/**
 * Uygulama base URL'sini döndürür.
 *
 * - Client (tarayıcı): Boş string döner → relative URL kullanılır (/api/...)
 * - Server (Vercel): VERCEL_URL veya NEXT_PUBLIC_APP_URL kullanır
 * - Lokal: http://localhost:3000 fallback
 */
export function getBaseUrl(): string {
  // Tarayıcıda relative URL kullan (fetch("/api/...") şeklinde)
  if (typeof window !== "undefined") return "";

  // Server-side
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}

/**
 * Site hangi adresten sunuluyorsa canonical de o olmalı.
 *
 * Alan adı www'ye yönlendiriyor ama yapılandırmada apex hâli
 * duruyordu; canonical etiketleri yönlenen bir adrese işaret
 * ediyordu. Arama motoru bunu kendi çözüyor ama tarama bütçesi
 * boşa gidiyor ve sinyaller iki adrese bölünüyor.
 *
 * Yapılandırma düzeltilirse burası da kendiliğinden devre dışı
 * kalır — normalleştirme yalnızca apex hâlini www'ye çevirir.
 */
function canonicalHost(url: string): string {
  return url.replace(/^https:\/\/adjyshopping\.com/, "https://www.adjyshopping.com");
}

/**
 * Mutlaka absolute URL döndürür (SEO, meta, payment callback gibi durumlar için).
 * Client tarafında bile absolute URL verir.
 */
export function getAbsoluteUrl(): string {
  if (process.env.NEXT_PUBLIC_APP_URL) return canonicalHost(process.env.NEXT_PUBLIC_APP_URL);
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
