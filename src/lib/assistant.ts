import Anthropic from "@anthropic-ai/sdk";
import { db } from "@/lib/db";
import { DEFAULT_PROMPT } from "@/lib/default-prompt";
import { DEFAULT_SETTINGS, isAnswerLength, isEffort, isModel, type AnswerLength, type Effort, type ModelId } from "@/lib/settings";
import { errorTexts } from "@/lib/texts";

type BetaMessageParam = Anthropic.Beta.BetaMessageParam;
type BetaTool = Anthropic.Beta.BetaTool;
type BetaToolResultBlockParam = Anthropic.Beta.BetaToolResultBlockParam;

export class AssistantUnavailableError extends Error {}

const SIZES = ["0,33", "0,5"] as const;
const INQUIRY_SIZES = ["0,33", "0,5", "mõlemad", "teadmata"] as const;
const MAX_TOOL_ROUNDS = 4;

const TOOLS: BetaTool[] = [
  {
    name: "suggest_waitlist",
    description:
      "Show the customer a button that opens the kaskia.ee waitlist with this cooler size selected. Call it whenever you recommend a size.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { size: { type: "string", enum: [...SIZES], description: "Recommended cooler size in litres." } },
      required: ["size"],
      additionalProperties: false,
    },
  },
  {
    name: "save_company_inquiry",
    description:
      "Save a company's bulk inquiry for the regular Kaskia purgijahuti once you have all fields. Use an empty string for a field the company did not want to give.",
    strict: true,
    input_schema: {
      type: "object",
      properties: {
        company: { type: "string", description: "Company name." },
        contactName: { type: "string", description: "Contact person." },
        email: { type: "string", description: "Contact e-mail address." },
        quantity: { type: "string", description: "Number of coolers, as the customer said it." },
        size: { type: "string", enum: [...INQUIRY_SIZES], description: "0,33, 0,5, both (mõlemad) or not sure (teadmata)." },
        deadline: { type: "string", description: "When they need the coolers." },
        purpose: { type: "string", description: "What the coolers are for, e.g. gifts or an event." },
        logoRequested: { type: "boolean", description: "True if the company asked for its own logo." },
      },
      required: ["company", "contactName", "email", "quantity", "size", "deadline", "purpose", "logoRequested"],
      additionalProperties: false,
    },
  },
  {
    name: "log_unanswered",
    description: "Record a customer question that the facts do not answer, so the owners can add the answer later.",
    strict: true,
    input_schema: {
      type: "object",
      properties: { question: { type: "string", description: "The customer's question, in their words." } },
      required: ["question"],
      additionalProperties: false,
    },
  },
];

export type AssistantSettings = { model: ModelId; effort: Effort; answerLength: AnswerLength };

export async function loadSettings(): Promise<AssistantSettings> {
  const row = await db.assistantSettings.findUnique({ where: { id: 1 } });
  return {
    model: isModel(row?.model) ? row.model : DEFAULT_SETTINGS.model,
    effort: isEffort(row?.effort) ? row.effort : DEFAULT_SETTINGS.effort,
    answerLength: isAnswerLength(row?.answerLength) ? row.answerLength : DEFAULT_SETTINGS.answerLength,
  };
}

async function buildSystemPrompt(answerLength: AnswerLength): Promise<string> {
  const [prompt, facts] = await Promise.all([
    db.systemPrompt.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } }),
    db.fact.findMany({ orderBy: [{ position: "asc" }, { topic: "asc" }] }),
  ]);
  const factLines = facts
    .map((f) => `- [${f.topic}] ${f.question ? `${f.question} ` : ""}→ ${f.answer}${f.source ? ` (allikas: ${f.source})` : ""}`)
    .join("\n");
  const lengthLine =
    answerLength === "lühike"
      ? "Answer length: keep answers to one to three short sentences."
      : "Answer length: answer in up to two short paragraphs when the question needs it.";
  return `${prompt?.content ?? DEFAULT_PROMPT}\n\n${lengthLine}\n\n<facts>\n${factLines}\n</facts>`;
}

export type AssistantResult = { text: string; waitlistSize: string | null; inquirySaved: boolean };

type ToolContext = { sessionId: string; waitlistSize: string | null; inquirySaved: boolean };

