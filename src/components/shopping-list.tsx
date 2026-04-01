"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CATEGORY_LABELS } from "@/lib/aggregator";
import { formatQuantity } from "@/lib/units";
import { Input } from "@/components/ui/input";
import { Check, X, RotateCcw, Eye, EyeOff, Printer, Search } from "lucide-react";

interface ShoppingListItem {
  id: string;
  dbId?: number;
  ingredientId: number | null;
  name: string;
  category: string;
  quantity: number | null;
  unit: string | null;
  sources: string[];
  checked: boolean;
  removed: boolean;
  source: "meal" | "manual";
}

interface ShoppingListProps {
  items: ShoppingListItem[];
  onToggleChecked: (item: ShoppingListItem) => void;
  onToggleRemoved: (item: ShoppingListItem) => void;
}

export function ShoppingList({ items, onToggleChecked, onToggleRemoved }: ShoppingListProps) {
  const [showRemoved, setShowRemoved] = useState(false);
  const [mode, setMode] = useState<"review" | "final">("review");
  const [search, setSearch] = useState("");

  const activeItems = items.filter((i) => !i.removed);
  const removedItems = items.filter((i) => i.removed);

  // Group by category
  const grouped = new Map<string, ShoppingListItem[]>();
  const searchLower = search.toLowerCase();
  const itemsToShow = (mode === "review" ? activeItems : activeItems.filter((i) => !i.checked))
    .filter((i) => !search || i.name.toLowerCase().includes(searchLower));

  for (const item of itemsToShow) {
    const cat = item.category || "other";
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(item);
  }

  // Sort categories
  const sortedCategories = [...grouped.entries()].sort(
    (a, b) => {
      const orderA = Object.keys(CATEGORY_LABELS).indexOf(a[0]);
      const orderB = Object.keys(CATEGORY_LABELS).indexOf(b[0]);
      return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
    }
  );

  const totalItems = activeItems.length;
  const checkedItems = activeItems.filter((i) => i.checked).length;
  const toBuyItems = totalItems - checkedItems;

  return (
    <div className="space-y-4">
      {/* Search */}
      <div className="relative print:hidden">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search items..."
          className="pl-9 h-9"
        />
      </div>

      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-2">
          <Button
            variant={mode === "review" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("review")}
          >
            <Eye className="h-4 w-4 mr-1" />
            Review ({totalItems})
          </Button>
          <Button
            variant={mode === "final" ? "default" : "outline"}
            size="sm"
            onClick={() => setMode("final")}
          >
            <Check className="h-4 w-4 mr-1" />
            Final List ({toBuyItems})
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowRemoved(!showRemoved)}
          >
            {showRemoved ? <EyeOff className="h-4 w-4 mr-1" /> : <Eye className="h-4 w-4 mr-1" />}
            {removedItems.length} removed
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.print()}
          >
            <Printer className="h-4 w-4 mr-1" />
            Print
          </Button>
        </div>
      </div>

      {/* Status bar */}
      {mode === "review" && (
        <div className="text-sm text-muted-foreground">
          Check off items you already have. Remaining items become your final shopping list.
        </div>
      )}

      {/* Items by category */}
      <div className="space-y-6 print:space-y-4">
        {sortedCategories.map(([category, catItems]) => (
          <div key={category}>
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2 print:text-black">
              {CATEGORY_LABELS[category] || category}
            </h3>
            <ul className="space-y-1">
              {catItems.map((item) => (
                <li
                  key={item.id}
                  className={`flex items-center justify-between py-2 px-3 rounded-md transition-colors ${
                    item.checked
                      ? "bg-muted/30 text-muted-foreground"
                      : "bg-card hover:bg-accent/50"
                  }`}
                >
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    {mode === "review" && (
                      <button
                        onClick={() => onToggleChecked(item)}
                        className={`flex-shrink-0 h-5 w-5 rounded border-2 flex items-center justify-center transition-colors ${
                          item.checked
                            ? "bg-primary border-primary text-primary-foreground"
                            : "border-input hover:border-primary"
                        }`}
                      >
                        {item.checked && <Check className="h-3 w-3" />}
                      </button>
                    )}
                    <span className={`text-sm ${item.checked ? "line-through" : ""}`}>
                      {item.quantity != null && (
                        <span className="font-medium">
                          {formatQuantity(item.quantity)}
                          {item.unit && item.unit !== "pieces" ? ` ${item.unit}` : item.unit === "pieces" ? "x" : ""}{" "}
                        </span>
                      )}
                      {item.name}
                    </span>
                    {item.sources.length > 0 && mode === "review" && (
                      <div className="hidden sm:flex gap-1 flex-wrap print:hidden">
                        {item.sources
                          .filter((s) => s !== "staple" && s !== "quick add")
                          .map((source, i) => (
                            <span
                              key={i}
                              className="text-xs bg-primary/10 text-primary px-1.5 py-0.5 rounded-full whitespace-nowrap"
                            >
                              {source}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                  {mode === "review" && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-muted-foreground hover:text-destructive print:hidden"
                      onClick={() => onToggleRemoved(item)}
                      title="Remove from list"
                    >
                      <X className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {itemsToShow.length === 0 && (
        <div className="text-center py-8 text-muted-foreground">
          {mode === "final"
            ? "All items checked off! Nothing left to buy."
            : "No items in the shopping list. Add meals to your weekly plan first."}
        </div>
      )}

      {/* Removed items */}
      {showRemoved && removedItems.length > 0 && (
        <div className="border-t pt-4 print:hidden">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">
            Removed Items
          </h3>
          <ul className="space-y-1">
            {removedItems.map((item) => (
              <li
                key={item.id}
                className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/20 text-muted-foreground"
              >
                <span className="text-sm line-through">
                  {item.quantity != null && `${formatQuantity(item.quantity)}${item.unit ? ` ${item.unit}` : ""} `}
                  {item.name}
                </span>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 shrink-0"
                  onClick={() => onToggleRemoved(item)}
                  title="Restore to list"
                >
                  <RotateCcw className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
