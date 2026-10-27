import { NextResponse } from "next/server";
import { clientIp, handle, jsonError } from "@/lib/api";
import { ADMIN_COOKIE, checkPassword, createAdminToken, hashIp } from "@/lib/auth";
import { db } from "@/lib/db";
import { adminTexts } from "@/lib/texts";

export const dynamic = "force-dynamic";

const MAX_ATTEMPTS = 10;
const WINDOW_MINUTES = 15;

export const POST = handle(async (request: Request) => {
  const ipHash = hashIp(clientIp(request));
  const since = new Date(Date.now() - WINDOW_MINUTES * 60_000);
  const attempts = await db.rateLimitEvent.count({ where: { sessionId: "login", ipHash, createdAt: { gt: since } } });
  if (attempts >= MAX_ATTEMPTS) return jsonError(adminTexts.wrongPassword, 429);

  const body = (await request.json().catch(() => null)) as { password?: unknown } | null;
  const password = typeof body?.password === "string" ? body.password : "";
  if (!checkPassword(password)) {
    await db.rateLimitEvent.create({ data: { sessionId: "login", ipHash } });
    await new Promise((resolve) => setTimeout(resolve, 500));
    return jsonError(adminTexts.wrongPassword, 401);
  }

  const token = createAdminToken();
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE, token.value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: token.maxAge,
  });
  return response;
});
