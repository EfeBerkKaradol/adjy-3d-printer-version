import { createHash, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

/**
 * ADJY Ürün Ajanı paneli — ortak yardımcılar.
 *
 * Akış:
 *  - Yerel ajan (ADJY-Agent) panelin HTML'ini ve durumunu (gzip JSON) AGENT_SYNC_TOKEN ile
 *    /api/agent/sync'e gönderir; bekleyen admin işlemlerini /api/agent/actions'tan çekip uygular.
 *  - Admin sayfası (/admin/ajan) paneli sandbox'lı bir iframe'de (allow-same-origin YOK) çalıştırır;
 *    panel kodu admin oturumuna/çerezlerine erişemez, veri postMessage ile bu sitenin kodundan gelir.
 */

export const SNAPSHOT_ID = "current";
export const MAX_SYNC_BYTES = 4 * 1024 * 1024; // Vercel istek gövdesi sınırının altında

function sha256(value: string) {
  return createHash("sha256").update(value).digest();
}

/** Ajan isteği: Authorization: Bearer <AGENT_SYNC_TOKEN>. Anahtar tanımlı değilse uç kapalıdır. */
export function requireAgentToken(req: Request): NextResponse | null {
  const expected = process.env.AGENT_SYNC_TOKEN;
  if (!expected || expected.length < 32) {
    return NextResponse.json({ error: "Ajan senkronu yapılandırılmamış" }, { status: 503 });
  }
  const header = req.headers.get("authorization") || "";
  const given = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!given || !timingSafeEqual(sha256(given), sha256(expected))) {
    return NextResponse.json({ error: "Yetkisiz" }, { status: 401 });
  }
  return null;
}

/** Admin kontrolü — layout ile aynı: rol JWT'den değil veritabanından okunur. */
export async function requireAdminDb(): Promise<{ userId: string; email: string | null } | NextResponse> {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Giriş yapmanız gerekiyor" }, { status: 401 });
  }
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { role: true, email: true },
  });
  if (user?.role !== "ADMIN") {
    return NextResponse.json({ error: "Bu işlem için yetkiniz yok" }, { status: 403 });
  }
  return { userId: session.user.id, email: user.email ?? null };
}

const productId = z.string().regex(/^ADJY-\d{4}$/);
const shortText = z.string().max(2000);

/** Panelden gelebilecek işlemler (ajan tarafında aynı biçimle uygulanır). */
export const actionSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("decision"),
    payload: z.object({
      product_id: productId,
      favorite: z.boolean(),
      decision: z.enum(["approve", "reject", "more_data"]).nullable(),
      reason: shortText.nullable(),
      at: z.string().max(40).nullable().optional(),
    }),
  }),
  z.object({
    kind: z.literal("content"),
    payload: z.object({
      id: z.string().regex(/^C\d{4}$/),
      action: z.enum(["approve", "revise", "filmed", "published", "skip", "reset"]),
      note: shortText.nullable().optional(),
      url: z.string().url().max(500).nullable().optional(),
    }),
  }),
  z.object({
    kind: z.literal("maket"),
    payload: z.object({
      no: z.number().int().min(1).max(1000),
      action: z.enum(["approve", "skip", "reset"]),
    }),
  }),
  z.object({
    kind: z.literal("request"),
    payload: z.object({
      type: z.enum(["research", "verify", "analysis", "other"]).catch("other"),
      text: z.string().min(1).max(2000),
    }),
  }),
  z.object({
    kind: z.literal("settings"),
    payload: z.record(z.string(), z.unknown()).refine((v) => JSON.stringify(v).length < 5000, "Ayar çok büyük"),
  }),
]);

export type AgentActionInput = z.infer<typeof actionSchema>;
