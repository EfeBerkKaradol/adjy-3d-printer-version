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
