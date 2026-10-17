-- Sayfa görüntülemeleri (çerezsiz, IP saklanmaz)
CREATE TABLE "page_views" (
    "id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "referrer" TEXT,
    "sessionId" TEXT NOT NULL,
    "userId" TEXT,
    "device" TEXT,
    "productId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "page_views_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "page_views_createdAt_idx" ON "page_views"("createdAt");
CREATE INDEX "page_views_path_createdAt_idx" ON "page_views"("path", "createdAt");
CREATE INDEX "page_views_userId_createdAt_idx" ON "page_views"("userId", "createdAt");
CREATE INDEX "page_views_sessionId_idx" ON "page_views"("sessionId");

-- Müşteri notları
CREATE TABLE "customer_notes" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "authorEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_notes_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_notes_userId_createdAt_idx" ON "customer_notes"("userId", "createdAt");

ALTER TABLE "customer_notes" ADD CONSTRAINT "customer_notes_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Müşteri etiketleri
ALTER TABLE "users" ADD COLUMN "crmTags" TEXT[] DEFAULT ARRAY[]::TEXT[];
