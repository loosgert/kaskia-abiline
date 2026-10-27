import { handleAdmin } from "@/lib/api";
import { toCsv } from "@/lib/csv";
import { db } from "@/lib/db";
import { adminTexts } from "@/lib/texts";

export const dynamic = "force-dynamic";

export const GET = handleAdmin(async () => {
  const inquiries = await db.companyInquiry.findMany({ orderBy: { createdAt: "desc" } });
  const c = adminTexts.inquiryCols;
  const rows = [
    [c.created, c.company, c.contact, c.email, c.quantity, c.size, c.deadline, c.purpose, c.logo],
    ...inquiries.map((i) => [
      i.createdAt.toISOString(),
      i.company,
      i.contactName,
      i.email,
      i.quantity,
      i.size,
      i.deadline,
      i.purpose,
      i.logoRequested ? adminTexts.yes : adminTexts.no,
    ]),
  ];
  // BOM so Excel opens the Estonian letters correctly.
  return new Response("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="kaskia-firmade-paringud.csv"',
    },
  });
});
