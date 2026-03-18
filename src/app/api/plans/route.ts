import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { weeklyPlans, weeklyPlanMeals, meals, shoppingListItems } from "@/lib/schema";
import { eq, desc } from "drizzle-orm";
import { getMonday } from "@/lib/week-utils";

export async function GET(request: NextRequest) {
  const db = getDb();
  const weekStart = request.nextUrl.searchParams.get("week");

  if (weekStart) {
    // Get a specific week's plan
    const plan = db.select().from(weeklyPlans)
      .where(eq(weeklyPlans.weekStartDate, weekStart))
      .get();

    if (!plan) {
      return NextResponse.json(null);
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

  // List all plans, most recent first
  const allPlans = db.select().from(weeklyPlans).orderBy(desc(weeklyPlans.weekStartDate)).all();
  return NextResponse.json(allPlans);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const weekStart = body.weekStartDate || getMonday();

  // Check if plan already exists for this week
  const existing = db.select().from(weeklyPlans)
    .where(eq(weeklyPlans.weekStartDate, weekStart))
    .get();

  if (existing) {
    return NextResponse.json(existing);
  }

  const plan = db.insert(weeklyPlans).values({
    weekStartDate: weekStart,
    status: "draft",
  }).returning().get();

  return NextResponse.json(plan, { status: 201 });
}
