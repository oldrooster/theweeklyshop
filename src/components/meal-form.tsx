"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Plus, X, Loader2, Sparkles, Eye, Pencil } from "lucide-react";
import { Markdown } from "@/components/markdown";

interface IngredientRow {
  ingredientName: string;
  quantity: number;
  unit: string;
}

interface MealFormProps {
  onSave: () => void;
  onCancel: () => void;
  initial?: {
    id?: number;
    name: string;
    category: string;
    serves: number;
    instructions: string;
    ingredients: IngredientRow[];
  };
}

const UNITS = ["pieces", "g", "kg", "ml", "l", "tsp", "tbsp", "cup", "slices", "rashers", "fillets", "cloves", "cans", "bunches"];
const CATEGORIES = [
  { value: "breakfast", label: "Breakfast" },
  { value: "lunch", label: "Lunch" },
  { value: "dinner", label: "Dinner" },
  { value: "snack", label: "Snack" },
];

export function MealForm({ onSave, onCancel, initial }: MealFormProps) {
  const [name, setName] = useState(initial?.name || "");
  const [category, setCategory] = useState(initial?.category || "dinner");
  const [serves, setServes] = useState(initial?.serves || 4);
  const [instructions, setInstructions] = useState(initial?.instructions || "");
  const [ingredients, setIngredients] = useState<IngredientRow[]>(
    initial?.ingredients || [{ ingredientName: "", quantity: 1, unit: "pieces" }]
  );
  const [saving, setSaving] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [generateError, setGenerateError] = useState<string | null>(null);
  const [instructionsPreview, setInstructionsPreview] = useState(false);

  const handleAskClaude = async () => {
    setGenerating(true);
    setGenerateError(null);
    try {
      const res = await fetch("/api/meals/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mealName: name }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGenerateError(data.error || "Failed to generate recipe");
        return;
      }
      if (data.name) setName(data.name);
      if (data.category) setCategory(data.category);
      if (data.serves) setServes(data.serves);
      if (data.instructions) { setInstructions(data.instructions); setInstructionsPreview(true); }
      if (Array.isArray(data.ingredients) && data.ingredients.length) {
        setIngredients(
          data.ingredients.map((ing: Record<string, unknown>) => ({
            ingredientName: String(ing.ingredientName || ing.name || ""),
            quantity: Number(ing.quantity) || 1,
            unit: UNITS.includes(String(ing.unit)) ? String(ing.unit) : "pieces",
          }))
        );
      }
    } catch {
      setGenerateError("Failed to connect to the server");
    } finally {
      setGenerating(false);
    }
  };

  const addIngredient = () => {
    setIngredients([...ingredients, { ingredientName: "", quantity: 1, unit: "pieces" }]);
  };

  const removeIngredient = (index: number) => {
    setIngredients(ingredients.filter((_, i) => i !== index));
  };

  const updateIngredient = (index: number, field: keyof IngredientRow, value: string | number) => {
    const updated = [...ingredients];
    updated[index] = { ...updated[index], [field]: value };
    setIngredients(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const validIngredients = ingredients.filter((i) => i.ingredientName.trim().length > 0);

    const url = initial?.id ? `/api/meals/${initial.id}` : "/api/meals";
    const method = initial?.id ? "PUT" : "POST";

    await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        category,
        serves,
        instructions,
        ingredients: validIngredients,
      }),
    });

    setSaving(false);
    onSave();
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="name">Meal Name</Label>
          <div className="flex gap-2">
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Spaghetti Bolognese"
              required
              className="flex-1"
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="h-10 shrink-0"
              disabled={!name.trim() || generating}
              onClick={handleAskClaude}
            >
              {generating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 mr-1" />
              )}
              {generating ? "Generating..." : "Ask Claude"}
            </Button>
          </div>
          {generateError && (
            <p className="text-sm text-red-500">{generateError}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <select
            id="category"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
          >
            {CATEGORIES.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="serves">Serves</Label>
          <Input
            id="serves"
            type="number"
            min={1}
            value={serves}
            onChange={(e) => setServes(parseInt(e.target.value) || 1)}
          />
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Ingredients</Label>
          <Button type="button" variant="ghost" size="sm" onClick={addIngredient}>
            <Plus className="h-4 w-4 mr-1" />
            Add
          </Button>
        </div>

        <div className="space-y-2">
          {ingredients.map((ing, index) => (
            <div key={index} className="flex items-center gap-2">
              <Input
                placeholder="Ingredient name"
                value={ing.ingredientName}
                onChange={(e) => updateIngredient(index, "ingredientName", e.target.value)}
                className="flex-1"
              />
              <Input
                type="number"
                min={0}
                step="any"
                value={ing.quantity}
                onChange={(e) => updateIngredient(index, "quantity", parseFloat(e.target.value) || 0)}
                className="w-20"
              />
              <select
                value={ing.unit}
                onChange={(e) => updateIngredient(index, "unit", e.target.value)}
                className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm w-24"
              >
                {UNITS.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeIngredient(index)}
                disabled={ingredients.length === 1}
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label htmlFor="instructions">Instructions</Label>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-7 text-xs gap-1"
            onClick={() => setInstructionsPreview(!instructionsPreview)}
            disabled={!instructions.trim()}
          >
            {instructionsPreview ? (
              <><Pencil className="h-3 w-3" /> Edit</>
            ) : (
              <><Eye className="h-3 w-3" /> Preview</>
            )}
          </Button>
        </div>
        {instructionsPreview ? (
          <div className="min-h-[120px] rounded-md border border-input bg-muted/30 px-3 py-2 text-muted-foreground">
            <Markdown content={instructions} />
          </div>
        ) : (
          <Textarea
            id="instructions"
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="How to cook this meal... (supports markdown)"
            rows={5}
          />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={saving || generating || !name.trim()}>
          {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {initial?.id ? "Update Meal" : "Save Meal"}
        </Button>
      </div>
    </form>
  );
}
