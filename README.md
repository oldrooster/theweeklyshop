# The Weekly Shop

A meal planning and grocery list app for households. Plan your weekly meals, manage staple items, generate consolidated shopping lists, and import receipts with AI.

Built with Next.js, TypeScript, SQLite, and Tailwind CSS.

## Features

- **Meal Library** — Create and manage meals with ingredients, portions, and instructions
- **Weekly Planner** — Assign meals to a 7-day board across breakfast, lunch, dinner, and snacks
- **Shopping List** — Auto-generated from your meal plan with ingredient aggregation and unit conversion. Review mode lets you check off items you already have; final mode shows what to buy. Meal badges show which meal each item came from.
- **Purchase History** — Import receipts to track what you paid and when. Brands are stored separately from base ingredients (e.g. "Pams" + "plain flour"). Price history and last purchase date appear on the ingredients page.
- **Add from History** — On the shopping list page, browse your purchase history and add past items to this week's list with one click.
- **Staples & Household** — Manage recurring items (milk, bread, cleaning supplies) that auto-appear on every list
- **Receipt Import** — Upload a photo or PDF of a grocery receipt; Claude extracts items, strips brand names, and records prices and quantities
- **Household Profile** — Set up who lives in your household to help with portions
- **Data Export** — Download a full JSON backup of all your data

## Getting Started

### Docker Compose (recommended)

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
docker compose up
```

Open [http://localhost:3000](http://localhost:3000).

The database is stored in a named Docker volume (`theweeklyshop-data`) and persists across restarts. To rebuild after code changes:

```bash
docker compose up --build
```

### Docker (manual)

```bash
docker build -t theweeklyshop .
docker run -p 3000:3000 \
  -v theweeklyshop-data:/app/data \
  -e ANTHROPIC_API_KEY=sk-ant-... \
  theweeklyshop
```

### Local development

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically in `data/weekly-shop.db` on first run.

To use the receipt import feature, add your Anthropic API key:

```bash
echo "ANTHROPIC_API_KEY=sk-ant-..." > .env.local
```

## Tech Stack

| Layer | Choice |
|-------|--------|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Database | SQLite via better-sqlite3 + Drizzle ORM |
| Styling | Tailwind CSS + shadcn/ui |
| Receipt parsing | Claude API (Sonnet) |
| Container | Docker (standalone Next.js build) |
| Deployment | Self-hosted (Node.js or Docker) |

## Project Structure

```
src/
├── app/
│   ├── api/
│   │   ├── export/           # JSON data backup
│   │   ├── household/        # Household profile
│   │   ├── import/           # Receipt upload + Claude parsing
│   │   │   └── confirm/      # Save extracted items
│   │   ├── ingredients/      # Ingredient CRUD + stats
│   │   ├── lists/[planId]/   # Shopping list generation + check/remove state
│   │   ├── meals/            # Meal CRUD + Claude generation
│   │   │   └── [id]/
│   │   ├── plans/            # Weekly plan CRUD
│   │   │   └── [id]/
│   │   ├── purchase-history/ # Recent purchases per ingredient
│   │   └── staples/          # Staple items
│   ├── import/               # Receipt import UI
│   ├── ingredients/          # Ingredients directory with price history
│   ├── list/
│   │   ├── page.tsx          # Redirects to current week's list
│   │   └── [planId]/         # Shopping list for a specific plan
│   ├── meals/                # Meal library
│   ├── plan/                 # Weekly planner board
│   ├── settings/             # Household profile & data export
│   └── staples/              # Staple items management
├── components/               # React components
│   ├── ui/                   # shadcn/ui base components
│   ├── meal-card.tsx
│   ├── meal-form.tsx
│   ├── meal-selector.tsx
│   ├── mobile-nav.tsx
│   ├── plan-board.tsx
│   ├── quick-add-input.tsx
│   └── shopping-list.tsx
└── lib/
    ├── aggregator.ts         # Ingredient quantity aggregation + unit conversion
    ├── db.ts                 # SQLite singleton + schema initialisation
    ├── schema.ts             # Drizzle table definitions
    ├── units.ts              # Unit conversion utilities
    └── week-utils.ts         # Date/week helpers
```

## Database Schema

| Table | Purpose |
|-------|---------|
| `households` | Single household record |
| `household_members` | Adults and children |
| `ingredients` | Base ingredient names (no brands) |
| `brands` | Brand names linked to purchase records |
| `purchase_history` | Each imported item with price, brand, date |
| `meals` | Recipes with serves and instructions |
| `meal_ingredients` | Ingredient quantities per meal |
| `weekly_plans` | One plan per week |
| `weekly_plan_meals` | Meals assigned to day/type slots |
| `staple_items` | Recurring items added to every list |
| `shopping_list_items` | Checked/removed state + manual adds |

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
