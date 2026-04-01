"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, Apple, Plus, Check, Star } from "lucide-react";

interface IngredientWithStats {
  id: number;
  name: string;
  category: string;
  defaultUnit: string;
  createdAt: string;
  mealCount: number;
  planCount: number;
  isStaple: boolean;
  lastPrice: number | null;
  lastCurrency: string | null;
  lastPurchasedAt: string | null;
  lastBrandName: string | null;
  purchaseCount: number;
}

const CATEGORY_FILTERS = [
  { value: "", label: "All" },
  { value: "produce", label: "Fruit & Veg" },
  { value: "dairy", label: "Dairy" },
  { value: "meat", label: "Meat" },
  { value: "bakery", label: "Bakery" },
  { value: "frozen", label: "Frozen" },
  { value: "pantry", label: "Pantry" },
  { value: "household", label: "Household" },
  { value: "bathroom", label: "Bathroom" },
  { value: "snacks", label: "Snacks" },
  { value: "drinks", label: "Drinks" },
  { value: "other", label: "Other" },
];

type SortOption = "most-used" | "alphabetical" | "newest";

export default function IngredientsPage() {
  const [ingredients, setIngredients] = useState<IngredientWithStats[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [sort, setSort] = useState<SortOption>("most-used");
  const [loading, setLoading] = useState(true);
  const [addedIds, setAddedIds] = useState<Set<number>>(new Set());
  const [currentPlanId, setCurrentPlanId] = useState<number | null>(null);

  const fetchIngredients = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ stats: "true" });
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);

    const res = await fetch(`/api/ingredients?${params}`);
    const data = await res.json();
    setIngredients(data);
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchIngredients();
  }, [fetchIngredients]);

  const ensurePlan = useCallback(async (): Promise<number> => {
    if (currentPlanId) return currentPlanId;

    // Get or create this week's plan
    const monday = getMonday();
    const res = await fetch(`/api/plans?week=${monday}`);
    const existing = await res.json();

    if (existing?.id) {
      setCurrentPlanId(existing.id);
      return existing.id;
    }

    // Create plan for this week
    const createRes = await fetch("/api/plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ weekStartDate: monday }),
    });
    const plan = await createRes.json();
    setCurrentPlanId(plan.id);
    return plan.id;
  }, [currentPlanId]);

  const handleAddToList = async (ingredient: IngredientWithStats) => {
    const planId = await ensurePlan();
    await fetch(`/api/plans/${planId}/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: ingredient.name,
        quantity: 1,
        unit: ingredient.defaultUnit,
      }),
    });
    setAddedIds((prev) => new Set(prev).add(ingredient.id));
  };

  const sorted = [...ingredients].sort((a, b) => {
    if (sort === "alphabetical") return a.name.localeCompare(b.name);
    if (sort === "newest") return b.createdAt.localeCompare(a.createdAt);
    // most-used: by total usage desc
    return (b.mealCount + b.planCount) - (a.mealCount + a.planCount);
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Apple className="h-8 w-8" />
          Ingredients
        </h1>
        <span className="text-sm text-muted-foreground">
          {ingredients.length} ingredient{ingredients.length !== 1 ? "s" : ""}
        </span>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search ingredients..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
          {(["most-used", "alphabetical", "newest"] as SortOption[]).map((s) => (
            <Button
              key={s}
              variant={sort === s ? "default" : "outline"}
              size="sm"
              onClick={() => setSort(s)}
            >
              {s === "most-used" ? "Most Used" : s === "alphabetical" ? "A–Z" : "Newest"}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 flex-wrap">
        {CATEGORY_FILTERS.map((f) => (
          <Button
            key={f.value}
            variant={categoryFilter === f.value ? "default" : "outline"}
            size="sm"
            onClick={() => setCategoryFilter(f.value)}
          >
            {f.label}
          </Button>
        ))}
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading ingredients...</p>
      ) : sorted.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            {search || categoryFilter ? "No ingredients match your search." : "No ingredients yet. They'll appear here as you add meals and import receipts."}
          </p>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-sm text-muted-foreground">
                <th className="py-2 px-3 font-medium">Name</th>
                <th className="py-2 px-3 font-medium hidden sm:table-cell">Category</th>
                <th className="py-2 px-3 font-medium text-center">Meals</th>
                <th className="py-2 px-3 font-medium text-right hidden md:table-cell">Last Price</th>
                <th className="py-2 px-3 font-medium hidden lg:table-cell">Last Bought</th>
                <th className="py-2 px-3 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((ing) => (
                <tr key={ing.id} className="border-b last:border-0 hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3">
                    <div className="flex items-center gap-2">
                      <span className="capitalize font-medium">{ing.name}</span>
                      {ing.isStaple && (
                        <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500 shrink-0" />
                      )}
                    </div>
                    <span className="text-xs text-muted-foreground sm:hidden capitalize">{ing.category}</span>
                  </td>
                  <td className="py-2 px-3 hidden sm:table-cell">
                    <span className="text-xs bg-muted px-2 py-0.5 rounded-full capitalize">{ing.category}</span>
                  </td>
                  <td className="py-2 px-3 text-center">
                    <span className={`text-sm ${ing.mealCount > 0 ? "font-medium" : "text-muted-foreground"}`}>
                      {ing.mealCount}
                    </span>
                  </td>
                  <td className="py-2 px-3 text-right hidden md:table-cell">
                    {ing.lastPrice != null ? (
                      <div>
                        <span className="text-sm font-medium">
                          {new Intl.NumberFormat("en-NZ", {
                            style: "currency",
                            currency: ing.lastCurrency || "NZD",
                          }).format(ing.lastPrice)}
                        </span>
                        {ing.purchaseCount > 1 && (
                          <span className="text-xs text-muted-foreground ml-1">×{ing.purchaseCount}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">—</span>
                    )}
                  </td>
                  <td className="py-2 px-3 hidden lg:table-cell">
                    {ing.lastPurchasedAt ? (
                      <div>
                        <span className="text-xs text-muted-foreground">
                          {new Date(ing.lastPurchasedAt).toLocaleDateString("en-NZ", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })}
                        </span>
                        {ing.lastBrandName && (
                          <span className="block text-xs text-muted-foreground/70">{ing.lastBrandName}</span>
                        )}
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Never imported</span>
                    )}
                  </td>
                  <td className="py-2 px-3 text-right">
                    <Button
                      variant={addedIds.has(ing.id) ? "ghost" : "outline"}
                      size="sm"
                      className="h-7 text-xs"
                      onClick={() => handleAddToList(ing)}
                      disabled={addedIds.has(ing.id)}
                    >
                      {addedIds.has(ing.id) ? (
                        <>
                          <Check className="h-3 w-3 mr-1" />
                          Added
                        </>
                      ) : (
                        <>
                          <Plus className="h-3 w-3 mr-1" />
                          Add to list
                        </>
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}
