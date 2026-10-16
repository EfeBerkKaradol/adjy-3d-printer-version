import { NextResponse } from "next/server";
import { gunzipSync, gzipSync } from "zlib";
import { prisma } from "@/lib/db";
import { MAX_SYNC_BYTES, SNAPSHOT_ID, requireAgentToken } from "@/lib/agentPanel";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Ajan → site: panelin son hali. Gövde = gzip(JSON {html, state}).
 * html: panel arayüzü (sandbox'lı iframe'de çalışır), state: panel verisi.
 */
export async function POST(req: Request) {
  const denied = requireAgentToken(req);
  if (denied) return denied;

  const raw = Buffer.from(await req.arrayBuffer());
  if (raw.length === 0 || raw.length > MAX_SYNC_BYTES) {
    return NextResponse.json({ error: "Gövde boş ya da çok büyük" }, { status: 413 });
  }

  let body: { html?: unknown; state?: unknown };
  try {
    body = JSON.parse(gunzipSync(raw, { maxOutputLength: 64 * 1024 * 1024 }).toString("utf8"));
  } catch {
    return NextResponse.json({ error: "Gövde gzip JSON değil" }, { status: 400 });
  }
  if (typeof body.html !== "string" || !body.html.includes("<script") || typeof body.state !== "object" || !body.state) {
    return NextResponse.json({ error: "html ve state gerekli" }, { status: 400 });
  }

  const stateJson = JSON.stringify(body.state);
  const stateGz = gzipSync(stateJson);
  const generatedRaw = (body.state as { generated_at?: unknown }).generated_at;
  const generatedAt = typeof generatedRaw === "string" && !isNaN(Date.parse(generatedRaw)) ? new Date(generatedRaw) : new Date();

  await prisma.agentSnapshot.upsert({
    where: { id: SNAPSHOT_ID },
    create: { id: SNAPSHOT_ID, html: body.html, stateGz, stateBytes: stateJson.length, generatedAt },
    update: { html: body.html, stateGz, stateBytes: stateJson.length, generatedAt },
  });
  const pending = await prisma.agentAction.count({ where: { appliedAt: null } });
  return NextResponse.json({ ok: true, stateBytes: stateJson.length, pending });
}
