"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Package, Plus, Trash2, Loader2 } from "lucide-react";

interface StapleItem {
  id: number;
  ingredientId: number;
  ingredientName: string;
  ingredientCategory: string;
  defaultQuantity: number;
  unit: string;
  category: string;
}

const STAPLE_CATEGORIES = [
  { value: "staple", label: "Weekly Staples", description: "Bread, milk, eggs — things you buy every week" },
  { value: "snack", label: "Snacks", description: "Crisps, biscuits, fruit bars" },
  { value: "household", label: "Household", description: "Cleaning products, bin bags, foil" },
  { value: "bathroom", label: "Bathroom", description: "Toilet roll, soap, toothpaste" },
];

export default function StaplesPage() {
  const [items, setItems] = useState<StapleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

  // New item form
  const [newName, setNewName] = useState("");
  const [newQty, setNewQty] = useState("1");
  const [newUnit, setNewUnit] = useState("pieces");
  const [newCategory, setNewCategory] = useState("staple");

  const fetchItems = useCallback(async () => {
    const res = await fetch("/api/staples");
    const data = await res.json();
    setItems(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchItems();
  }, [fetchItems]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    setAdding(true);
    const res = await fetch("/api/staples", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: newName.trim(),
        quantity: parseFloat(newQty) || 1,
        unit: newUnit,
        category: newCategory,
      }),
    });

    if (res.ok) {
      setNewName("");
      setNewQty("1");
      setNewUnit("pieces");
      fetchItems();
    } else {
      const err = await res.json();
      alert(err.error || "Failed to add");
    }
    setAdding(false);
  };

  const handleRemove = async (id: number) => {
    await fetch(`/api/staples?id=${id}`, { method: "DELETE" });
    fetchItems();
  };

  // Group items by staple category
  const grouped = STAPLE_CATEGORIES.map((cat) => ({
    ...cat,
    items: items.filter((i) => i.category === cat.value),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Package className="h-8 w-8 text-primary" />
          Staples & Household
        </h1>
        <p className="text-muted-foreground mt-1">
          Items that automatically appear on every shopping list.
        </p>
      </div>

      {/* Add new staple */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Staple Item</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleAdd} className="flex flex-wrap gap-2 items-end">
            <div className="flex-1 min-w-[200px]">
              <label className="text-sm text-muted-foreground mb-1 block">Item name</label>
              <Input
                placeholder="e.g. Semi-skimmed milk"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="w-20">
              <label className="text-sm text-muted-foreground mb-1 block">Qty</label>
              <Input
                type="number"
                step="any"
                min="0"
                value={newQty}
                onChange={(e) => setNewQty(e.target.value)}
              />
            </div>
            <div className="w-28">
              <label className="text-sm text-muted-foreground mb-1 block">Unit</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newUnit}
                onChange={(e) => setNewUnit(e.target.value)}
              >
                <option value="pieces">pieces</option>
                <option value="g">g</option>
                <option value="kg">kg</option>
                <option value="ml">ml</option>
                <option value="l">l</option>
                <option value="loaves">loaves</option>
                <option value="packs">packs</option>
                <option value="bottles">bottles</option>
                <option value="rolls">rolls</option>
                <option value="bags">bags</option>
              </select>
            </div>
            <div className="w-36">
              <label className="text-sm text-muted-foreground mb-1 block">Category</label>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                value={newCategory}
                onChange={(e) => setNewCategory(e.target.value)}
              >
                {STAPLE_CATEGORIES.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </div>
            <Button type="submit" disabled={adding || !newName.trim()}>
              {adding ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4 mr-1" />}
              Add
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* List by category */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <Card key={group.value}>
              <CardHeader>
                <CardTitle className="text-base">{group.label}</CardTitle>
                <p className="text-sm text-muted-foreground">{group.description}</p>
              </CardHeader>
              <CardContent>
                {group.items.length === 0 ? (
                  <p className="text-sm text-muted-foreground py-2">No items yet. Add some above.</p>
                ) : (
                  <ul className="divide-y">
                    {group.items.map((item) => (
                      <li key={item.id} className="flex items-center justify-between py-2">
                        <div className="flex items-center gap-3">
                          <span className="text-sm font-medium">
                            {item.defaultQuantity}{item.unit !== "pieces" ? ` ${item.unit}` : "x"}
                          </span>
                          <span className="text-sm">{item.ingredientName}</span>
                          <span className="text-xs text-muted-foreground rounded-full bg-muted px-2 py-0.5">
                            {item.ingredientCategory}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-muted-foreground hover:text-destructive"
                          onClick={() => handleRemove(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          ))}

          {items.length > 0 && (
            <p className="text-sm text-muted-foreground text-center">
              {items.length} staple item{items.length !== 1 ? "s" : ""} will be added to every shopping list.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
