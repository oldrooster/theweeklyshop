"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Trash2, Edit, Users, ChevronDown, ChevronUp } from "lucide-react";
import { Markdown } from "@/components/markdown";
import { useState } from "react";

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

interface MealCardProps {
  meal: Meal;
  onEdit: (meal: Meal) => void;
  onDelete: (id: number) => void;
}

const CATEGORY_COLORS: Record<string, string> = {
  breakfast: "bg-amber-100 text-amber-800 border-amber-200",
  lunch: "bg-blue-100 text-blue-800 border-blue-200",
  dinner: "bg-purple-100 text-purple-800 border-purple-200",
  snack: "bg-green-100 text-green-800 border-green-200",
};

export function MealCard({ meal, onEdit, onDelete }: MealCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="space-y-1">
            <CardTitle className="text-lg">{meal.name}</CardTitle>
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${CATEGORY_COLORS[meal.category] || ""}`}>
                {meal.category}
              </span>
              <span className="flex items-center gap-1 text-xs text-muted-foreground">
                <Users className="h-3 w-3" />
                Serves {meal.serves}
              </span>
            </div>
          </div>
          <div className="flex gap-1 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onEdit(meal)}>
              <Edit className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={() => onDelete(meal.id)}>
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        {meal.ingredients.length > 0 && (
          <div className="space-y-2">
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
              {meal.ingredients.length} ingredient{meal.ingredients.length !== 1 ? "s" : ""}
            </button>
            {expanded && (
              <ul className="text-sm space-y-1 pl-4">
                {meal.ingredients.map((ing) => (
                  <li key={ing.id} className="text-muted-foreground">
                    {ing.quantity} {ing.unit} {ing.ingredientName}
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
        {expanded && meal.instructions && (
          <div className="mt-3 pt-3 border-t text-muted-foreground">
            <Markdown content={meal.instructions} />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
