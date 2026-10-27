import { db } from "@/lib/db";
import { deleteExpiredData } from "@/lib/retention";

// Wake-up call from public/embed.js on every kaskia.ee page view. It answers at once and, at most once an hour,
// clears expired data in the background, so rate-limit rows and old chats go away even when nobody chats.
export const dynamic = "force-dynamic";

const CLEANUP_EVERY_MS = 60 * 60_000;
let lastCleanup = 0;

export function GET() {
  if (Date.now() - lastCleanup > CLEANUP_EVERY_MS) {
    lastCleanup = Date.now();
    void Promise.all([
      db.rateLimitEvent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 24 * 60 * 60_000) } } }),
      deleteExpiredData(db),
    ]).catch((error) => console.error("Cleanup failed", error));
  }
  return new Response(null, { status: 204, headers: { "Cache-Control": "no-store" } });
}
