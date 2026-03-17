import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { meals, mealIngredients, ingredients } from "@/lib/schema";
import { eq, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const db = getDb();
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");

  let query = db.select().from(meals);

  if (search) {
    query = query.where(like(meals.name, `%${search}%`)) as typeof query;
  }
  if (category) {
    query = query.where(eq(meals.category, category as typeof meals.category.enumValues[number])) as typeof query;
  }

  const allMeals = query.all();

  // Fetch ingredients for each meal
  const mealsWithIngredients = allMeals.map((meal) => {
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

    return { ...meal, ingredients: mealIngs };
  });

  return NextResponse.json(mealsWithIngredients);
}

export interface MealIngredientInput {
  ingredientId?: number;
  ingredientName?: string;
  quantity: number;
  unit: string;
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { name, category, serves, instructions, tags, ingredients: mealIngs } = body as {
    name: string;
    category: string;
    serves: number;
    instructions?: string;
    tags?: string[];
    ingredients: MealIngredientInput[];
  };

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  // Create the meal
  const meal = db.insert(meals).values({
    name: name.trim(),
    category: (category || "dinner") as "breakfast" | "lunch" | "dinner" | "snack",
    serves: serves || 4,
    instructions: instructions || null,
    tags: tags || [],
  }).returning().get();

  // Add ingredients
  if (mealIngs && Array.isArray(mealIngs)) {
    for (const ing of mealIngs) {
      let ingredientId = ing.ingredientId;

      // If no ingredientId but has a name, create or find the ingredient
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
          mealId: meal.id,
          ingredientId,
          quantity: ing.quantity || 1,
          unit: ing.unit || "pieces",
        }).run();
      }
    }
  }

  return NextResponse.json(meal, { status: 201 });
}
