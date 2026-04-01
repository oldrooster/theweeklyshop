import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sql } from "drizzle-orm";

// GET: Return recent purchase history grouped by ingredient
// Returns the most recently purchased instance of each ingredient
export async function GET(request: NextRequest) {
  const db = getDb();
  const limit = parseInt(request.nextUrl.searchParams.get("limit") || "50");

  // Get latest purchase per ingredient, with brand name and total purchase count
  const rows = db.all(sql`
    SELECT
      ph.id,
      ph.ingredient_id as ingredientId,
      i.name as ingredientName,
      i.category,
      i.default_unit as defaultUnit,
      ph.brand_id as brandId,
      b.name as brandName,
      ph.quantity,
      ph.unit,
      ph.price,
      ph.currency,
      ph.purchased_at as purchasedAt,
      COALESCE(cnt.purchase_count, 1) as purchaseCount
    FROM purchase_history ph
    INNER JOIN ingredients i ON i.id = ph.ingredient_id
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
    ORDER BY ph.purchased_at DESC
    LIMIT ${limit}
  `) as Array<{
    id: number;
    ingredientId: number;
    ingredientName: string;
    category: string;
    defaultUnit: string;
    brandId: number | null;
    brandName: string | null;
    quantity: number;
    unit: string;
    price: number | null;
    currency: string;
    purchasedAt: string;
    purchaseCount: number;
  }>;

  return NextResponse.json(rows);
}
