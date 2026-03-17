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

### Docker (recommended)

```bash
docker build -t theweeklyshop .
docker run -p 3000:3000 -v theweeklyshop-data:/app/data theweeklyshop
```

Open [http://localhost:3000](http://localhost:3000).

The `-v` flag creates a named volume so your database persists across container restarts.

To enable receipt import, pass your API key:

```bash
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
