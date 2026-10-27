import { NextResponse } from "next/server";
import { handleAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

// Everything the owner view needs on load: stats, the chat list, unanswered questions and company inquiries.
export const GET = handleAdmin(async () => {
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60_000);
  const customer = { source: { not: "owner" } };
  const [chats, chats7, sizes, chatList, unanswered, inquiries] = await Promise.all([
    db.chatSession.count({ where: customer }),
    db.chatSession.count({ where: { ...customer, createdAt: { gt: weekAgo } } }),
    db.sizeSuggestion.groupBy({ by: ["size"], _count: { _all: true } }),
    db.chatSession.findMany({
      orderBy: { updatedAt: "desc" },
      take: 200,
      select: { id: true, title: true, source: true, model: true, updatedAt: true, _count: { select: { messages: true } } },
    }),
    db.unansweredQuestion.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
    db.companyInquiry.findMany({ orderBy: { createdAt: "desc" }, take: 200 }),
  ]);

  return NextResponse.json({
    stats: {
      chats,
      chats7,
      sizes: Object.fromEntries(sizes.map((s) => [s.size, s._count._all])),
      inquiries: inquiries.length,
    },
    chats: chatList.map((c) => ({
      id: c.id,
      title: c.title,
      source: c.source,
      model: c.model,
      updatedAt: c.updatedAt.toISOString(),
      messages: c._count.messages,
    })),
    unanswered: unanswered.map((u) => ({ id: u.id, sessionId: u.sessionId, question: u.question, createdAt: u.createdAt.toISOString() })),
    inquiries: inquiries.map((i) => ({ ...i, createdAt: i.createdAt.toISOString() })),
  });
});
