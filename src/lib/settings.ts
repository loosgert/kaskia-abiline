export const MODELS = [
  { value: "claude-haiku-5-5", label: "Claude Haiku 5.5" },
  { value: "claude-sonnet-5-5", label: "Claude Sonnet 5.5" },
] as const;

export const EFFORTS = [
  { value: "low", label: "madal" },
  { value: "medium", label: "keskmine" },
  { value: "high", label: "kõrge" },
] as const;

export const ANSWER_LENGTHS = [
  { value: "lühike", label: "lühike" },
  { value: "tavaline", label: "tavaline" },
] as const;

export type ModelId = (typeof MODELS)[number]["value"];
export type Effort = (typeof EFFORTS)[number]["value"];
export type AnswerLength = (typeof ANSWER_LENGTHS)[number]["value"];

export const DEFAULT_SETTINGS = { model: "claude-haiku-5-5", effort: "low", answerLength: "lühike" } as const;

export const MAX_MESSAGE_LENGTH = 1000;

export function isModel(value: unknown): value is ModelId {
  return MODELS.some((m) => m.value === value);
}

export function isEffort(value: unknown): value is Effort {
  return EFFORTS.some((e) => e.value === value);
}

export function isAnswerLength(value: unknown): value is AnswerLength {
  return ANSWER_LENGTHS.some((a) => a.value === value);
}
