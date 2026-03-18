"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlanBoard } from "@/components/plan-board";
import { QuickAddInput } from "@/components/quick-add-input";
import { getMonday, addWeeks, formatWeekRange, type MealType } from "@/lib/week-utils";
import { ChevronLeft, ChevronRight, Copy, CalendarDays, ShoppingBasket, ShoppingCart, Loader2 } from "lucide-react";
import Link from "next/link";

interface PlanMeal {
  id: number;
  dayOfWeek: number;
  mealType: string;
  mealId: number;
  mealName: string;
  mealServes: number;
  servingsOverride: number | null;
}

interface QuickAddItem {
  id: number;
  customName: string | null;
  ingredientId: number | null;
  quantity: number | null;
  unit: string | null;
}

interface Plan {
  id: number;
  weekStartDate: string;
  status: string;
  meals: PlanMeal[];
  quickAddItems: QuickAddItem[];
}

export default function PlanPage() {
  const [weekStart, setWeekStart] = useState("");
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialize weekStart on client only to avoid hydration mismatch
  useEffect(() => {
    setWeekStart(getMonday());
  }, []);
  const [copying, setCopying] = useState(false);

  const fetchOrCreatePlan = useCallback(async (week: string) => {
    setLoading(true);

    // Try to get existing plan
    const res = await fetch(`/api/plans?week=${week}`);
    let data = await res.json();

    if (!data) {
      // Create a new plan for this week
      const createRes = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: week }),
      });
      data = await createRes.json();
      data.meals = [];
      data.quickAddItems = [];
    }

    // If we only got the basic plan (from list endpoint), fetch full details
    if (data && !data.meals) {
      const fullRes = await fetch(`/api/plans/${data.id}`);
      data = await fullRes.json();
    }

    setPlan({ ...data, meals: data.meals ?? [], quickAddItems: data.quickAddItems ?? [] });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (weekStart) fetchOrCreatePlan(weekStart);
  }, [weekStart, fetchOrCreatePlan]);

  const handleAssignMeal = async (dayOfWeek: number, mealType: MealType, mealId: number) => {
    if (!plan) return;

    await fetch(`/api/plans/${plan.id}/meals`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mealId, dayOfWeek, mealType }),
    });

    fetchOrCreatePlan(weekStart);
  };

  const handleRemoveMeal = async (dayOfWeek: number, mealType: MealType) => {
    if (!plan) return;

    await fetch(`/api/plans/${plan.id}/meals?day=${dayOfWeek}&type=${mealType}`, {
      method: "DELETE",
    });

    fetchOrCreatePlan(weekStart);
  };

  const handleCopyLastWeek = async () => {
    const lastWeek = addWeeks(weekStart, -1);

    // Find last week's plan
    const res = await fetch(`/api/plans?week=${lastWeek}`);
    const lastPlan = await res.json();

    if (!lastPlan) {
      alert("No plan found for last week.");
      return;
    }

    setCopying(true);

    // Ensure current week has a plan
    if (!plan) {
      await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: weekStart }),
      });
    }

    // Get the last plan's full ID to copy from
    const lastFullRes = await fetch(`/api/plans?week=${lastWeek}`);
    const lastFull = await lastFullRes.json();

    await fetch(`/api/plans/${lastFull.id}/copy`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ targetWeekStart: weekStart }),
    });

    await fetchOrCreatePlan(weekStart);
    setCopying(false);
  };

  const handleQuickAdd = async (name: string, quantity?: number, unit?: string) => {
    if (!plan) return;

    await fetch(`/api/plans/${plan.id}/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity, unit }),
    });

    fetchOrCreatePlan(weekStart);
  };

  const handleQuickRemove = async (itemId: number) => {
    if (!plan) return;

    await fetch(`/api/plans/${plan.id}/quick-add?itemId=${itemId}`, {
      method: "DELETE",
    });

    fetchOrCreatePlan(weekStart);
  };

  const isCurrentWeek = weekStart !== "" && weekStart === getMonday();

  return (
    <div className="space-y-6">
      {/* Week navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <CalendarDays className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          Weekly Plan
        </h1>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, -1))}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant={isCurrentWeek ? "default" : "outline"}
            onClick={() => setWeekStart(getMonday())}
            className="min-w-[140px] sm:min-w-[180px] text-xs sm:text-sm"
          >
            {formatWeekRange(weekStart)}
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekStart(addWeeks(weekStart, 1))}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap gap-2">
        <Button variant="outline" onClick={handleCopyLastWeek} disabled={copying}>
          {copying ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Copy className="h-4 w-4 mr-2" />}
          Copy Last Week
        </Button>
        {plan && plan.meals.length > 0 && (
          <Link href={`/list/${plan.id}`}>
            <Button>
              <ShoppingCart className="h-4 w-4 mr-2" />
              Generate Shopping List
            </Button>
          </Link>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : plan ? (
        <div className="space-y-8">
          {/* Meal plan board */}
          <Card>
            <CardHeader>
              <CardTitle>Meals</CardTitle>
            </CardHeader>
            <CardContent>
              <PlanBoard
                planId={plan.id}
                meals={plan.meals}
                onAssignMeal={handleAssignMeal}
                onRemoveMeal={handleRemoveMeal}
              />
            </CardContent>
          </Card>

          {/* Quick add section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingBasket className="h-5 w-5 text-primary" />
                Quick Add Items
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Add any items directly to your shopping list — things not tied to a specific meal.
              </p>
            </CardHeader>
            <CardContent>
              <QuickAddInput
                planId={plan.id}
                items={plan.quickAddItems}
                onAdd={handleQuickAdd}
                onRemove={handleQuickRemove}
              />
            </CardContent>
          </Card>

          {/* Summary */}
          <Card>
            <CardHeader>
              <CardTitle>Plan Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center">
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {plan.meals.filter((m) => m.mealType === "breakfast").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Breakfasts</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {plan.meals.filter((m) => m.mealType === "lunch").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Lunches</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {plan.meals.filter((m) => m.mealType === "dinner").length}
                  </div>
                  <div className="text-sm text-muted-foreground">Dinners</div>
                </div>
                <div>
                  <div className="text-2xl font-bold text-primary">
                    {plan.quickAddItems.length}
                  </div>
                  <div className="text-sm text-muted-foreground">Extra Items</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
