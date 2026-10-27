import { NextResponse } from "next/server";
import { handleAdmin, jsonError } from "@/lib/api";
import type { FactRow } from "@/lib/csv";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handleAdmin(async () => {
  const facts = await db.fact.findMany({ orderBy: [{ position: "asc" }, { topic: "asc" }] });
  return NextResponse.json(facts.map((f) => ({ ...f, updatedAt: f.updatedAt.toISOString() })));
});

function cleanFact(value: unknown): FactRow | null {
  if (!value || typeof value !== "object") return null;
  const f = value as Record<string, unknown>;
  const text = (key: string) => (typeof f[key] === "string" ? (f[key] as string).trim() : "");
  const row = { topic: text("topic"), question: text("question"), answer: text("answer"), source: text("source") };
  return row.topic && row.answer ? row : null;
}

// PUT { facts: [...] } replaces all facts (used by the CSV upload after the owner confirms the preview).
export const PUT = handleAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as { facts?: unknown } | null;
  if (!Array.isArray(body?.facts) || body.facts.length === 0 || body.facts.length > 500) return jsonError("Invalid facts", 400);
  const facts = body.facts.map(cleanFact);
  if (facts.some((f) => f === null)) return jsonError("Invalid facts", 400);
  await db.$transaction([
    db.fact.deleteMany(),
    db.fact.createMany({ data: (facts as FactRow[]).map((f, position) => ({ ...f, position })) }),
  ]);
  return NextResponse.json({ ok: true, count: facts.length });
});

// POST { topic, question, answer, source } adds one fact at the end.
export const POST = handleAdmin(async (request: Request) => {
  const fact = cleanFact(await request.json().catch(() => null));
  if (!fact) return jsonError("Invalid fact", 400);
  const last = await db.fact.findFirst({ orderBy: { position: "desc" } });
  const created = await db.fact.create({ data: { ...fact, position: (last?.position ?? -1) + 1 } });
  return NextResponse.json({ ...created, updatedAt: created.updatedAt.toISOString() });
});
