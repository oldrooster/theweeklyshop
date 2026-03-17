import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { weeklyPlanMeals } from "@/lib/schema";
import { eq, and } from "drizzle-orm";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const body = await request.json();

  const { mealId, dayOfWeek, mealType, servingsOverride } = body;

  if (mealId === undefined || dayOfWeek === undefined || !mealType) {
    return NextResponse.json({ error: "mealId, dayOfWeek, and mealType are required" }, { status: 400 });
  }

  // Remove existing meal in that slot (one meal per day per type)
  db.delete(weeklyPlanMeals)
    .where(
      and(
        eq(weeklyPlanMeals.weeklyPlanId, parseInt(id)),
        eq(weeklyPlanMeals.dayOfWeek, dayOfWeek),
        eq(weeklyPlanMeals.mealType, mealType)
      )
    )
    .run();

  const entry = db.insert(weeklyPlanMeals).values({
    weeklyPlanId: parseInt(id),
    mealId,
    dayOfWeek,
    mealType,
    servingsOverride: servingsOverride || null,
  }).returning().get();

  return NextResponse.json(entry, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const db = getDb();
  const dayOfWeek = request.nextUrl.searchParams.get("day");
  const mealType = request.nextUrl.searchParams.get("type");

  if (dayOfWeek === null || !mealType) {
    return NextResponse.json({ error: "day and type are required" }, { status: 400 });
  }

  db.delete(weeklyPlanMeals)
    .where(
      and(
        eq(weeklyPlanMeals.weeklyPlanId, parseInt(id)),
        eq(weeklyPlanMeals.dayOfWeek, parseInt(dayOfWeek)),
        eq(weeklyPlanMeals.mealType, mealType as "breakfast" | "lunch" | "dinner" | "snack")
      )
    )
    .run();

  return NextResponse.json({ success: true });
}
