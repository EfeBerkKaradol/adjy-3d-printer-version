// ==========================================
// CANLI DERLEMEDE VERİTABANI GÖÇLERİ
//
// Vercel derlemesi yalnızca "prisma generate" çalıştırıyordu;
// yeni migration'lar canlı veritabanına elle uygulanıyordu.
// Uygulanmayınca Prisma istemcisi var olmayan bir sütunu
// sorguluyor ve ürün satırı okuyan her sayfa düşüyor (ör.
// printFiles eklendiğinde admin sipariş ekranı "Sipariş
// bulunamadı" gösterdi).
//
// Artık canlı derlemede bekleyen migration'lar uygulanır.
// Önizleme derlemeleri (dal gönderimleri) canlı veritabanına
// dokunmaz. Neon'da göç havuzlu bağlantıyla değil doğrudan
// bağlantıyla yapılmalı: DIRECT_DATABASE_URL varsa o kullanılır.
//
// Göç başarısız olursa derleme durur: yeni kod eksik şemayla
// yayına çıkmasın.
// ==========================================

import { execSync } from "node:child_process";

if (process.env.VERCEL_ENV !== "production") {
  console.log(`[migrate] ${process.env.VERCEL_ENV ?? "yerel"} derleme: göç atlandı`);
  process.exit(0);
}

const url = process.env.DIRECT_DATABASE_URL || process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL yok, göç uygulanamadı");
  process.exit(1);
}

try {
  execSync("npx prisma migrate deploy", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
} catch {
  console.error(
    "[migrate] prisma migrate deploy başarısız. Derleme durduruldu; " +
      "hata yukarıda. Veritabanı daha önce db push ile kurulduysa (P3005) " +
      "migration geçmişinin bir kez işaretlenmesi gerekir: prisma migrate resolve --applied <ad>."
  );
  process.exit(1);
}
