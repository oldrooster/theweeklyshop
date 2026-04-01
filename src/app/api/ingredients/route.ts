import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ingredients } from "@/lib/schema";
import { eq, like, sql } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const db = getDb();
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");
  const stats = request.nextUrl.searchParams.get("stats");

  if (stats === "true") {
    const rows = db.all(sql`
      SELECT
        i.id, i.name, i.category, i.default_unit as defaultUnit, i.created_at as createdAt,
        COALESCE(mc.meal_count, 0) as mealCount,
        COALESCE(pc.plan_count, 0) as planCount,
        CASE WHEN s.ingredient_id IS NOT NULL THEN 1 ELSE 0 END as isStaple,
        lp.price as lastPrice,
        lp.currency as lastCurrency,
        lp.purchased_at as lastPurchasedAt,
        lp.brand_name as lastBrandName,
        COALESCE(lp.purchase_count, 0) as purchaseCount
      FROM ingredients i
      LEFT JOIN (
        SELECT ingredient_id, COUNT(DISTINCT meal_id) as meal_count
        FROM meal_ingredients
        GROUP BY ingredient_id
      ) mc ON mc.ingredient_id = i.id
      LEFT JOIN (
        SELECT ingredient_id, COUNT(DISTINCT weekly_plan_id) as plan_count
        FROM shopping_list_items
        WHERE ingredient_id IS NOT NULL
        GROUP BY ingredient_id
      ) pc ON pc.ingredient_id = i.id
      LEFT JOIN (
        SELECT DISTINCT ingredient_id
        FROM staple_items
      ) s ON s.ingredient_id = i.id
      LEFT JOIN (
        SELECT
          ph.ingredient_id,
          ph.price,
          ph.currency,
          ph.purchased_at,
          b.name as brand_name,
          COALESCE(cnt.purchase_count, 1) as purchase_count
        FROM purchase_history ph
        LEFT JOIN brands b ON b.id = ph.brand_id
        LEFT JOIN (
          SELECT ingredient_id, COUNT(*) as purchase_count
          FROM purchase_history
          GROUP BY ingredient_id
        ) cnt ON cnt.ingredient_id = ph.ingredient_id
        WHERE ph.id IN (
          SELECT id FROM purchase_history ph2
          WHERE ph2.ingredient_id = ph.ingredient_id
          ORDER BY ph2.purchased_at DESC
          LIMIT 1
        )
      ) lp ON lp.ingredient_id = i.id
      ORDER BY (COALESCE(mc.meal_count, 0) + COALESCE(pc.plan_count, 0)) DESC, i.name ASC
    `);

    let filtered = rows as Record<string, unknown>[];
    if (search) {
      const s = search.toLowerCase();
      filtered = filtered.filter((r) => (r.name as string).includes(s));
    }
    if (category) {
      filtered = filtered.filter((r) => r.category === category);
    }

    return NextResponse.json(filtered.map((r) => ({
      ...r,
      isStaple: Boolean(r.isStaple),
    })));

  }

  let query = db.select().from(ingredients);

  if (search) {
    query = query.where(like(ingredients.name, `%${search}%`)) as typeof query;
  }
  if (category) {
    query = query.where(eq(ingredients.category, category as typeof ingredients.category.enumValues[number])) as typeof query;
  }

  const results = query.all();
  return NextResponse.json(results);
}

export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();

  const { name, category, defaultUnit } = body;

  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }

  try {
    const result = db.insert(ingredients).values({
      name: name.trim().toLowerCase(),
      category: category || "other",
      defaultUnit: defaultUnit || "pieces",
    }).returning().get();

    return NextResponse.json(result, { status: 201 });
  } catch (e: unknown) {
    if (e instanceof Error && e.message.includes("UNIQUE")) {
      return NextResponse.json({ error: "Ingredient already exists" }, { status: 409 });
    }
    throw e;
  }
}

export async function DELETE(request: NextRequest) {
  const db = getDb();
  const id = request.nextUrl.searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID is required" }, { status: 400 });
  }

  db.delete(ingredients).where(eq(ingredients.id, parseInt(id))).run();
  return NextResponse.json({ success: true });
}
