"use client";

import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, X, Loader2 } from "lucide-react";

interface QuickAddItem {
  id: number;
  customName: string | null;
  ingredientId: number | null;
  quantity: number | null;
  unit: string | null;
}

interface QuickAddInputProps {
  planId: number;
  items: QuickAddItem[];
  onAdd: (name: string, quantity?: number, unit?: string) => Promise<void>;
  onRemove: (itemId: number) => Promise<void>;
}

const UNITS = ["", "pieces", "g", "kg", "ml", "l", "packs", "bottles", "cans", "bags", "rolls"];

export function QuickAddInput({ planId, items, onAdd, onRemove }: QuickAddInputProps) {
  const [name, setName] = useState("");
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState("");
  const [adding, setAdding] = useState(false);

  const handleAdd = async () => {
    if (!name.trim()) return;
    setAdding(true);
    await onAdd(name.trim(), quantity ? parseFloat(quantity) : undefined, unit || undefined);
    setName("");
    setQuantity("");
    setUnit("");
    setAdding(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAdd();
    }
  };

  const manualItems = items.filter((i) => i.customName || i.ingredientId);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Add item... e.g. cat food"
          className="flex-1 min-w-[150px]"
        />
        <div className="flex gap-2">
          <Input
            type="number"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            placeholder="Qty"
            className="w-16 sm:w-20"
            onKeyDown={handleKeyDown}
          />
          <select
            value={unit}
            onChange={(e) => setUnit(e.target.value)}
            className="flex h-10 rounded-md border border-input bg-background px-2 py-2 text-sm w-20 sm:w-24"
          >
            {UNITS.map((u) => (
              <option key={u} value={u}>
                {u || "—"}
              </option>
            ))}
          </select>
          <Button onClick={handleAdd} disabled={!name.trim() || adding} size="icon">
            {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {manualItems.length > 0 && (
        <ul className="space-y-1">
          {manualItems.map((item) => (
            <li
              key={item.id}
              className="flex items-center justify-between py-1.5 px-3 bg-muted/50 rounded-md text-sm"
            >
              <span>
                {item.quantity && `${item.quantity}${item.unit ? ` ${item.unit}` : ""} `}
                {item.customName || "(linked ingredient)"}
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => onRemove(item.id)}
              >
                <X className="h-3 w-3" />
              </Button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
