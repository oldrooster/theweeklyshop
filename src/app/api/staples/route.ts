import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { stapleItems, ingredients } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET: List all staple items with ingredient details
export async function GET() {
  const db = getDb();

  const items = db
    .select({
      id: stapleItems.id,
      ingredientId: stapleItems.ingredientId,
      ingredientName: ingredients.name,
      ingredientCategory: ingredients.category,
      defaultQuantity: stapleItems.defaultQuantity,
      unit: stapleItems.unit,
      category: stapleItems.category,
    })
    .from(stapleItems)
    .innerJoin(ingredients, eq(stapleItems.ingredientId, ingredients.id))
    .all();

  return NextResponse.json(items);
}

// POST: Add a new staple item (creates ingredient if needed)
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { name, quantity, unit, category } = body;

  if (!name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Find or create ingredient
  let ingredient = db
    .select()
    .from(ingredients)
    .where(eq(ingredients.name, name))
    .get();

  if (!ingredient) {
    // Determine ingredient category from staple category
    const ingCategory = category === "household" ? "household" : category === "bathroom" ? "bathroom" : "pantry";
    db.insert(ingredients)
      .values({ name, category: ingCategory, defaultUnit: unit || "pieces" })
      .run();
    ingredient = db.select().from(ingredients).where(eq(ingredients.name, name)).get()!;
  }

  // Check if already a staple
  const existing = db
    .select()
    .from(stapleItems)
    .where(eq(stapleItems.ingredientId, ingredient.id))
    .get();

  if (existing) {
    return NextResponse.json({ error: "Already a staple item" }, { status: 409 });
  }

  db.insert(stapleItems).values({
    ingredientId: ingredient.id,
    defaultQuantity: quantity || 1,
    unit: unit || ingredient.defaultUnit,
    category: category || "staple",
  }).run();

  const created = db
    .select({
      id: stapleItems.id,
      ingredientId: stapleItems.ingredientId,
      ingredientName: ingredients.name,
      ingredientCategory: ingredients.category,
      defaultQuantity: stapleItems.defaultQuantity,
      unit: stapleItems.unit,
      category: stapleItems.category,
    })
    .from(stapleItems)
    .innerJoin(ingredients, eq(stapleItems.ingredientId, ingredients.id))
    .where(eq(stapleItems.ingredientId, ingredient.id))
    .get();

  return NextResponse.json(created, { status: 201 });
}

// DELETE: Remove a staple item
export async function DELETE(request: NextRequest) {
  const db = getDb();
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  db.delete(stapleItems).where(eq(stapleItems.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}

// PATCH: Update a staple item
export async function PATCH(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { id, quantity, unit, category } = body;

  if (!id) {
    return NextResponse.json({ error: "id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};
  if (quantity !== undefined) updates.defaultQuantity = quantity;
  if (unit !== undefined) updates.unit = unit;
  if (category !== undefined) updates.category = category;

  db.update(stapleItems).set(updates).where(eq(stapleItems.id, id)).run();

  return NextResponse.json({ success: true });
}
