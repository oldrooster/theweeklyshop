import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import {
  weeklyPlans,
  weeklyPlanMeals,
  mealIngredients,
  ingredients,
  meals,
  shoppingListItems,
  stapleItems,
} from "@/lib/schema";
import { eq, and } from "drizzle-orm";
import { aggregateItems, type RawItem } from "@/lib/aggregator";

// GET: Generate or retrieve the shopping list for a plan
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const db = getDb();
  const planIdNum = parseInt(planId);

  const plan = db.select().from(weeklyPlans).where(eq(weeklyPlans.id, planIdNum)).get();
  if (!plan) {
    return NextResponse.json({ error: "Plan not found" }, { status: 404 });
  }

  // Gather all raw items from meals in the plan
  const rawItems: RawItem[] = [];

  const planMeals = db
    .select({
      mealId: weeklyPlanMeals.mealId,
      mealName: meals.name,
      servingsOverride: weeklyPlanMeals.servingsOverride,
      mealServes: meals.serves,
    })
    .from(weeklyPlanMeals)
    .innerJoin(meals, eq(weeklyPlanMeals.mealId, meals.id))
    .where(eq(weeklyPlanMeals.weeklyPlanId, planIdNum))
    .all();

  for (const pm of planMeals) {
    const mealIngs = db
      .select({
        ingredientId: mealIngredients.ingredientId,
        quantity: mealIngredients.quantity,
        unit: mealIngredients.unit,
        ingredientName: ingredients.name,
        ingredientCategory: ingredients.category,
      })
      .from(mealIngredients)
      .innerJoin(ingredients, eq(mealIngredients.ingredientId, ingredients.id))
      .where(eq(mealIngredients.mealId, pm.mealId))
      .all();

    // Scale quantities if servings are overridden
    const scale = pm.servingsOverride ? pm.servingsOverride / pm.mealServes : 1;

    for (const ing of mealIngs) {
      rawItems.push({
        ingredientId: ing.ingredientId,
        ingredientName: ing.ingredientName,
        ingredientCategory: ing.ingredientCategory,
        quantity: ing.quantity * scale,
        unit: ing.unit,
        source: "meal",
        sourceMeal: pm.mealName,
      });
    }
  }

  // Add staple items
  const staples = db
    .select({
      ingredientId: stapleItems.ingredientId,
      quantity: stapleItems.defaultQuantity,
      unit: stapleItems.unit,
      ingredientName: ingredients.name,
      ingredientCategory: ingredients.category,
    })
    .from(stapleItems)
    .innerJoin(ingredients, eq(stapleItems.ingredientId, ingredients.id))
    .all();

  for (const s of staples) {
    rawItems.push({
      ingredientId: s.ingredientId,
      ingredientName: s.ingredientName,
      ingredientCategory: s.ingredientCategory,
      quantity: s.quantity,
      unit: s.unit,
      source: "staple",
    });
  }

  // Aggregate
  const aggregated = aggregateItems(rawItems);

  // Get manual/quick-add items for this plan
  const manualItems = db
    .select({
      id: shoppingListItems.id,
      ingredientId: shoppingListItems.ingredientId,
      quantity: shoppingListItems.quantity,
      unit: shoppingListItems.unit,
      customName: shoppingListItems.customName,
      checked: shoppingListItems.checked,
      removed: shoppingListItems.removed,
      source: shoppingListItems.source,
    })
    .from(shoppingListItems)
    .where(eq(shoppingListItems.weeklyPlanId, planIdNum))
    .all();

  // Get existing checked/removed state for aggregated items
  const existingListItems = db
    .select()
    .from(shoppingListItems)
    .where(
      and(
        eq(shoppingListItems.weeklyPlanId, planIdNum),
        eq(shoppingListItems.source, "meal")
      )
    )
    .all();

  // Build a map of checked state by ingredient id
  const checkedMap = new Map<number, boolean>();
  const removedMap = new Map<number, boolean>();
  for (const item of existingListItems) {
    if (item.ingredientId) {
      checkedMap.set(item.ingredientId, item.checked);
      removedMap.set(item.ingredientId, item.removed);
    }
  }

  // Build the final list
  const list = aggregated.map((item, index) => ({
    id: `agg-${index}`,
    ingredientId: item.ingredientId,
    name: item.name,
    category: item.category,
    quantity: item.quantity,
    unit: item.unit,
    sources: item.sources,
    checked: item.ingredientId ? checkedMap.get(item.ingredientId) ?? false : false,
    removed: item.ingredientId ? removedMap.get(item.ingredientId) ?? false : false,
    source: "meal" as const,
  }));

  // Add manual items that aren't just ingredient-linked
  const manualForDisplay = manualItems
    .filter((m) => m.source === "manual")
    .map((m) => ({
      id: `manual-${m.id}`,
      dbId: m.id,
      ingredientId: m.ingredientId,
      name: m.customName || "(unknown)",
      category: "other",
      quantity: m.quantity,
      unit: m.unit,
      sources: ["quick add"],
      checked: m.checked,
      removed: m.removed,
      source: "manual" as const,
    }));

  return NextResponse.json({
    planId: planIdNum,
    weekStartDate: plan.weekStartDate,
    items: [...list, ...manualForDisplay],
  });
}

// PATCH: Update checked/removed state for items
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ planId: string }> }
) {
  const { planId } = await params;
  const db = getDb();
  const planIdNum = parseInt(planId);
  const body = await request.json();

  const { ingredientId, dbId, checked, removed } = body;

  if (dbId) {
    // Update existing shopping list item (manual item)
    const updates: Record<string, unknown> = {};
    if (checked !== undefined) updates.checked = checked;
    if (removed !== undefined) updates.removed = removed;

    db.update(shoppingListItems)
      .set(updates)
      .where(eq(shoppingListItems.id, dbId))
      .run();
  } else if (ingredientId) {
    // For aggregated meal items, upsert a shopping list item to track state
    const existing = db
      .select()
      .from(shoppingListItems)
      .where(
        and(
          eq(shoppingListItems.weeklyPlanId, planIdNum),
          eq(shoppingListItems.ingredientId, ingredientId),
          eq(shoppingListItems.source, "meal")
        )
      )
      .get();

    if (existing) {
      const updates: Record<string, unknown> = {};
      if (checked !== undefined) updates.checked = checked;
      if (removed !== undefined) updates.removed = removed;

      db.update(shoppingListItems)
        .set(updates)
        .where(eq(shoppingListItems.id, existing.id))
        .run();
    } else {
      db.insert(shoppingListItems).values({
        weeklyPlanId: planIdNum,
        ingredientId,
        source: "meal",
        checked: checked ?? false,
        removed: removed ?? false,
      }).run();
    }
  }

  return NextResponse.json({ success: true });
}
