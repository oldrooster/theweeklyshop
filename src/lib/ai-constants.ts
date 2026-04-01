// Client-safe constants for AI configuration UI
// Do NOT import anything from @anthropic-ai/sdk or @google-cloud/vertexai here

export type AIPurpose = "import" | "generate";
export type AIProvider = "claude" | "vertex";

export const CLAUDE_MODELS = [
  { id: "claude-sonnet-4-6", label: "Claude Sonnet 4.6 (recommended)" },
  { id: "claude-haiku-4-5", label: "Claude Haiku 4.5 (fast)" },
  { id: "claude-opus-4-6", label: "Claude Opus 4.6 (most capable)" },
];

export const VERTEX_MODELS = [
  { id: "gemini-2.0-flash-001", label: "Gemini 2.0 Flash (fast)" },
  { id: "gemini-1.5-flash-001", label: "Gemini 1.5 Flash" },
  { id: "gemini-1.5-pro-001", label: "Gemini 1.5 Pro (most capable)" },
];

export const DEFAULT_CONFIGS: Record<AIPurpose, {
  purpose: AIPurpose;
  provider: AIProvider;
  model: string;
  maxTokens: number;
  vertexProject: string | null;
  vertexLocation: string | null;
}> = {
  import: {
    purpose: "import",
    provider: "claude",
    model: "claude-sonnet-4-6",
    maxTokens: 8096,
    vertexProject: null,
    vertexLocation: "us-central1",
  },
  generate: {
    purpose: "generate",
    provider: "claude",
    model: "claude-haiku-4-5",
    maxTokens: 2048,
    vertexProject: null,
    vertexLocation: "us-central1",
  },
};
