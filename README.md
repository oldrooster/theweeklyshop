# The Weekly Shop

A meal planning and grocery list app for households. Plan your weekly meals, manage staple items, generate consolidated shopping lists, and import receipts with AI.

Built with Next.js, TypeScript, SQLite, and Tailwind CSS.

## Features

- **Meal Library** — Create and manage meals with ingredients, portions, and instructions
- **Weekly Planner** — Drag meals onto a 7-day board across breakfast, lunch, dinner, and snacks
- **Shopping List** — Auto-generated from your meal plan with ingredient aggregation and unit conversion. Review mode lets you check off items you already have; final mode shows what to buy
- **Staples & Household** — Manage recurring items (milk, bread, cleaning supplies) that auto-appear on every list
- **Receipt Import** — Upload a photo or PDF of a grocery receipt; Claude extracts and categorises items for you
- **Household Profile** — Set up who lives in your household to help with portions
- **Data Export** — Download a full JSON backup of all your data

## Getting Started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

The SQLite database is created automatically in `data/weekly-shop.db` on first run.

### Receipt Import (optional)

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
| Deployment | Self-hosted (Node.js) |

## Project Structure

```
src/
├── app/              # Next.js pages and API routes
│   ├── api/          # REST endpoints (meals, plans, lists, staples, import, export, household)
│   ├── import/       # Receipt import page
│   ├── list/[planId] # Shopping list page
│   ├── meals/        # Meal library
│   ├── plan/         # Weekly planner
│   ├── settings/     # Household profile & data export
│   └── staples/      # Staple items management
├── components/       # React components (plan-board, meal-card, shopping-list, etc.)
└── lib/              # Database, schema, aggregator, unit conversion utilities
```

## Scripts

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run start    # Start production server
npm run lint     # Run ESLint
```
