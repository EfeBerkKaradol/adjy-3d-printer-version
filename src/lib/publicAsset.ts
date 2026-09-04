import { existsSync } from "node:fs";
import path from "node:path";

// ==========================================
// YEREL GÖRSEL DOĞRULAMASI (yalnızca sunucu)
// Veritabanındaki bazı kayıtlar public/ altında
// karşılığı olmayan yollara işaret ediyor
// (ör. /assets/categories/*.svg). Bunları tarayıcıya
// göndermek 404 üretir ve kırık görsel riski doğurur;
// sunucuda eleyip null döndürüyoruz.
// ==========================================

const cache = new Map<string, boolean>();

/**
 * Yerel bir public/ yolu gerçekten var mı?
 * Uzak URL'ler (http/https) her zaman geçerli sayılır.
 */
export function resolvePublicImage(url: string | null): string | null {
  if (!url) return null;
  if (/^https?:\/\//i.test(url)) return url;
  if (!url.startsWith("/")) return null;

  const cached = cache.get(url);
  if (cached !== undefined) return cached ? url : null;

  // Sorgu parçalarını at, dizin dışına çıkmayı engelle
  const clean = url.split("?")[0].split("#")[0];
  const filePath = path.join(process.cwd(), "public", clean);
  const publicRoot = path.join(process.cwd(), "public");

  const exists =
    filePath.startsWith(publicRoot + path.sep) && existsSync(filePath);

  cache.set(url, exists);
  return exists ? url : null;
}
