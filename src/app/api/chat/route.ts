import { NextResponse } from "next/server";
import { AssistantUnavailableError, askAssistant, loadSettings } from "@/lib/assistant";
import { clientIp, handle, jsonError } from "@/lib/api";
import { hashIp, isAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { MAX_MESSAGE_LENGTH } from "@/lib/settings";
import { errorTexts } from "@/lib/texts";

export const dynamic = "force-dynamic";

const SOURCES = ["site", "widget", "owner"] as const;
type Source = (typeof SOURCES)[number];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const HISTORY_LIMIT = 40;
const PER_CHAT = { limit: 20, minutes: 10 };
const PER_VISITOR = { limit: 60, minutes: 60 };

function minutesAgo(minutes: number) {
  return new Date(Date.now() - minutes * 60_000);
}

function toClient(m: { id: string; role: string; content: string; waitlistSize: string | null; createdAt: Date }) {
  return { id: m.id, role: m.role, content: m.content, waitlistSize: m.waitlistSize, createdAt: m.createdAt.toISOString() };
}

// GET /api/chat?sessionId=… returns the messages of a customer chat, so a reload continues it.
export const GET = handle(async (request: Request) => {
  const sessionId = new URL(request.url).searchParams.get("sessionId") ?? "";
  if (!UUID.test(sessionId)) return NextResponse.json({ messages: [] });
  const session = await db.chatSession.findUnique({
    where: { id: sessionId },
    include: { messages: { orderBy: { createdAt: "asc" } } },
  });
  if (!session || (session.source === "owner" && !(await isAdmin()))) return NextResponse.json({ messages: [] });
  return NextResponse.json({ messages: session.messages.map(toClient) });
});

// POST /api/chat { sessionId?, message, source } sends a message and returns the assistant's answer.
export const POST = handle(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as { sessionId?: unknown; message?: unknown; source?: unknown } | null;
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  const source: Source = SOURCES.includes(body?.source as Source) ? (body?.source as Source) : "site";
  if (!message) return jsonError(errorTexts.connection, 400);
  if (message.length > MAX_MESSAGE_LENGTH) return jsonError(errorTexts.tooLong, 400);

  const owner = await isAdmin();
  if (source === "owner" && !owner) return jsonError("Unauthorized", 401);

  const settings = await loadSettings();

  // Reuse the chat when the id is known and belongs to the same kind of chat; otherwise start a new one.
  const requested = typeof body?.sessionId === "string" && UUID.test(body.sessionId) ? body.sessionId : null;
  const existing = requested ? await db.chatSession.findUnique({ where: { id: requested } }) : null;
  const session =
    existing && (existing.source === "owner") === (source === "owner")
      ? existing
      : await db.chatSession.create({ data: { source, model: settings.model, title: message.slice(0, 60) } });

  if (!owner) {
    const ipHash = hashIp(clientIp(request));
    const [perChat, perVisitor] = await Promise.all([
      db.rateLimitEvent.count({ where: { sessionId: session.id, createdAt: { gt: minutesAgo(PER_CHAT.minutes) } } }),
      db.rateLimitEvent.count({ where: { ipHash, createdAt: { gt: minutesAgo(PER_VISITOR.minutes) } } }),
    ]);
    if (perChat >= PER_CHAT.limit || perVisitor >= PER_VISITOR.limit) return jsonError(errorTexts.rateLimited, 429);
    await db.rateLimitEvent.create({ data: { sessionId: session.id, ipHash } });
    if (Math.random() < 0.05) await db.rateLimitEvent.deleteMany({ where: { createdAt: { lt: minutesAgo(24 * 60) } } });
  }

  const userMessage = await db.message.create({ data: { sessionId: session.id, role: "user", content: message } });
  const recent = await db.message.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "desc" },
    take: HISTORY_LIMIT,
  });
  const history = recent
    .reverse()
    .map((m) => ({ role: m.role === "assistant" ? ("assistant" as const) : ("user" as const), content: m.content }));
  // The API needs the history to start with a user turn.
  while (history.length > 0 && history[0].role !== "user") history.shift();

  let result;
  try {
    result = await askAssistant(session.id, history, settings);
  } catch (error) {
    if (error instanceof AssistantUnavailableError) {
      return NextResponse.json({ error: errorTexts.assistantDown, sessionId: session.id }, { status: 503 });
    }
    throw error;
  }

  const reply = await db.message.create({
    data: { sessionId: session.id, role: "assistant", content: result.text, waitlistSize: result.waitlistSize },
  });
  await db.chatSession.update({
    where: { id: session.id },
    data: { model: settings.model, title: session.title || message.slice(0, 60) },
  });

  return NextResponse.json({ sessionId: session.id, user: toClient(userMessage), reply: toClient(reply) });
});
