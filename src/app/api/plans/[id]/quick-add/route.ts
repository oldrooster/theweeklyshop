import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { shoppingListItems, ingredients } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const { name, quantity, unit } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Try to match an existing ingredient
  const existing = db.select().from(ingredients)
    .where(eq(ingredients.name, name.trim().toLowerCase()))
    .get();

  const item = db.insert(shoppingListItems).values({
    weeklyPlanId: parseInt(id),
    ingredientId: existing?.id || null,
    quantity: quantity || null,
    unit: unit || null,
    source: "manual",
    customName: existing ? null : name.trim(),
    checked: false,
    removed: false,
  }).returning().get();

  return NextResponse.json(item, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: _planId } = await params;
  const db = getDb();
  const itemId = request.nextUrl.searchParams.get("itemId");

  if (!itemId) {
    return NextResponse.json({ error: "itemId is required" }, { status: 400 });
  }

  db.delete(shoppingListItems)
    .where(eq(shoppingListItems.id, parseInt(itemId)))
    .run();

  return NextResponse.json({ success: true });
}
