import { NextRequest, NextResponse } from "next/server";
import { generateText, getAIConfig, getCredentialStatus } from "@/lib/ai";

const RECIPE_PROMPT = `You are a recipe generator. Given a meal name, generate a complete recipe.

Return ONLY a valid JSON object (no other text) with these exact fields:
- "name": the meal name, properly spelled and capitalised
- "category": one of "breakfast", "lunch", "dinner", "snack"
- "serves": number of servings (usually 4)
- "instructions": step-by-step cooking instructions formatted in markdown. Use a "## Method" heading followed by a numbered list. Example:
  "## Method\\n1. Preheat the oven to 180°C.\\n2. Mix the dry ingredients.\\n3. Fold in the wet ingredients."
- "ingredients": array of objects, each with:
  - "ingredientName": ingredient name in lowercase (e.g. "spaghetti", "olive oil")
  - "quantity": numeric quantity
  - "unit": one of "pieces", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "slices", "rashers", "fillets", "cloves", "cans", "bunches"

Use metric units where practical. Be specific with quantities.`;

export async function POST(request: NextRequest) {
  const config = getAIConfig("generate");
  const creds = getCredentialStatus();
  const hasCredential = config.provider === "claude" ? creds.claude : creds.vertex;

  if (!hasCredential) {
    const envVar = config.provider === "claude" ? "ANTHROPIC_API_KEY" : "GOOGLE_VERTEX_SA_KEY";
    return NextResponse.json(
      { error: `${envVar} is not configured. Add it to your environment variables.` },
      { status: 500 }
    );
  }

  const body = await request.json();
  const mealName = body.mealName?.trim();
  if (!mealName) {
    return NextResponse.json({ error: "Meal name is required" }, { status: 400 });
  }

  try {
    const rawText = await generateText(
      "generate",
      RECIPE_PROMPT,
      `Generate a complete recipe for: ${mealName}`
    );

    // Strip markdown code fences if present
    const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    const jsonMatch = stripped.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse recipe from response" }, { status: 422 });
    }

    const recipe = JSON.parse(jsonMatch[0]);
    return NextResponse.json(recipe);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
