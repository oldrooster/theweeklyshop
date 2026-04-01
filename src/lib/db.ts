import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import * as schema from "./schema";
import path from "path";

const DB_PATH = path.join(process.cwd(), "data", "weekly-shop.db");

function getDatabase() {
  const fs = require("fs");
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const sqlite = new Database(DB_PATH);
  sqlite.pragma("journal_mode = WAL");
  sqlite.pragma("foreign_keys = ON");

  return drizzle(sqlite, { schema });
}

// Singleton for the database connection
let _db: ReturnType<typeof getDatabase> | null = null;

export function getDb() {
  if (!_db) {
    _db = getDatabase();
    initializeDatabase();
  }
  return _db;
}

function initializeDatabase() {
  const db = _db!;
  // Create tables using raw SQL (Drizzle push handles this in dev, but we want it self-bootstrapping)
  const sqlite = (db as unknown as { $client: Database.Database }).$client;

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS households (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS household_members (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER NOT NULL REFERENCES households(id) ON DELETE CASCADE,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'adult' CHECK (type IN ('adult', 'child')),
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      category TEXT NOT NULL DEFAULT 'other' CHECK (category IN ('produce', 'dairy', 'meat', 'bakery', 'frozen', 'pantry', 'household', 'bathroom', 'snacks', 'drinks', 'other')),
      default_unit TEXT NOT NULL DEFAULT 'pieces',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL DEFAULT 'dinner' CHECK (category IN ('breakfast', 'lunch', 'dinner', 'snack')),
      serves INTEGER NOT NULL DEFAULT 4,
      instructions TEXT,
      tags TEXT DEFAULT '[]',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS meal_ingredients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces'
    );

    CREATE TABLE IF NOT EXISTS weekly_plans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER REFERENCES households(id),
      week_start_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'completed')),
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_plan_meals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
      meal_id INTEGER NOT NULL REFERENCES meals(id) ON DELETE CASCADE,
      day_of_week INTEGER NOT NULL,
      meal_type TEXT NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
      servings_override INTEGER
    );

    CREATE TABLE IF NOT EXISTS staple_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      household_id INTEGER REFERENCES households(id),
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      default_quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces',
      category TEXT NOT NULL DEFAULT 'staple' CHECK (category IN ('staple', 'snack', 'household', 'bathroom'))
    );

    CREATE TABLE IF NOT EXISTS shopping_list_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      weekly_plan_id INTEGER NOT NULL REFERENCES weekly_plans(id) ON DELETE CASCADE,
      ingredient_id INTEGER REFERENCES ingredients(id),
      quantity REAL,
      unit TEXT,
      checked INTEGER NOT NULL DEFAULT 0,
      source TEXT NOT NULL DEFAULT 'manual' CHECK (source IN ('meal', 'staple', 'manual')),
      removed INTEGER NOT NULL DEFAULT 0,
      custom_name TEXT
    );

    CREATE TABLE IF NOT EXISTS brands (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS purchase_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      ingredient_id INTEGER NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
      brand_id INTEGER REFERENCES brands(id) ON DELETE SET NULL,
      quantity REAL NOT NULL,
      unit TEXT NOT NULL DEFAULT 'pieces',
      price REAL,
      currency TEXT DEFAULT 'NZD',
      purchased_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}
