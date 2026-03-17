import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { weeklyPlans, weeklyPlanMeals, shoppingListItems } from "@/lib/schema";
import { eq } from "drizzle-orm";

// Copy a plan's meals into a new week
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();
  const { targetWeekStart } = body;

  if (!targetWeekStart) {
    return NextResponse.json({ error: "targetWeekStart is required" }, { status: 400 });
  }

  // Get source plan
  const sourcePlan = db.select().from(weeklyPlans)
    .where(eq(weeklyPlans.id, parseInt(id)))
    .get();

  if (!sourcePlan) {
    return NextResponse.json({ error: "Source plan not found" }, { status: 404 });
  }

  // Create or get target plan
  let targetPlan = db.select().from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, targetWeekStart))
    .get();

  if (!targetPlan) {
    targetPlan = db.insert(weeklyPlans).values({
      weekStartDate: targetWeekStart,
      status: "draft",
    }).returning().get();
  }

  // Clear existing meals in target
  db.delete(weeklyPlanMeals)
    .where(eq(weeklyPlanMeals.weeklyPlanId, targetPlan.id))
    .run();

  // Copy meals
  const sourceMeals = db.select().from(weeklyPlanMeals)
    .where(eq(weeklyPlanMeals.weeklyPlanId, sourcePlan.id))
    .all();

  for (const sm of sourceMeals) {
    db.insert(weeklyPlanMeals).values({
      weeklyPlanId: targetPlan.id,
      mealId: sm.mealId,
      dayOfWeek: sm.dayOfWeek,
      mealType: sm.mealType,
      servingsOverride: sm.servingsOverride,
    }).run();
  }

  // Copy quick-add items (manual items)
  db.delete(shoppingListItems)
    .where(eq(shoppingListItems.weeklyPlanId, targetPlan.id))
    .run();

  const sourceItems = db.select().from(shoppingListItems)
    .where(eq(shoppingListItems.weeklyPlanId, sourcePlan.id))
    .all();

  for (const si of sourceItems) {
    db.insert(shoppingListItems).values({
      weeklyPlanId: targetPlan.id,
      ingredientId: si.ingredientId,
      quantity: si.quantity,
      unit: si.unit,
      source: si.source,
      customName: si.customName,
      checked: false,
      removed: false,
    }).run();
  }

  return NextResponse.json(targetPlan);
}
