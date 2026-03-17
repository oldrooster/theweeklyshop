"use client";

import { useEffect, useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { MealCard } from "@/components/meal-card";
import { MealForm } from "@/components/meal-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Plus, Search } from "lucide-react";

interface MealIngredient {
  id: number;
  quantity: number;
  unit: string;
  ingredientId: number;
  ingredientName: string;
  ingredientCategory: string;
}

interface Meal {
  id: number;
  name: string;
  category: string;
  serves: number;
  instructions: string | null;
  tags: string[];
  ingredients: MealIngredient[];
}

const CATEGORY_FILTERS = [
  { value: "", label: "All" },
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export default function MealsPage() {
  return (
    <Suspense fallback={<p className="text-muted-foreground text-center py-12">Loading...</p>}>
      <MealsPageContent />
    </Suspense>
  );
}

function MealsPageContent() {
  const searchParams = useSearchParams();
  const [meals, setMeals] = useState<Meal[]>([]);
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [showForm, setShowForm] = useState(searchParams.get("new") === "true");
  const [editingMeal, setEditingMeal] = useState<Meal | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchMeals = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (categoryFilter) params.set("category", categoryFilter);

    const res = await fetch(`/api/meals?${params}`);
    const data = await res.json();
    setMeals(data);
    setLoading(false);
  }, [search, categoryFilter]);

  useEffect(() => {
    fetchMeals();
  }, [fetchMeals]);

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this meal?")) return;
    await fetch(`/api/meals/${id}`, { method: "DELETE" });
    fetchMeals();
  };

  const handleEdit = (meal: Meal) => {
    setEditingMeal(meal);
    setShowForm(true);
  };

  const handleSave = () => {
    setShowForm(false);
    setEditingMeal(null);
    fetchMeals();
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingMeal(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Meal Library</h1>
        <Button onClick={() => setShowForm(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Meal
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search meals..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-1">
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
      </div>

      {loading ? (
        <p className="text-muted-foreground text-center py-12">Loading meals...</p>
      ) : meals.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground mb-4">
            {search || categoryFilter ? "No meals match your search." : "No meals yet. Add your first meal to get started!"}
          </p>
          {!search && !categoryFilter && (
            <Button onClick={() => setShowForm(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add Your First Meal
            </Button>
          )}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {meals.map((meal) => (
            <MealCard key={meal.id} meal={meal} onEdit={handleEdit} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <Dialog open={showForm} onOpenChange={(open) => { if (!open) handleCancel(); }}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingMeal ? "Edit Meal" : "Add New Meal"}</DialogTitle>
          </DialogHeader>
          <MealForm
            onSave={handleSave}
            onCancel={handleCancel}
            initial={
              editingMeal
                ? {
                    id: editingMeal.id,
                    name: editingMeal.name,
                    category: editingMeal.category,
                    serves: editingMeal.serves,
                    instructions: editingMeal.instructions || "",
                    ingredients: editingMeal.ingredients.map((i) => ({
                      ingredientName: i.ingredientName,
                      quantity: i.quantity,
                      unit: i.unit,
                    })),
                  }
                : undefined
            }
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
