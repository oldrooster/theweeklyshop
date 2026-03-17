import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { ingredients } from "@/lib/schema";
import { eq, like } from "drizzle-orm";

export async function GET(request: NextRequest) {
  const db = getDb();
  const search = request.nextUrl.searchParams.get("search");
  const category = request.nextUrl.searchParams.get("category");

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
