import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ingredients, stapleItems, shoppingListItems } from "@/lib/schema";
import { eq } from "drizzle-orm";

interface ImportItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  action: "add_to_plan" | "add_staple" | "skip";
  planId?: number;
}

// POST: Confirm and save imported items
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { items } = body as { items: ImportItem[] };

  let created = 0;
  let staples = 0;
  let planItems = 0;

  for (const item of items) {
    if (item.action === "skip") continue;

    // Find or create the ingredient
    let ingredient = db
      .select()
      .from(ingredients)
      .where(eq(ingredients.name, item.name))
      .get();

    if (!ingredient) {
      db.insert(ingredients).values({
        name: item.name,
        category: item.category as typeof ingredients.$inferInsert.category,
        defaultUnit: item.unit,
      }).run();
      ingredient = db.select().from(ingredients).where(eq(ingredients.name, item.name)).get()!;
      created++;
    }

    if (item.action === "add_staple") {
      // Check if already a staple
      const existing = db
        .select()
        .from(stapleItems)
        .where(eq(stapleItems.ingredientId, ingredient.id))
        .get();

      if (!existing) {
        const stapleCat = item.category === "household" ? "household" : item.category === "bathroom" ? "bathroom" : "staple";
        db.insert(stapleItems).values({
          ingredientId: ingredient.id,
          defaultQuantity: item.quantity,
          unit: item.unit,
          category: stapleCat as typeof stapleItems.$inferInsert.category,
        }).run();
        staples++;
      }
    } else if (item.action === "add_to_plan" && item.planId) {
      db.insert(shoppingListItems).values({
        weeklyPlanId: item.planId,
        ingredientId: ingredient.id,
        quantity: item.quantity,
        unit: item.unit,
        source: "manual",
        customName: item.name,
      }).run();
      planItems++;
    }
  }

  return NextResponse.json({
    created,
    staples,
    planItems,
    total: created + staples + planItems,
  });
}
