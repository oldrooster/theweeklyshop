import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { aiSettings } from "@/lib/schema";
import { eq } from "drizzle-orm";
import { getCredentialStatus, type AIPurpose } from "@/lib/ai";
import { DEFAULT_CONFIGS } from "@/lib/ai-constants";

// GET: Return current AI settings for both purposes + credential status
export async function GET() {
  const db = getDb();
  const rows = db.select().from(aiSettings).all();

  const configs = {
    import: DEFAULT_CONFIGS.import,
    generate: DEFAULT_CONFIGS.generate,
  };

  for (const row of rows) {
    configs[row.purpose] = {
      purpose: row.purpose,
      provider: row.provider,
      model: row.model,
      maxTokens: row.maxTokens,
      vertexProject: row.vertexProject,
      vertexLocation: row.vertexLocation ?? "us-central1",
    };
  }

  return NextResponse.json({
    configs,
    credentials: getCredentialStatus(),
  });
}

// POST: Save AI settings for a purpose
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { purpose, provider, model, maxTokens, vertexProject, vertexLocation } = body as {
    purpose: AIPurpose;
    provider: "claude" | "vertex";
    model: string;
    maxTokens: number;
    vertexProject?: string;
    vertexLocation?: string;
  };

  if (!purpose || !provider || !model) {
    return NextResponse.json({ error: "purpose, provider, and model are required" }, { status: 400 });
  }

  const existing = db.select().from(aiSettings).where(eq(aiSettings.purpose, purpose)).get();

  const values = {
    purpose,
    provider,
    model,
    maxTokens: maxTokens || 4096,
    vertexProject: vertexProject || null,
    vertexLocation: vertexLocation || "us-central1",
    updatedAt: new Date().toISOString(),
  };

  if (existing) {
    db.update(aiSettings).set(values).where(eq(aiSettings.purpose, purpose)).run();
  } else {
    db.insert(aiSettings).values(values).run();
  }

  return NextResponse.json({ success: true });
}
