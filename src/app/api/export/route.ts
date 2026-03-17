import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { households, householdMembers, ingredients, meals, mealIngredients, weeklyPlans, weeklyPlanMeals, stapleItems, shoppingListItems } from "@/lib/schema";

// GET: Export all data as JSON
export async function GET() {
  const db = getDb();

  const data = {
    exportedAt: new Date().toISOString(),
    version: 1,
    households: db.select().from(households).all(),
    householdMembers: db.select().from(householdMembers).all(),
    ingredients: db.select().from(ingredients).all(),
    meals: db.select().from(meals).all(),
    mealIngredients: db.select().from(mealIngredients).all(),
    weeklyPlans: db.select().from(weeklyPlans).all(),
    weeklyPlanMeals: db.select().from(weeklyPlanMeals).all(),
    stapleItems: db.select().from(stapleItems).all(),
    shoppingListItems: db.select().from(shoppingListItems).all(),
  };

  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json",
      "Content-Disposition": `attachment; filename="weekly-shop-backup-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
