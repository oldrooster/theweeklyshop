/**
 * Unified AI client — abstracts Claude (Anthropic) and Google Vertex AI (Gemini).
 * Settings are read from the ai_settings DB table; credentials come from env vars.
 *
 * Env vars:
 *   ANTHROPIC_API_KEY         — required for Claude
 *   GOOGLE_VERTEX_SA_KEY      — required for Vertex (service account JSON string)
 *   GOOGLE_CLOUD_PROJECT      — optional fallback for Vertex project ID
 */

import { getDb } from "./db";
import { aiSettings } from "./schema";
import { eq } from "drizzle-orm";
import { DEFAULT_CONFIGS, type AIPurpose, type AIProvider } from "./ai-constants";

export type { AIPurpose, AIProvider };

export interface AIConfig {
  purpose: AIPurpose;
  provider: AIProvider;
  model: string;
  maxTokens: number;
  vertexProject?: string | null;
  vertexLocation?: string | null;
}

/** Load config from DB, falling back to defaults. */
export function getAIConfig(purpose: AIPurpose): AIConfig {
  try {
    const db = getDb();
    const row = db.select().from(aiSettings).where(eq(aiSettings.purpose, purpose)).get();
    if (!row) return DEFAULT_CONFIGS[purpose];
    return {
      purpose: row.purpose,
      provider: row.provider,
      model: row.model,
      maxTokens: row.maxTokens,
      vertexProject: row.vertexProject,
      vertexLocation: row.vertexLocation ?? "us-central1",
    };
  } catch {
    return DEFAULT_CONFIGS[purpose];
  }
}

/** Check which providers have credentials configured. */
export function getCredentialStatus() {
  return {
    claude: !!process.env.ANTHROPIC_API_KEY,
    vertex: !!process.env.GOOGLE_VERTEX_SA_KEY,
  };
}

// ---------------------------------------------------------------------------
// Text generation (recipe generator)
// ---------------------------------------------------------------------------

export async function generateText(
  purpose: AIPurpose,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const config = getAIConfig(purpose);

  if (config.provider === "claude") {
    return generateTextClaude(config, systemPrompt, userMessage);
  } else {
    return generateTextVertex(config, systemPrompt, userMessage);
  }
}

async function generateTextClaude(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    system: systemPrompt,
    messages: [{ role: "user", content: userMessage }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  return textBlock.text;
}

async function generateTextVertex(
  config: AIConfig,
  systemPrompt: string,
  userMessage: string
): Promise<string> {
  const saKeyStr = process.env.GOOGLE_VERTEX_SA_KEY;
  if (!saKeyStr) throw new Error("GOOGLE_VERTEX_SA_KEY is not set");

  const project = config.vertexProject || process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("Vertex AI project is not configured");

  const saKey = JSON.parse(saKeyStr);

  const { VertexAI } = await import("@google-cloud/vertexai");
  const vertexAI = new VertexAI({
    project,
    location: config.vertexLocation ?? "us-central1",
    googleAuthOptions: { credentials: saKey },
  });

  const model = vertexAI.getGenerativeModel({
    model: config.model,
    generationConfig: { maxOutputTokens: config.maxTokens },
    systemInstruction: { role: "user", parts: [{ text: systemPrompt }] },
  });

  const result = await model.generateContent({
    contents: [{ role: "user", parts: [{ text: userMessage }] }],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text response from Vertex AI");
  return text;
}

// ---------------------------------------------------------------------------
// Multimodal (receipt import — image or PDF)
// ---------------------------------------------------------------------------

export async function generateWithFile(
  purpose: AIPurpose,
  prompt: string,
  fileBase64: string,
  mimeType: string
): Promise<string> {
  const config = getAIConfig(purpose);

  if (config.provider === "claude") {
    return generateWithFileClaude(config, prompt, fileBase64, mimeType);
  } else {
    return generateWithFileVertex(config, prompt, fileBase64, mimeType);
  }
}

async function generateWithFileClaude(
  config: AIConfig,
  prompt: string,
  fileBase64: string,
  mimeType: string
): Promise<string> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY is not set");

  const Anthropic = (await import("@anthropic-ai/sdk")).default;
  const client = new Anthropic({ apiKey });

  type ImageMediaType = "image/jpeg" | "image/png" | "image/gif" | "image/webp";

  const content =
    mimeType === "application/pdf"
      ? [
          { type: "document" as const, source: { type: "base64" as const, media_type: "application/pdf" as const, data: fileBase64 } },
          { type: "text" as const, text: prompt },
        ]
      : [
          { type: "image" as const, source: { type: "base64" as const, media_type: mimeType as ImageMediaType, data: fileBase64 } },
          { type: "text" as const, text: prompt },
        ];

  const message = await client.messages.create({
    model: config.model,
    max_tokens: config.maxTokens,
    messages: [{ role: "user", content }],
  });

  const textBlock = message.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") throw new Error("No text response from Claude");
  return textBlock.text;
}

async function generateWithFileVertex(
  config: AIConfig,
  prompt: string,
  fileBase64: string,
  mimeType: string
): Promise<string> {
  const saKeyStr = process.env.GOOGLE_VERTEX_SA_KEY;
  if (!saKeyStr) throw new Error("GOOGLE_VERTEX_SA_KEY is not set");

  const project = config.vertexProject || process.env.GOOGLE_CLOUD_PROJECT;
  if (!project) throw new Error("Vertex AI project is not configured");

  const saKey = JSON.parse(saKeyStr);

  const { VertexAI } = await import("@google-cloud/vertexai");
  const vertexAI = new VertexAI({
    project,
    location: config.vertexLocation ?? "us-central1",
    googleAuthOptions: { credentials: saKey },
  });

  const model = vertexAI.getGenerativeModel({
    model: config.model,
    generationConfig: { maxOutputTokens: config.maxTokens },
  });

  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          { inlineData: { mimeType, data: fileBase64 } },
          { text: prompt },
        ],
      },
    ],
  });

  const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("No text response from Vertex AI");
  return text;
}
