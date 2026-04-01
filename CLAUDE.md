# CLAUDE.md — The Weekly Shop

This file provides guidance for Claude Code when working in this repository.

## Project Overview

A self-hosted household meal planning and shopping list app. Single household, no auth. The app is intentionally simple and direct — avoid adding abstractions, configuration layers, or generality beyond what the current feature requires.

## Tech Stack

- **Next.js 16** with App Router and TypeScript
- **SQLite** via `better-sqlite3` + **Drizzle ORM** (schema-first, no migrations — tables are created in `initializeDatabase()` inside `src/lib/db.ts`)
- **Tailwind CSS v4** + **shadcn/ui** components
- **Claude API** (Sonnet) for receipt parsing and meal generation

## Key Conventions

### Database

- All tables are defined in `src/lib/schema.ts` (Drizzle) and also as raw `CREATE TABLE IF NOT EXISTS` SQL in `src/lib/db.ts`.
- **When adding a table, update both files.** The raw SQL in `db.ts` is what actually creates tables at runtime (self-bootstrapping, no migration tool needed). The Drizzle schema in `schema.ts` is used for type-safe queries.
- Use `getDb()` to get the singleton DB connection. Never create a new connection.
- Drizzle queries use `.all()` for multiple rows, `.get()` for a single row, `.run()` for mutations.
- For complex queries (JOINs, aggregation), use `db.all(sql`...`)` with tagged template literals.

### API Routes

- All API routes are in `src/app/api/`. Each folder has a `route.ts`.
- Use `NextRequest` / `NextResponse`.
- Route params are accessed via `{ params }: { params: Promise<{ id: string }> }` — always `await params`.
- Return 404 with `{ error: "..." }` if resource not found, 400 for bad input.

### Ingredients vs Brands

- **Ingredients** (`src/lib/schema.ts` → `ingredients`) store the base cooking ingredient — no brand prefix. E.g. `"plain flour"`, not `"Pams plain flour"`.
- **Brands** (`brands`) store brand names separately.
- **Purchase history** (`purchase_history`) links ingredient + brand + price + date. This is the source of truth for what was actually bought.
- The import Claude prompt is designed to strip brands from ingredient names — keep it that way.

### Shopping List

- The list for a plan is generated dynamically in `src/app/api/lists/[planId]/route.ts` by aggregating meal ingredients + staples. No pre-generated list is stored (except checked/removed state and manual items in `shopping_list_items`).
- Manual items added via quick-add are stored in `shopping_list_items` with `source: "manual"`.
- Checked/removed state for aggregated (meal) items is also stored in `shopping_list_items` with `source: "meal"`.

### Units

- Unit conversion logic lives in `src/lib/units.ts`. Before adding new units, check what's already there.
- The aggregator in `src/lib/aggregator.ts` handles grouping and converting ingredient quantities across meals.

### Components

- UI primitives (Button, Card, Input, etc.) come from `src/components/ui/` — use these, don't create new base components.
- Keep client components (`"use client"`) for interactive pages; API routes and server utilities are server-only.

## Development

```bash
npm install
npm run dev        # http://localhost:3000
```

SQLite DB is auto-created at `data/weekly-shop.db` on first run.

Set `ANTHROPIC_API_KEY` in `.env.local` for receipt import and AI meal generation.

## Docker

```bash
docker build -t theweeklyshop .
docker run -p 3000:3000 -v theweeklyshop-data:/app/data -e ANTHROPIC_API_KEY=sk-ant-... theweeklyshop
```

The Dockerfile uses a 3-stage build (deps → builder → runner) with Next.js standalone output. `better-sqlite3` is a native addon — `python3 make g++` are needed at build time; `libstdc++` is needed at runtime. The container runs as root so bind mounts work without UID mapping.

## What to Avoid

- Don't add auth or multi-tenancy — this is a single-household app.
- Don't use Drizzle `push` or migration commands — the `initializeDatabase()` function in `db.ts` is the only migration mechanism. Add new `CREATE TABLE IF NOT EXISTS` statements there.
- Don't add brand names into the `ingredients.name` field.
- Don't add error handling for cases that can't happen.
- Don't add backwards-compatibility shims when you can just change the code.
