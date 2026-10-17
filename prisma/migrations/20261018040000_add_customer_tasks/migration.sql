-- Müşteri takip görevleri
CREATE TABLE "customer_tasks" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "dueAt" TIMESTAMP(3),
    "doneAt" TIMESTAMP(3),
    "createdBy" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customer_tasks_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_tasks_userId_doneAt_idx" ON "customer_tasks"("userId", "doneAt");
CREATE INDEX "customer_tasks_doneAt_dueAt_idx" ON "customer_tasks"("doneAt", "dueAt");

ALTER TABLE "customer_tasks" ADD CONSTRAINT "customer_tasks_userId_fkey"
  FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
