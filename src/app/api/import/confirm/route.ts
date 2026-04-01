import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ingredients, stapleItems, shoppingListItems, brands, purchaseHistory } from "@/lib/schema";
import { eq } from "drizzle-orm";

interface ImportItem {
  ingredient: string;
  brand: string | null;
  quantity: number;
  unit: string;
  category: string;
  price: number | null;
  currency: string;
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
  let historyRecords = 0;

  for (const item of items) {
    if (item.action === "skip") continue;

    // Find or create the base ingredient (without brand)
    const ingredientName = item.ingredient.trim().toLowerCase();
    let ingredient = db
      .select()
      .from(ingredients)
      .where(eq(ingredients.name, ingredientName))
      .get();

    if (!ingredient) {
      db.insert(ingredients).values({
        name: ingredientName,
        category: item.category as typeof ingredients.$inferInsert.category,
        defaultUnit: item.unit,
      }).run();
      ingredient = db.select().from(ingredients).where(eq(ingredients.name, ingredientName)).get()!;
      created++;
    }

    // Find or create the brand (if provided)
    let brandId: number | null = null;
    if (item.brand && item.brand.trim()) {
      const brandName = item.brand.trim();
      let brand = db.select().from(brands).where(eq(brands.name, brandName)).get();
      if (!brand) {
        db.insert(brands).values({ name: brandName }).run();
        brand = db.select().from(brands).where(eq(brands.name, brandName)).get()!;
      }
      brandId = brand.id;
    }

    // Always record purchase history
    db.insert(purchaseHistory).values({
      ingredientId: ingredient.id,
      brandId,
      quantity: item.quantity,
      unit: item.unit,
      price: item.price ?? null,
      currency: item.currency || "NZD",
    }).run();
    historyRecords++;

    if (item.action === "add_staple") {
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
        customName: ingredientName,
      }).run();
      planItems++;
    }
  }

  return NextResponse.json({
    created,
    staples,
    planItems,
    historyRecords,
    total: created + staples + planItems,
  });
}
