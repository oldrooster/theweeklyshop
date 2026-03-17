import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { weeklyPlans, weeklyPlanMeals, meals, shoppingListItems } from "@/lib/schema";
import { eq } from "drizzle-orm";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();

  const plan = db.select().from(weeklyPlans).where(eq(weeklyPlans.id, parseInt(id))).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  const planMeals = db
    .select({
      id: weeklyPlanMeals.id,
      dayOfWeek: weeklyPlanMeals.dayOfWeek,
      mealType: weeklyPlanMeals.mealType,
      servingsOverride: weeklyPlanMeals.servingsOverride,
      mealId: weeklyPlanMeals.mealId,
      mealName: meals.name,
      mealCategory: meals.category,
      mealServes: meals.serves,
    })
    .from(weeklyPlanMeals)
    .innerJoin(meals, eq(weeklyPlanMeals.mealId, meals.id))
    .where(eq(weeklyPlanMeals.weeklyPlanId, plan.id))
    .all();

  const quickAddItems = db
    .select()
    .from(shoppingListItems)
    .where(eq(shoppingListItems.weeklyPlanId, plan.id))
    .all();

  return NextResponse.json({ ...plan, meals: planMeals, quickAddItems });
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  db.delete(weeklyPlans).where(eq(weeklyPlans.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
