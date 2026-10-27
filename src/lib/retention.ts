import type { PrismaClient } from "@prisma/client";

// How long chats and company inquiries are kept. The kaskia.ee privacy page states the same period.
export const RETENTION_MONTHS = 12;

export function retentionCutoff(now = new Date()): Date {
  const cutoff = new Date(now);
  cutoff.setMonth(cutoff.getMonth() - RETENTION_MONTHS);
  return cutoff;
}

// Deletes chats (with their messages, size suggestions and unanswered questions) and inquiries older than the period.
export async function deleteExpiredData(db: PrismaClient) {
  const cutoff = retentionCutoff();
  const [chats, inquiries] = await Promise.all([
    db.chatSession.deleteMany({ where: { updatedAt: { lt: cutoff } } }),
    db.companyInquiry.deleteMany({ where: { createdAt: { lt: cutoff } } }),
  ]);
  return { chats: chats.count, inquiries: inquiries.count };
}