async function runTool(block: Anthropic.Beta.BetaToolUseBlock, ctx: ToolContext): Promise<BetaToolResultBlockParam> {
  const input = (block.input ?? {}) as Record<string, unknown>;
  const fail = (content: string): BetaToolResultBlockParam => ({ type: "tool_result", tool_use_id: block.id, is_error: true, content });
  const ok = (content: string): BetaToolResultBlockParam => ({ type: "tool_result", tool_use_id: block.id, content });

  if (block.name === "suggest_waitlist") {
    const size = input.size;
    if (typeof size !== "string" || !SIZES.includes(size as (typeof SIZES)[number])) return fail("size must be 0,33 or 0,5");
    await db.sizeSuggestion.create({ data: { sessionId: ctx.sessionId, size } });
    ctx.waitlistSize = size;
    return ok("The waitlist button is now shown to the customer.");
  }

  if (block.name === "save_company_inquiry") {
    const str = (key: string) => (typeof input[key] === "string" ? (input[key] as string).trim().slice(0, 500) : "");
    const email = str("email");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return fail("The e-mail address is not valid. Ask the customer for it again.");
    const size = INQUIRY_SIZES.includes(str("size") as (typeof INQUIRY_SIZES)[number]) ? str("size") : "teadmata";
    await db.companyInquiry.create({
      data: {
        sessionId: ctx.sessionId,
        company: str("company"),
        contactName: str("contactName"),
        email,
        quantity: str("quantity"),
        size,
        deadline: str("deadline"),
        purpose: str("purpose"),
        logoRequested: input.logoRequested === true,
      },
    });
    ctx.inquirySaved = true;
    return ok("The inquiry is saved.");
  }

  if (block.name === "log_unanswered") {
    const question = typeof input.question === "string" ? input.question.trim().slice(0, 1000) : "";
    if (question) await db.unansweredQuestion.create({ data: { sessionId: ctx.sessionId, question } });
    return ok("Logged.");
  }

  return fail(`Unknown tool ${block.name}`);
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!process.env.ANTHROPIC_API_KEY) throw new AssistantUnavailableError("ANTHROPIC_API_KEY is not set");
  client ??= new Anthropic();
  return client;
}

// history: earlier turns of this chat as plain text, oldest first, ending with the new user message.
// Only text is stored between turns, so no thinking block is ever replayed into an edited history.
export async function askAssistant(
  sessionId: string,
  history: { role: "user" | "assistant"; content: string }[],
  settings: AssistantSettings,
): Promise<AssistantResult> {
  const anthropic = getClient();
  const system = await buildSystemPrompt(settings.answerLength);
  const messages: BetaMessageParam[] = history.map((m) => ({ role: m.role, content: m.content }));
  const ctx: ToolContext = { sessionId, waitlistSize: null, inquirySaved: false };
  // Server-side refusal fallback exists for Sonnet only; Haiku has none.
  const fallback =
    settings.model === "claude-sonnet-5-5"
      ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const }
      : {};

  let text = "";
  for (let round = 0; round < MAX_TOOL_ROUNDS; round++) {
    let response: Anthropic.Beta.BetaMessage;
    try {
      response = await anthropic.beta.messages.create({
        model: settings.model,
        max_tokens: 4096,
        system: [{ type: "text", text: system, cache_control: { type: "ephemeral" } }],
        messages,
        tools: TOOLS,
        output_config: { effort: settings.effort },
        ...fallback,
      });
    } catch (error) {
      if (error instanceof Anthropic.APIError) {
        console.error(`Claude API error ${error.status}: ${error.message}`);
        throw new AssistantUnavailableError(error.message);
      }
      throw error;
    }

    if (response.stop_reason === "refusal") return { text: errorTexts.refusal, waitlistSize: ctx.waitlistSize, inquirySaved: ctx.inquirySaved };

    const roundText = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    if (roundText) text = text ? `${text}\n\n${roundText}` : roundText;

    const toolUses = response.content.filter((b): b is Anthropic.Beta.BetaToolUseBlock => b.type === "tool_use");
    if (response.stop_reason !== "tool_use" || toolUses.length === 0) break;

    messages.push({ role: "assistant", content: response.content });
    const results: BetaToolResultBlockParam[] = [];
    for (const block of toolUses) results.push(await runTool(block, ctx));
    messages.push({ role: "user", content: results });
  }

  return { text: text || errorTexts.refusal, waitlistSize: ctx.waitlistSize, inquirySaved: ctx.inquirySaved };
}
