import { NextResponse } from "next/server";
import { handleAdmin, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

// PATCH { name?, content?, isActive: true? } edits a prompt or makes it the one in use.
export const PATCH = handleAdmin(async (request: Request, { params }: Context) => {
  const { id } = await params;
  const body = (await request.json().catch(() => null)) as { name?: unknown; content?: unknown; isActive?: unknown } | null;
  const prompt = await db.systemPrompt.findUnique({ where: { id } });
  if (!prompt) return jsonError("Not found", 404);

  const data: { name?: string; content?: string } = {};
  if (typeof body?.name === "string" && body.name.trim()) data.name = body.name.trim().slice(0, 100);
  if (typeof body?.content === "string" && body.content.trim()) data.content = body.content.trim();

  if (body?.isActive === true) {
    await db.$transaction([
      db.systemPrompt.updateMany({ data: { isActive: false } }),
      db.systemPrompt.update({ where: { id }, data: { ...data, isActive: true } }),
    ]);
  } else if (Object.keys(data).length > 0) {
    await db.systemPrompt.update({ where: { id }, data });
  }
  return NextResponse.json({ ok: true });
});

// The prompt in use cannot be deleted, so there is always one active prompt.
export const DELETE = handleAdmin(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  const prompt = await db.systemPrompt.findUnique({ where: { id } });
  if (!prompt) return NextResponse.json({ ok: true });
  if (prompt.isActive) return jsonError("Active prompt", 409);
  await db.systemPrompt.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
