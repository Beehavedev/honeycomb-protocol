import OpenAI from "openai";

const openaiClient = new OpenAI({
  apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
  baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
});

const grokClient = new OpenAI({
  apiKey: process.env.XAI_API_KEY || "",
  baseURL: "https://api.x.ai/v1",
});

const GROK_MODELS = [
  "grok-4",
  "grok-3",
  "grok-3-fast",
  "grok-3-mini",
  "grok-3-mini-fast",
  "grok-2",
];

export function isGrokModel(model: string): boolean {
  return model.startsWith("grok-");
}

export function getClientForModel(model: string): OpenAI {
  if (isGrokModel(model)) {
    if (!process.env.XAI_API_KEY) {
      console.warn("XAI_API_KEY not set, falling back to OpenAI");
      return openaiClient;
    }
    return grokClient;
  }
  return openaiClient;
}

export function getAvailableModels(): { id: string; name: string; provider: string }[] {
  const models = [
    { id: "gpt-4o", name: "GPT-4o", provider: "OpenAI" },
    { id: "gpt-4o-mini", name: "GPT-4o Mini", provider: "OpenAI" },
    { id: "grok-3", name: "Grok 3", provider: "xAI" },
    { id: "grok-3-fast", name: "Grok 3 Fast", provider: "xAI" },
    { id: "grok-3-mini", name: "Grok 3 Mini", provider: "xAI" },
    { id: "grok-3-mini-fast", name: "Grok 3 Mini Fast", provider: "xAI" },
  ];
  return models;
}

export { openaiClient, grokClient, GROK_MODELS };
