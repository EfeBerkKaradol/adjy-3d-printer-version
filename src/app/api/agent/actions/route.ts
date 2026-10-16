import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { requireAgentToken } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Ajan: uygulanmamış admin işlemleri (eskiden yeniye). */
export async function GET(req: Request) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const actions = await prisma.agentAction.findMany({
    where: { appliedAt: null },
    orderBy: { createdAt: "asc" },
    take: 500,
    select: { id: true, kind: true, payload: true, userEmail: true, createdAt: true },
  });
  return NextResponse.json({ actions });
}

const ackSchema = z.object({
  applied: z.array(z.object({ id: z.string().min(1).max(40), result: z.string().max(500).optional() })).max(500),
});

/** Ajan: uygulanan işlemleri işaretler. */
export async function POST(req: Request) {
  const denied = requireAgentToken(req);
  if (denied) return denied;
  const parsed = ackSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Geçersiz gövde" }, { status: 400 });
  const now = new Date();
  for (const a of parsed.data.applied) {
    await prisma.agentAction.updateMany({
      where: { id: a.id, appliedAt: null },
      data: { appliedAt: now, result: a.result ?? "uygulandı" },
    });
  }
  return NextResponse.json({ ok: true, count: parsed.data.applied.length });
}
