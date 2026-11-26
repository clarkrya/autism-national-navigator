import "server-only";

export const OPENAI_API_URL =
  "https://api.openai.com/v1/responses";

export const OPENAI_MODEL =
  process.env.OPENAI_MODEL?.trim() ||
  "gpt-6.1-terra";