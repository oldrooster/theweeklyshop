import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { meals, mealIngredients, ingredients } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const meal = db.select().from(meals).where(eq(meals.id, parseInt(id))).get();
  if (!meal) {
    return NextResponse.json({ error: "Meal not found" }, { status: 404 });
  }

  const mealIngs = db
    .select({
      id: mealIngredients.id,
      quantity: mealIngredients.quantity,
      unit: mealIngredients.unit,
      ingredientId: mealIngredients.ingredientId,
      ingredientName: ingredients.name,
      ingredientCategory: ingredients.category,
    })
    .from(mealIngredients)
    .innerJoin(ingredients, eq(mealIngredients.ingredientId, ingredients.id))
    .where(eq(mealIngredients.mealId, meal.id))
    .all();

  return NextResponse.json({ ...meal, ingredients: mealIngs });
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const { name, category, serves, instructions, tags, ingredients: mealIngs } = body;

  // Update meal
  db.update(meals)
    .set({
      name: name?.trim(),
      category,
      serves,
      instructions: instructions || null,
      tags: tags || [],
      updatedAt: new Date().toISOString(),
    })
    .where(eq(meals.id, parseInt(id)))
    .run();

  // Replace ingredients if provided
  if (mealIngs && Array.isArray(mealIngs)) {
    db.delete(mealIngredients).where(eq(mealIngredients.mealId, parseInt(id))).run();

    for (const ing of mealIngs) {
      let ingredientId = ing.ingredientId;

      if (!ingredientId && ing.ingredientName) {
        const existing = db
          .select()
          .from(ingredients)
          .where(eq(ingredients.name, ing.ingredientName.trim().toLowerCase()))
          .get();

        if (existing) {
          ingredientId = existing.id;
        } else {
          const newIng = db.insert(ingredients).values({
            name: ing.ingredientName.trim().toLowerCase(),
            defaultUnit: ing.unit || "pieces",
          }).returning().get();
          ingredientId = newIng.id;
        }
      }

      if (ingredientId) {
        db.insert(mealIngredients).values({
          mealId: parseInt(id),
          ingredientId,
          quantity: ing.quantity || 1,
          unit: ing.unit || "pieces",
        }).run();
      }
    }
  }

  const updated = db.select().from(meals).where(eq(meals.id, parseInt(id))).get();
  return NextResponse.json(updated);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.delete(meals).where(eq(meals.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
