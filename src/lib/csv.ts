// Minimal RFC 4180 CSV: quoted fields, "" escapes, commas and newlines inside quotes.

export function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let inQuotes = false;
  const input = text.replace(/^﻿/, "");

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    if (inQuotes) {
      if (ch === '"') {
        if (input[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || ch === "\r") {
      if (ch === "\r" && input[i + 1] === "\n") i++;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else {
      field += ch;
    }
  }
  if (field !== "" || row.length > 0) {
    row.push(field);
    rows.push(row);
  }
  return rows.filter((r) => r.some((cell) => cell.trim() !== ""));
}

export function toCsv(rows: string[][]): string {
  return rows.map((r) => r.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(",")).join("\n") + "\n";
}

export type FactRow = { topic: string; question: string; answer: string; source: string };

const FACT_HEADER = ["teema", "küsimus", "vastus", "allikas"];

// Returns null when the header or a row does not match the fact file format.
export function parseFactsCsv(text: string): FactRow[] | null {
  const rows = parseCsv(text);
  if (rows.length < 2) return null;
  const header = rows[0].map((h) => h.trim().toLowerCase());
  if (FACT_HEADER.some((h, i) => header[i] !== h)) return null;
  const facts: FactRow[] = [];
  for (const r of rows.slice(1)) {
    const [topic = "", question = "", answer = "", source = ""] = r.map((c) => c.trim());
    if (!topic || !answer) return null;
    facts.push({ topic, question, answer, source });
  }
  return facts;
}
