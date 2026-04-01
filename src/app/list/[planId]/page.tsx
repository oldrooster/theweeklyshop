"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ShoppingList } from "@/components/shopping-list";
import { QuickAddInput } from "@/components/quick-add-input";
import { formatWeekRange } from "@/lib/week-utils";
import { ShoppingCart, ArrowLeft, Loader2, ShoppingBasket, History, Plus, Check } from "lucide-react";
import Link from "next/link";

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

interface QuickAddItem {
  id: number;
  customName: string | null;
  ingredientId: number | null;
  quantity: number | null;
  unit: string | null;
}

interface ListData {
  planId: number;
  weekStartDate: string;
  items: ShoppingListItem[];
}

interface PurchaseHistoryItem {
  id: number;
  ingredientId: number;
  ingredientName: string;
  category: string;
  brandName: string | null;
  quantity: number;
  unit: string;
  price: number | null;
  currency: string;
  purchasedAt: string;
  purchaseCount: number;
}

export default function ShoppingListPage() {
  const params = useParams();
  const planId = params.planId as string;
  const [list, setList] = useState<ListData | null>(null);
  const [loading, setLoading] = useState(true);
  const [history, setHistory] = useState<PurchaseHistoryItem[]>([]);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [addedFromHistory, setAddedFromHistory] = useState<Set<number>>(new Set());

  const fetchList = useCallback(async () => {
    const res = await fetch(`/api/lists/${planId}`);
    if (res.ok) {
      const data = await res.json();
      setList(data);
    }
    setLoading(false);
  }, [planId]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetch("/api/purchase-history?limit=30")
      .then((r) => r.json())
      .then((data) => setHistory(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, []);

  const handleToggleChecked = async (item: ShoppingListItem) => {
    await fetch(`/api/lists/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientId: item.ingredientId,
        dbId: item.dbId,
        checked: !item.checked,
      }),
    });
    fetchList();
  };

  const handleToggleRemoved = async (item: ShoppingListItem) => {
    await fetch(`/api/lists/${planId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ingredientId: item.ingredientId,
        dbId: item.dbId,
        removed: !item.removed,
      }),
    });
    fetchList();
  };

  const handleQuickAdd = async (name: string, quantity?: number, unit?: string) => {
    await fetch(`/api/plans/${planId}/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, quantity, unit }),
    });
    fetchList();
  };

  const handleQuickRemove = async (itemId: number) => {
    await fetch(`/api/plans/${planId}/quick-add?itemId=${itemId}`, {
      method: "DELETE",
    });
    fetchList();
  };

  const handleAddFromHistory = async (item: PurchaseHistoryItem) => {
    await fetch(`/api/plans/${planId}/quick-add`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: item.ingredientName,
        quantity: item.quantity,
        unit: item.unit,
      }),
    });
    setAddedFromHistory((prev) => new Set(prev).add(item.ingredientId));
    fetchList();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!list) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground mb-4">Plan not found.</p>
        <Link href="/plan">
          <Button variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Plan
          </Button>
        </Link>
      </div>
    );
  }

  const quickAddItems: QuickAddItem[] = list.items
    .filter((i) => i.source === "manual")
    .map((i) => ({
      id: i.dbId || 0,
      customName: i.name,
      ingredientId: i.ingredientId,
      quantity: i.quantity,
      unit: i.unit,
    }));

  // Items already on list (by ingredientId) so we can mark them in history
  const listIngredientIds = new Set(
    list.items.map((i) => i.ingredientId).filter(Boolean) as number[]
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between print:hidden">
        <div>
          <Link
            href="/plan"
            className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center gap-1 mb-2"
          >
            <ArrowLeft className="h-3 w-3" />
            Back to Plan
          </Link>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <ShoppingCart className="h-8 w-8 text-primary" />
            Shopping List
          </h1>
          <p className="text-muted-foreground mt-1">
            Week of {formatWeekRange(list.weekStartDate)}
          </p>
        </div>
      </div>

      {/* Print header */}
      <div className="hidden print:block">
        <h1 className="text-2xl font-bold">Shopping List — {formatWeekRange(list.weekStartDate)}</h1>
      </div>

      <Card className="print:shadow-none print:border-none">
        <CardContent className="pt-6">
          <ShoppingList
            items={list.items}
            onToggleChecked={handleToggleChecked}
            onToggleRemoved={handleToggleRemoved}
          />
        </CardContent>
      </Card>

      {/* Quick add */}
      <Card className="print:hidden">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShoppingBasket className="h-5 w-5 text-primary" />
            Add More Items
          </CardTitle>
        </CardHeader>
        <CardContent>
          <QuickAddInput
            planId={parseInt(planId)}
            items={quickAddItems}
            onAdd={handleQuickAdd}
            onRemove={handleQuickRemove}
          />
        </CardContent>
      </Card>

      {/* From History panel */}
      {history.length > 0 && (
        <Card className="print:hidden">
          <CardHeader>
            <button
              className="flex items-center justify-between w-full text-left"
              onClick={() => setHistoryOpen(!historyOpen)}
            >
              <CardTitle className="flex items-center gap-2 text-base">
                <History className="h-5 w-5 text-primary" />
                Add from Purchase History
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {historyOpen ? "Hide" : `Show ${history.length} items`}
              </span>
            </button>
          </CardHeader>
          {historyOpen && (
            <CardContent>
              <p className="text-sm text-muted-foreground mb-3">
                Items from your import history. Click + to add to this week's list.
              </p>
              <div className="space-y-1">
                {history.map((item) => {
                  const onList = listIngredientIds.has(item.ingredientId);
                  const justAdded = addedFromHistory.has(item.ingredientId);
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between py-2 px-3 rounded-md bg-card border hover:bg-accent/30 transition-colors"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-sm font-medium capitalize truncate">
                          {item.ingredientName}
                        </span>
                        {item.brandName && (
                          <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded shrink-0">
                            {item.brandName}
                          </span>
                        )}
                        {item.price != null && (
                          <span className="text-xs text-muted-foreground shrink-0">
                            {new Intl.NumberFormat("en-NZ", {
                              style: "currency",
                              currency: item.currency || "NZD",
                            }).format(item.price)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-xs text-muted-foreground hidden sm:inline">
                          {item.quantity} {item.unit !== "pieces" ? item.unit : "×"}
                        </span>
                        {onList || justAdded ? (
                          <span className="text-xs text-primary flex items-center gap-1">
                            <Check className="h-3 w-3" />
                            On list
                          </span>
                        ) : (
                          <Button
                            variant="outline"
                            size="icon"
                            className="h-7 w-7"
                            onClick={() => handleAddFromHistory(item)}
                            title="Add to list"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          )}
        </Card>
      )}
    </div>
  );
}
