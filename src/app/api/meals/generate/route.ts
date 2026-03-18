import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const RECIPE_PROMPT = `You are a recipe generator. Given a meal name, generate a complete recipe.

Return ONLY a valid JSON object (no other text) with these exact fields:
- "name": the meal name, properly spelled and capitalised
- "category": one of "breakfast", "lunch", "dinner", "snack"
- "serves": number of servings (usually 4)
- "instructions": step-by-step cooking instructions as a single string with numbered steps
- "ingredients": array of objects, each with:
  - "ingredientName": ingredient name in lowercase (e.g. "spaghetti", "olive oil")
  - "quantity": numeric quantity
  - "unit": one of "pieces", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "slices", "rashers", "fillets", "cloves", "cans", "bunches"

Use metric units where practical. Be specific with quantities.`;

export async function POST(request: NextRequest) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  const body = await request.json();
  const mealName = body.mealName?.trim();
  if (!mealName) {
    return NextResponse.json({ error: "Meal name is required" }, { status: 400 });
  }

  const client = new Anthropic({ apiKey });

  try {
    const message = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: RECIPE_PROMPT,
      messages: [{ role: "user", content: `Generate a complete recipe for: ${mealName}` }],
    });

    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No response from Claude" }, { status: 500 });
    }

    const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
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
