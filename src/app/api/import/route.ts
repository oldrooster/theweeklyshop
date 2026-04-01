import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ingredients } from "@/lib/schema";
import { generateWithFile, getAIConfig, getCredentialStatus } from "@/lib/ai";

const EXTRACTION_PROMPT = `You are a grocery receipt parser. Extract every purchased item from this receipt.

For each item return a JSON array of objects with these fields:
- "ingredient": the BASE ingredient name WITHOUT any brand prefix, cleaned and lowercased (e.g. "PAMS PLAIN FLOUR 1KG" -> "plain flour", "ANCHOR BLUE MILK 2L" -> "blue milk", "ORGANIC BANANAS" -> "bananas")
- "brand": the brand name if present, otherwise null (e.g. "Pams", "Anchor", "Woolworths Select", null). Strip store-brand prefixes from the ingredient name.
- "quantity": numeric quantity (default 1 if not shown)
- "unit": the unit — use one of: pieces, g, kg, ml, l, packs, loaves, bottles, rolls, bags. Infer from context (e.g. "2L milk" -> quantity: 2, unit: "l")
- "category": one of: produce, dairy, meat, bakery, frozen, pantry, household, bathroom, snacks, drinks, other
- "price": the price as a number in the currency shown on the receipt (if visible), or null
- "currency": the currency code from the receipt (e.g. "USD", "GBP", "EUR", "NZD", "AUD") — infer from currency symbols or store context

Return ONLY a valid JSON array, no other text. Example:
[{"ingredient": "plain flour", "brand": "Pams", "quantity": 1, "unit": "kg", "category": "pantry", "price": 2.50, "currency": "NZD"}]

If you cannot parse the receipt, return an empty array [].`;

export async function POST(request: NextRequest) {
  const config = getAIConfig("import");
  const creds = getCredentialStatus();
  const hasCredential = config.provider === "claude" ? creds.claude : creds.vertex;

  if (!hasCredential) {
    const envVar = config.provider === "claude" ? "ANTHROPIC_API_KEY" : "GOOGLE_VERTEX_SA_KEY";
    return NextResponse.json(
      { error: `${envVar} is not configured. Add it to your environment variables.` },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  console.log(`[import] file="${file.name}" type="${file.type}" size=${file.size} provider=${config.provider} model=${config.model}`);

  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  let mimeType: string;
  if (file.type === "application/pdf") {
    mimeType = "application/pdf";
  } else if (file.type === "image/png") {
    mimeType = "image/png";
  } else if (file.type === "image/webp") {
    mimeType = "image/webp";
  } else if (file.type === "image/gif") {
    mimeType = "image/gif";
  } else {
    mimeType = "image/jpeg";
  }

  console.log(`[import] sending to ${config.provider} as mimeType="${mimeType}"`);

  try {
    const rawText = await generateWithFile("import", EXTRACTION_PROMPT, base64, mimeType);

    console.log(`[import] raw response (first 500 chars): ${rawText.slice(0, 500)}`);

    // Strip markdown code fences if present
    const stripped = rawText.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/, "").trim();

    const arrayStart = stripped.indexOf("[");
    if (arrayStart === -1) {
      console.error(`[import] Could not find JSON array in response. Full text:\n${rawText}`);
      return NextResponse.json({ error: "Could not parse items from receipt", raw: rawText }, { status: 422 });
    }

    let jsonText = stripped.slice(arrayStart);

    // Recover truncated response
    if (!jsonText.trimEnd().endsWith("]")) {
      console.warn(`[import] Response appears truncated, attempting to recover partial JSON`);
      jsonText = jsonText.replace(/,\s*\{[^}]*$/, "").trimEnd();
      if (!jsonText.endsWith("]")) jsonText += "]";
    }

    let extractedItems;
    try {
      extractedItems = JSON.parse(jsonText);
    } catch (parseErr) {
      console.error(`[import] JSON.parse failed: ${parseErr}\nAttempted text: ${jsonText.slice(0, 500)}`);
      return NextResponse.json({ error: "Could not parse items from receipt", raw: rawText }, { status: 422 });
    }

    console.log(`[import] extracted ${extractedItems.length} items`);

    const db = getDb();
    const allIngredients = db.select().from(ingredients).all();
    const ingredientMap = new Map(allIngredients.map((i) => [i.name.toLowerCase(), i]));

    const itemsWithMatches = extractedItems.map((item: { ingredient: string; brand: string | null; quantity: number; unit: string; category: string; price: number | null; currency: string }) => {
      const ingredientName = (item.ingredient || "").toLowerCase().trim();
      const match = ingredientMap.get(ingredientName);
      return {
        ...item,
        ingredient: ingredientName,
        matched: match ? { id: match.id, name: match.name, category: match.category } : null,
      };
    });

    return NextResponse.json({ items: itemsWithMatches, fileName: file.name });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[import] AI error: ${message}`, err);
    return NextResponse.json({ error: `AI error: ${message}` }, { status: 500 });
  }
}
