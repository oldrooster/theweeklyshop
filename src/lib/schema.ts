import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

export const households = sqliteTable("households", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const householdMembers = sqliteTable("household_members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").notNull().references(() => households.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type", { enum: ["adult", "child"] }).notNull().default("adult"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const ingredients = sqliteTable("ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  category: text("category", {
    enum: ["produce", "dairy", "meat", "bakery", "frozen", "pantry", "household", "bathroom", "snacks", "drinks", "other"],
  }).notNull().default("other"),
  defaultUnit: text("default_unit").notNull().default("pieces"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const meals = sqliteTable("meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  category: text("category", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  }).notNull().default("dinner"),
  serves: integer("serves").notNull().default(4),
  instructions: text("instructions"),
  tags: text("tags", { mode: "json" }).$type<string[]>().default([]),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const mealIngredients = sqliteTable("meal_ingredients", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("pieces"),
});

export const weeklyPlans = sqliteTable("weekly_plans", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").references(() => households.id),
  weekStartDate: text("week_start_date").notNull(),
  status: text("status", { enum: ["draft", "active", "completed"] }).notNull().default("draft"),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
  updatedAt: text("updated_at").default(sql`(datetime('now'))`).notNull(),
});

export const weeklyPlanMeals = sqliteTable("weekly_plan_meals", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weeklyPlanId: integer("weekly_plan_id").notNull().references(() => weeklyPlans.id, { onDelete: "cascade" }),
  mealId: integer("meal_id").notNull().references(() => meals.id, { onDelete: "cascade" }),
  dayOfWeek: integer("day_of_week").notNull(), // 0=Mon, 6=Sun
  mealType: text("meal_type", {
    enum: ["breakfast", "lunch", "dinner", "snack"],
  }).notNull(),
  servingsOverride: integer("servings_override"),
});

export const stapleItems = sqliteTable("staple_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  householdId: integer("household_id").references(() => households.id),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  defaultQuantity: real("default_quantity").notNull(),
  unit: text("unit").notNull().default("pieces"),
  category: text("category", {
    enum: ["staple", "snack", "household", "bathroom"],
  }).notNull().default("staple"),
});

export const shoppingListItems = sqliteTable("shopping_list_items", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  weeklyPlanId: integer("weekly_plan_id").notNull().references(() => weeklyPlans.id, { onDelete: "cascade" }),
  ingredientId: integer("ingredient_id").references(() => ingredients.id),
  quantity: real("quantity"),
  unit: text("unit"),
  checked: integer("checked", { mode: "boolean" }).notNull().default(false),
  source: text("source", { enum: ["meal", "staple", "manual"] }).notNull().default("manual"),
  removed: integer("removed", { mode: "boolean" }).notNull().default(false),
  customName: text("custom_name"),
});

export const brands = sqliteTable("brands", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull().unique(),
  createdAt: text("created_at").default(sql`(datetime('now'))`).notNull(),
});

export const purchaseHistory = sqliteTable("purchase_history", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  ingredientId: integer("ingredient_id").notNull().references(() => ingredients.id, { onDelete: "cascade" }),
  brandId: integer("brand_id").references(() => brands.id, { onDelete: "set null" }),
  quantity: real("quantity").notNull(),
  unit: text("unit").notNull().default("pieces"),
  price: real("price"),
  currency: text("currency").default("NZD"),
  purchasedAt: text("purchased_at").default(sql`(datetime('now'))`).notNull(),
});
