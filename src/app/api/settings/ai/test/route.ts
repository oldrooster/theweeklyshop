import { NextRequest, NextResponse } from "next/server";
import { getAIConfig, type AIPurpose } from "@/lib/ai";

// POST: Test AI credentials for a given provider + purpose
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { purpose, provider } = body as { purpose: AIPurpose; provider: "claude" | "vertex" };

  if (provider === "claude") {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ success: false, error: "ANTHROPIC_API_KEY is not set" });
    }
    try {
      const Anthropic = (await import("@anthropic-ai/sdk")).default;
      const client = new Anthropic({ apiKey });
      const config = getAIConfig(purpose);
      const message = await client.messages.create({
        model: config.provider === "claude" ? config.model : "claude-haiku-4-5",
        max_tokens: 16,
        messages: [{ role: "user", content: "Reply with: ok" }],
      });
      const textBlock = message.content.find((b) => b.type === "text");
      return NextResponse.json({ success: true, response: textBlock?.type === "text" ? textBlock.text.trim() : "ok" });
    } catch (err) {
      return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  if (provider === "vertex") {
    const saKeyStr = process.env.GOOGLE_VERTEX_SA_KEY;
    if (!saKeyStr) {
      return NextResponse.json({ success: false, error: "GOOGLE_VERTEX_SA_KEY is not set" });
    }

    let saKey: Record<string, unknown>;
    try {
      saKey = JSON.parse(saKeyStr);
    } catch {
      return NextResponse.json({ success: false, error: "GOOGLE_VERTEX_SA_KEY is not valid JSON" });
    }

    const config = getAIConfig(purpose);
    const project = (config.provider === "vertex" ? config.vertexProject : null) || process.env.GOOGLE_CLOUD_PROJECT;
    if (!project) {
      return NextResponse.json({ success: false, error: "Vertex project ID is not configured" });
    }

    try {
      const { VertexAI } = await import("@google-cloud/vertexai");
      const vertexAI = new VertexAI({
        project,
        location: (config.provider === "vertex" ? config.vertexLocation : null) ?? "us-central1",
        googleAuthOptions: { credentials: saKey },
      });

      const model = vertexAI.getGenerativeModel({
        model: config.provider === "vertex" ? config.model : "gemini-2.0-flash-001",
        generationConfig: { maxOutputTokens: 16 },
      });

      const result = await model.generateContent({
        contents: [{ role: "user", parts: [{ text: "Reply with: ok" }] }],
      });

      const text = result.response.candidates?.[0]?.content?.parts?.[0]?.text ?? "ok";
      return NextResponse.json({ success: true, response: text.trim() });
    } catch (err) {
      return NextResponse.json({ success: false, error: err instanceof Error ? err.message : String(err) });
    }
  }

  return NextResponse.json({ success: false, error: "Unknown provider" }, { status: 400 });
}
