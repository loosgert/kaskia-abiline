import { NextResponse } from "next/server";
import { handleAdmin, jsonError } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const GET = handleAdmin(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  const session = await db.chatSession.findUnique({
    where: { id },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session) return jsonError("Not found", 404);
  return NextResponse.json({
    id: session.id,
    title: session.title,
    source: session.source,
    model: session.model,
    createdAt: session.createdAt.toISOString(),
    messages: session.messages.map((m) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      waitlistSize: m.waitlistSize,
      createdAt: m.createdAt.toISOString(),
    })),
  });
});

export const DELETE = handleAdmin(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  await db.chatSession.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
});
