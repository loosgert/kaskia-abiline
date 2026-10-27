import { NextResponse } from "next/server";
import { handleAdmin, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const PATCH = handleAdmin(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const text = (key: string) => (typeof body?.[key] === "string" ? (body[key] as string).trim() : "");
  const data = { topic: text("topic"), question: text("question"), answer: text("answer"), source: text("source") };
  if (!data.topic || !data.answer) return jsonError("Invalid fact", 400);
  await db.fact.updateMany({ where: { id }, data });
  return NextResponse.json({ ok: true });
});

export const DELETE = handleAdmin(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  await db.fact.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
});
