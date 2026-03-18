import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { getDb } from "@/lib/db";
import { ingredients } from "@/lib/schema";

const EXTRACTION_PROMPT = `You are a grocery receipt parser. Extract every purchased item from this receipt.

For each item return a JSON array of objects with these fields:
- "name": the item name, cleaned up (e.g. "ORGANIC BANANAS" -> "Bananas", "SK MILK 2L" -> "Semi-skimmed milk")
- "quantity": numeric quantity (default 1 if not shown)
- "unit": the unit — use one of: pieces, g, kg, ml, l, packs, loaves, bottles, rolls, bags. Infer from context (e.g. "2L milk" -> quantity: 2, unit: "l")
- "category": one of: produce, dairy, meat, bakery, frozen, pantry, household, bathroom, snacks, drinks, other
- "price": the price as a number in the currency shown on the receipt (if visible), or null
- "currency": the currency code from the receipt (e.g. "USD", "GBP", "EUR", "AUD") — infer from currency symbols or store context

Return ONLY a valid JSON array, no other text. Example:
[{"name": "Bananas", "quantity": 6, "unit": "pieces", "category": "produce", "price": 1.20, "currency": "USD"}]

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
      model: "claude-sonnet-4-20250514",
      max_tokens: 2048,
      messages: [{ role: "user", content }],
    });

    // Extract text response
    const textBlock = message.content.find((b) => b.type === "text");
    if (!textBlock || textBlock.type !== "text") {
      return NextResponse.json({ error: "No text response from Claude" }, { status: 500 });
    }

    // Parse JSON from response
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      return NextResponse.json({ error: "Could not parse items from receipt", raw: textBlock.text }, { status: 422 });
    }

    const extractedItems = JSON.parse(jsonMatch[0]);

    // Try to match extracted items to existing ingredients
    const db = getDb();
    const allIngredients = db.select().from(ingredients).all();
    const ingredientMap = new Map(allIngredients.map((i) => [i.name.toLowerCase(), i]));

    const itemsWithMatches = extractedItems.map((item: { name: string; quantity: number; unit: string; category: string; price: number | null }) => {
      const match = ingredientMap.get(item.name.toLowerCase());
      return {
        ...item,
        matched: match ? { id: match.id, name: match.name, category: match.category } : null,
      };
    });

    return NextResponse.json({
      items: itemsWithMatches,
      fileName: file.name,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json({ error: `Claude API error: ${message}` }, { status: 500 });
  }
}
