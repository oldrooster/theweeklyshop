# The Weekly Shop - Architecture Plan

## Overview

A web-based grocery planning app that helps a household plan weekly meals, build shopping lists from ingredients, manage a personal recipe/meal database, and import past orders from PDF receipts.

---

## Technology Choices & Justifications

### Next.js 14 + TypeScript
- **Why**: Full-stack framework — API routes, server components, and UI in one project. No need to manage separate frontend/backend repos or deployments. TypeScript catches bugs at compile time, which matters when dealing with unit conversions and quantity aggregation logic.
- **Alternative rejected**: Separate React + Express would add deployment complexity for a personal-use app with no benefit.

### SQLite via better-sqlite3
- **Why**: Zero-infrastructure database. No Docker containers, no cloud services, no accounts. The entire database is a single file. Perfect for a self-hosted personal app. SQLite handles concurrent reads well and writes are fast for single-user scenarios.
- **Why not Prisma**: Prisma adds a heavy abstraction layer. For a personal app with ~8 tables, raw SQL with a thin wrapper (Drizzle ORM) gives better performance, smaller bundle, and more control.
- **ORM: Drizzle** — Lightweight, type-safe, works natively with better-sqlite3. Schema defined in TypeScript, migrations are simple SQL files.

### Tailwind CSS + shadcn/ui
- **Why**: Utility-first CSS avoids stylesheet bloat. shadcn/ui provides accessible, unstyled components (dialogs, dropdowns, tabs) that we own (copied into the project, not a dependency). This means no version lock-in and full customization.
- **Alternative rejected**: Full component libraries like MUI or Chakra add heavy dependencies and opinionated styling that fights customization.

### Claude API for PDF parsing
- **Why**: Grocery receipts vary wildly in format — supermarket-specific layouts, scanned images vs digital text, different languages/currencies. An LLM handles all of this without writing brittle parsers per retailer. Claude's vision capabilities handle scanned/image PDFs directly.
- **Integration**: Server-side API route calls Claude. The PDF never leaves the server. User's API key stored in a local config file.

---

## Database Schema

```
households
  id, name, created_at

household_members
  id, household_id, name, type (adult/child), created_at

meals
  id, name, category (dinner/lunch/breakfast/snack), serves,
  instructions (text), tags (json), created_at, updated_at

meal_ingredients
  id, meal_id, ingredient_id, quantity, unit

ingredients
  id, name, category (produce/dairy/meat/bakery/frozen/pantry/household/bathroom/snacks),
  default_unit, created_at

weekly_plans
  id, household_id, week_start_date, status (draft/active/completed),
  created_at, updated_at

weekly_plan_meals
  id, weekly_plan_id, meal_id, day_of_week (0-6), meal_type (breakfast/lunch/dinner/snack),
  servings_override

staple_items
  id, household_id, ingredient_id, default_quantity, unit, category (staple/snack/household/bathroom)

shopping_list_items
  id, weekly_plan_id, ingredient_id (nullable), quantity, unit, checked (boolean),
  source (meal/staple/manual), removed (boolean),
  custom_name (nullable — used when source='manual' and item doesn't match an existing ingredient)
```

