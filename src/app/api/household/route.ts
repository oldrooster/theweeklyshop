import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { households, householdMembers } from "@/lib/schema";
import { eq } from "drizzle-orm";

// GET: Get the household (we use a single-household model)
export async function GET() {
  const db = getDb();
  const household = db.select().from(households).limit(1).get();

  if (!household) {
    return NextResponse.json(null);
  }

  const members = db.select().from(householdMembers).where(eq(householdMembers.householdId, household.id)).all();

  return NextResponse.json({ ...household, members });
}

// POST: Create or update the household
export async function POST(request: NextRequest) {
  const db = getDb();
  const body = await request.json();
  const { name, members } = body as {
    name: string;
    members: { name: string; type: "adult" | "child" }[];
  };

  if (!name?.trim()) {
    return NextResponse.json({ error: "Household name is required" }, { status: 400 });
  }

  let household = db.select().from(households).limit(1).get();

  if (household) {
    // Update existing
    db.update(households).set({ name: name.trim() }).where(eq(households.id, household.id)).run();
    // Delete old members and re-create
    db.delete(householdMembers).where(eq(householdMembers.householdId, household.id)).run();
  } else {
    // Create new
    db.insert(households).values({ name: name.trim() }).run();
    household = db.select().from(households).limit(1).get()!;
  }

  // Add members
  for (const member of members) {
    if (member.name.trim()) {
      db.insert(householdMembers).values({
        householdId: household.id,
        name: member.name.trim(),
        type: member.type,
      }).run();
    }
  }

  // Return updated
  const updatedMembers = db.select().from(householdMembers).where(eq(householdMembers.householdId, household.id)).all();

  return NextResponse.json({ ...household, members: updatedMembers });
}
