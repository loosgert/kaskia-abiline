import { NextResponse } from "next/server";
import { loadSettings } from "@/lib/assistant";
import { handleAdmin, jsonError } from "@/lib/api";
import { db } from "@/lib/db";
import { isAnswerLength, isEffort, isModel } from "@/lib/settings";

export const dynamic = "force-dynamic";

export const GET = handleAdmin(async () => NextResponse.json(await loadSettings()));

export const PUT = handleAdmin(async (request: Request) => {
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const current = await loadSettings();
  const model = body?.model ?? current.model;
  const effort = body?.effort ?? current.effort;
  const answerLength = body?.answerLength ?? current.answerLength;
  if (!isModel(model) || !isEffort(effort) || !isAnswerLength(answerLength)) {
    return jsonError("Invalid settings", 400);
  }
  const next = { model, effort, answerLength };
  await db.assistantSettings.upsert({ where: { id: 1 }, update: next, create: { id: 1, ...next } });
  return NextResponse.json(next);
});
