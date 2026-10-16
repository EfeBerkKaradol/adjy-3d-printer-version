-- CreateTable
CREATE TABLE "agent_snapshots" (
    "id" TEXT NOT NULL,
    "html" TEXT NOT NULL,
    "stateGz" BYTEA NOT NULL,
    "stateBytes" INTEGER NOT NULL,
    "generatedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "agent_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "agent_actions" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "userId" TEXT,
    "userEmail" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" TIMESTAMP(3),
    "result" TEXT,

    CONSTRAINT "agent_actions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "agent_actions_appliedAt_createdAt_idx" ON "agent_actions"("appliedAt", "createdAt");

