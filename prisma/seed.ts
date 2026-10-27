// Runs on every start (see package.json). It only fills empty tables, so the owners' edits in /haldus are never overwritten.
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { PrismaClient } from "@prisma/client";
import { parseFactsCsv } from "../src/lib/csv";
import { DEFAULT_PROMPT, DEFAULT_PROMPT_NAME, PREVIOUS_DEFAULT_PROMPT_HASHES } from "../src/lib/default-prompt";
import { DEFAULT_SETTINGS } from "../src/lib/settings";

const db = new PrismaClient();

async function main() {
  if ((await db.fact.count()) === 0) {
    const facts = parseFactsCsv(readFileSync("data/kaskia-faktid.csv", "utf8"));
    if (!facts) throw new Error("data/kaskia-faktid.csv is not a valid fact file");
    await db.fact.createMany({ data: facts.map((f, position) => ({ ...f, position })) });
    console.log(`Seeded ${facts.length} facts`);
  }

  if ((await db.systemPrompt.count()) === 0) {
    await db.systemPrompt.create({ data: { name: DEFAULT_PROMPT_NAME, content: DEFAULT_PROMPT, isActive: true } });
    console.log("Seeded the default system prompt");
  } else {
    for (const prompt of await db.systemPrompt.findMany()) {
      const hash = createHash("sha256").update(prompt.content).digest("hex");
      if (PREVIOUS_DEFAULT_PROMPT_HASHES.includes(hash)) {
        await db.systemPrompt.update({ where: { id: prompt.id }, data: { content: DEFAULT_PROMPT } });
        console.log(`Updated the unedited default prompt "${prompt.name}"`);
      }
    }
  }

  await db.assistantSettings.upsert({ where: { id: 1 }, update: {}, create: { id: 1, ...DEFAULT_SETTINGS } });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
