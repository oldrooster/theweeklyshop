import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { ingredients } from "@/lib/schema";

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
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { error: "ANTHROPIC_API_KEY not configured. Add it to your .env.local file." },
      { status: 500 }
    );
  }

  const formData = await request.formData();
  const file = formData.get("file") as File | null;

  if (!file) {
    return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
  }

  console.log(`[import] file="${file.name}" type="${file.type}" size=${file.size}`);

  // Read the file
  const bytes = await file.arrayBuffer();
  const base64 = Buffer.from(bytes).toString("base64");

  // Determine media type
  let mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp" | "application/pdf";
  if (file.type === "application/pdf") {
    mediaType = "application/pdf";
  } else if (file.type === "image/png") {
    mediaType = "image/png";
  } else if (file.type === "image/webp") {
    mediaType = "image/webp";
  } else if (file.type === "image/gif") {
    mediaType = "image/gif";
  } else {
    mediaType = "image/jpeg";
  }

  console.log(`[import] sending to Claude as mediaType="${mediaType}"`);

  const client = new Anthropic({ apiKey });

  try {
    const content: Anthropic.MessageCreateParams["messages"][0]["content"] = mediaType === "application/pdf"
      ? [
          {
            type: "document" as const,
            source: { type: "base64" as const, media_type: mediaType, data: base64 },
          },
          { type: "text" as const, text: EXTRACTION_PROMPT },
        ]
      : [
          {
            type: "image" as const,
            source: { type: "base64" as const, media_type: mediaType, data: base64 },
          },
          { type: "text" as const, text: EXTRACTION_PROMPT },
        ];

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    console.log(`[import] Claude stop_reason="${message.stop_reason}" content_blocks=${message.content.length}`);

    // Extract text response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      console.error("[import] No text block in Claude response:", JSON.stringify(message.content));
      return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
    }

    console.log(`[import] Claude raw response (first 500 chars): ${textBlock.text.slice(0, 500)}`);

    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error(`[import] Could not find JSON array in response. Full text:\n${textBlock.text}`);
      return NextResponse.json({ error: "Could not parse items from receipt", raw: textBlock.text }, { status: 422 });
    }

    let extractedItems;
    try {
      extractedItems = JSON.parse(jsonMatch[0]);
    } catch (parseErr) {
      console.error(`[import] JSON.parse failed: ${parseErr}\nMatched text: ${jsonMatch[0].slice(0, 500)}`);
      return NextResponse.json({ error: "Could not parse items from receipt", raw: jsonMatch[0] }, { status: 422 });
    }

    console.log(`[import] extracted ${extractedItems.length} items`);

    // Try to match extracted items to existing ingredients
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

    return NextResponse.json({
      items: itemsWithMatches,
      fileName: file.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error(`[import] Claude API error: ${message}`, err);
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 500 });
  }
}
