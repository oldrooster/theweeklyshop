"use client";

import { DAYS_SHORT, MEAL_TYPES, type MealType } from "@/lib/week-utils";
import { MealSelector } from "@/components/meal-selector";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

interface PlanMeal {
  id: number;
  dayOfWeek: number;
  mealType: string;
  mealId: number;
  mealName: string;
  mealServes: number;
  servingsOverride: number | null;
}

interface PlanBoardProps {
  planId: number;
  meals: PlanMeal[];
  onAssignMeal: (dayOfWeek: number, mealType: MealType, mealId: number) => void;
  onRemoveMeal: (dayOfWeek: number, mealType: MealType) => void;
}

const MEAL_TYPE_LABELS: Record<MealType, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

const MEAL_TYPE_COLORS: Record<MealType, string> = {
  breakfast: "bg-amber-50 border-amber-200",
  lunch: "bg-blue-50 border-blue-200",
  dinner: "bg-purple-50 border-purple-200",
  snack: "bg-green-50 border-green-200",
};

export function PlanBoard({ planId, meals, onAssignMeal, onRemoveMeal }: PlanBoardProps) {
  const getMeal = (day: number, type: MealType) => {
    return meals.find((m) => m.dayOfWeek === day && m.mealType === type);
  };

  return (
    <div className="space-y-6">
      {MEAL_TYPES.map((mealType) => (
        <div key={mealType} className="space-y-2">
          <h3 className="text-lg font-semibold">{MEAL_TYPE_LABELS[mealType]}</h3>
          {/* Desktop: 7-col grid. Mobile: horizontal scroll */}
          <div className="hidden md:grid grid-cols-7 gap-2">
            {DAYS_SHORT.map((day, dayIndex) => {
              const assigned = getMeal(dayIndex, mealType);
              return (
                <div
                  key={`${dayIndex}-${mealType}`}
                  className={`rounded-lg border p-2 min-h-[80px] flex flex-col ${
                    assigned ? MEAL_TYPE_COLORS[mealType] : "bg-muted/30"
                  }`}
                >
                  <span className="text-xs font-medium text-muted-foreground mb-1">{day}</span>
                  {assigned ? (
                    <div className="flex-1 flex items-start justify-between">
                      <span className="text-sm font-medium leading-tight">{assigned.mealName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-5 w-5 shrink-0 -mr-1 -mt-1"
                        onClick={() => onRemoveMeal(dayIndex, mealType)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1">
                      <MealSelector
                        filterCategory={mealType === "snack" ? undefined : mealType}
                        onSelect={(meal) => onAssignMeal(dayIndex, mealType, meal.id)}
                        placeholder={`Add ${mealType}...`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {/* Mobile: stacked list */}
          <div className="md:hidden space-y-1.5">
            {DAYS_SHORT.map((day, dayIndex) => {
              const assigned = getMeal(dayIndex, mealType);
              return (
                <div
                  key={`m-${dayIndex}-${mealType}`}
                  className={`rounded-lg border p-2.5 flex items-center gap-3 ${
                    assigned ? MEAL_TYPE_COLORS[mealType] : "bg-muted/30"
                  }`}
                >
                  <span className="text-xs font-semibold text-muted-foreground w-8 shrink-0">{day}</span>
                  {assigned ? (
                    <div className="flex-1 flex items-center justify-between min-w-0">
                      <span className="text-sm font-medium truncate">{assigned.mealName}</span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 shrink-0"
                        onClick={() => onRemoveMeal(dayIndex, mealType)}
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ) : (
                    <div className="flex-1 min-w-0">
                      <MealSelector
                        filterCategory={mealType === "snack" ? undefined : mealType}
                        onSelect={(meal) => onAssignMeal(dayIndex, mealType, meal.id)}
                        placeholder={`Add...`}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
