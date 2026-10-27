import { NextResponse } from "next/server";
import { handleAdmin, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

export const GET = handleAdmin(async () => {
  const prompts = await db.systemPrompt.findMany({ orderBy: { createdAt: "asc" } });
  return NextResponse.json(prompts.map((p) => ({ ...p, createdAt: p.createdAt.toISOString() })));
});

export const POST = handleAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as { name?: unknown; content?: unknown } | null;
  const name = typeof body?.name === "string" ? body.name.trim().slice(0, 100) : "";
  const content = typeof body?.content === "string" ? body.content.trim() : "";
  if (!name || !content) return jsonError("Name and content are required", 400);
  const prompt = await db.systemPrompt.create({ data: { name, content, isActive: false } });
  return NextResponse.json({ ...prompt, createdAt: prompt.createdAt.toISOString() });
});