**Key decisions:**
- Ingredients are a shared lookup table — meals reference them, so aggregation works ("chicken breast" from two meals = one combined entry).
- `shopping_list_items.removed` tracks items the user already has at home (requirement #10) without deleting them, so they can be restored.
- `staple_items` stores the household's recurring items (milk, eggs, etc.) — added to every list automatically.
- `weekly_plans` has status so you can clone last week's plan (the "quick mode" feature).
- `shopping_list_items.source = 'manual'` supports freeform items added directly by the user — not tied to any meal or staple.

---

## Application Structure

```
/src
  /app
    /page.tsx                    — Dashboard (main view)
    /meals
      /page.tsx                  — Meal library (browse, search, add)
      /[id]/page.tsx             — Single meal view/edit
    /plan
      /page.tsx                  — Weekly plan builder
      /[id]/page.tsx             — View/edit specific week's plan
    /list
      /[planId]/page.tsx         — Shopping list (consolidated, checkable)
    /settings
      /page.tsx                  — Household setup, API key config
    /import
      /page.tsx                  — PDF receipt upload & parsing
    /api
      /meals/route.ts            — CRUD meals
      /ingredients/route.ts      — CRUD ingredients
      /plans/route.ts            — CRUD weekly plans
      /lists/route.ts            — Generate & manage shopping lists
      /import/route.ts           — PDF upload + Claude parsing
      /staples/route.ts          — Manage staple items
      /household/route.ts        — Household config
  /lib
    /db.ts                       — Database connection & setup
    /schema.ts                   — Drizzle schema definitions
    /aggregator.ts               — Ingredient quantity aggregation logic
    /units.ts                    — Unit conversion (g↔kg, ml↔l, etc.)
    /pdf-parser.ts               — Claude API integration for receipts
  /components
    /ui/                         — shadcn/ui components
    /meal-card.tsx               — Meal display card
    /meal-form.tsx               — Add/edit meal form
    /ingredient-input.tsx        — Ingredient autocomplete + quantity
    /plan-board.tsx              — Weekly meal planner grid (7 days × 4 meal types)
    /shopping-list.tsx           — Checkable shopping list
    /quick-add-input.tsx         — Freeform item input with autocomplete
    /section-panel.tsx           — Collapsible dashboard section
    /pdf-upload.tsx              — Drag-and-drop PDF upload
```

---

## Core Flows

### Flow 1: Weekly Planning (Dashboard)

The dashboard shows a single-page view with collapsible sections:

1. **Week selector** — Pick the week (defaults to current). Option to "Copy last week" (quick mode).
2. **Dinners section** — 7 slots (Mon–Sun). Search/pick from meal library or add new.
3. **Lunches section** — Same 7 slots. Common options: rolls, sandwiches, soup, leftovers.
4. **Breakfasts section** — 7 slots. Often repeating (porridge Mon–Fri, pancakes Sat–Sun).
5. **Snacks section** — Not day-specific. Pick snack items for the week.
6. **Staples section** — Pre-populated from household defaults. Toggle on/off per week.
7. **Household section** — Bathroom, laundry, cleaning items. Toggle on/off.
8. **Quick Add section** — Freeform text input to add any item directly (e.g. "birthday cake", "cat food"). Type a name, optionally set quantity, and it goes straight onto the list. Autocompletes against existing ingredients but also allows completely new items.
9. **Generate List** button — Aggregates all ingredients → shopping list.

### Flow 2: Shopping List

1. System aggregates all ingredients from selected meals + staples + household items.
2. Smart quantity aggregation: "400g chicken (Meal A) + 300g chicken (Meal B) = 700g chicken".
3. Items grouped by store category (produce, dairy, meat, frozen, etc.).
4. User reviews list — checkboxes to mark "already have this" (requirement #10).
5. User can also quick-add freeform items directly on the list at any time.
6. Unchecked items = final shopping list.
7. Can print or view on mobile in store.

### Flow 3: Meal Library

1. Browse all saved meals with search and category filter.
2. Add new meal: name, category, servings, ingredients (with autocomplete), instructions.
3. Edit/delete existing meals.
4. Meals are reusable — pick them week after week.

### Flow 4: Quick Add (Freeform Items)

1. Available both on the dashboard during planning AND directly on the shopping list.
2. Text input with autocomplete against existing ingredients.
3. If the item matches an existing ingredient, it links to it (enabling smart aggregation with meal-derived items).
4. If no match, it's stored as a `custom_name` — a one-off item on this week's list.
5. User can optionally set quantity and unit, or just type "cat food" and leave it unquantified.
6. Freeform items appear in the shopping list under an "Other" category (or matched category if linked to an ingredient).

### Flow 5: PDF Import

1. Upload a PDF receipt (drag and drop or file picker).
2. Server sends PDF to Claude API with a structured prompt.
3. Claude extracts: item names, quantities, categories.
4. User reviews extracted items — maps them to existing ingredients or creates new ones.
5. Option to auto-create meals from grouped items or just add items to ingredient database.

---

## Unit Conversion & Aggregation Logic

The aggregator handles:
- Same unit: 200g + 300g = 500g
- Convertible units: 500g + 1kg = 1.5kg (display in larger unit when threshold crossed)
- Count items: 2 eggs + 3 eggs = 5 eggs
- Incompatible units: listed separately with a warning

Supported units: g, kg, ml, l, tsp, tbsp, cup, pieces/count, slices, rashers, fillets.

---

## Phases of Implementation

### Phase 1: Foundation
- Next.js project setup with TypeScript, Tailwind, shadcn/ui
- SQLite database with Drizzle ORM, migrations
- Ingredient & meal CRUD (API routes + UI)
- Basic meal form with ingredient input

### Phase 2: Weekly Planning
- Weekly plan builder (dashboard with sections)
- Day-slot meal assignment
- Breakfast, lunch, dinner, snack sections
- Copy-last-week quick mode

### Phase 3: Shopping List
- Ingredient aggregation engine
- Unit conversion
- Consolidated shopping list view
- "Already have" checkbox flow
- Final list view (printable)

### Phase 4: Staples & Household
- Staple items management
- Household/bathroom/cleaning items
- Auto-include in weekly lists

### Phase 5: PDF Import
- PDF upload UI
- Claude API integration
- Item extraction and review
- Mapping to existing ingredients

### Phase 6: Polish
- Mobile-responsive design
- Household profile setup
- Data export/backup
- Search and filtering improvements

---

## Key Architectural Decisions Summary

| Decision | Choice | Why |
|----------|--------|-----|
| Framework | Next.js 14 App Router | Single deployable, API + UI together |
| Database | SQLite + Drizzle | Zero infrastructure, single file, type-safe |
| Styling | Tailwind + shadcn/ui | Fast, customizable, no heavy dependencies |
| PDF parsing | Claude API | Handles any receipt format, including images |
| State management | Server components + React state | No Redux/Zustand needed — data lives in DB |
| Deployment | Self-hosted (Node.js) | Matches SQLite choice, runs on any machine |
