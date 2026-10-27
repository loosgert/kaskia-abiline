import { NextResponse } from "next/server";
import { handleAdmin } from "@/lib/api";
import { db } from "@/lib/db";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

export const DELETE = handleAdmin(async (_request: Request, { params }: Context) => {
  const { id } = await params;
  await db.companyInquiry.deleteMany({ where: { id } });
  return NextResponse.json({ ok: true });
});
