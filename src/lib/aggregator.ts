import { canConvert, convertTo, bestUnit } from "./units";

export interface RawItem {
  ingredientId: number | null;
  ingredientName: string;
  ingredientCategory: string;
  quantity: number;
  unit: string;
  source: "meal" | "staple" | "manual";
  sourceMeal?: string;
}

export interface AggregatedItem {
  ingredientId: number | null;
  name: string;
  category: string;
  quantity: number;
  unit: string;
  sources: string[];
  customName?: string;
}

// Category display order for the shopping list
export const CATEGORY_ORDER: Record<string, number> = {
  produce: 0,
  dairy: 1,
  meat: 2,
  bakery: 3,
  frozen: 4,
  pantry: 5,
  snacks: 6,
  drinks: 7,
  household: 8,
  bathroom: 9,
  other: 10,
};

export const CATEGORY_LABELS: Record<string, string> = {
  produce: "Fruit & Veg",
  dairy: "Dairy & Eggs",
  meat: "Meat & Fish",
  bakery: "Bakery",
  frozen: "Frozen",
  pantry: "Pantry & Dry Goods",
  snacks: "Snacks",
  drinks: "Drinks",
  household: "Household & Cleaning",
  bathroom: "Bathroom & Toiletries",
  other: "Other",
};

export function aggregateItems(rawItems: RawItem[]): AggregatedItem[] {
  // Group by ingredientId (for linked items) or by name
  const groups = new Map<string, { items: RawItem[]; key: string }>();

  for (const item of rawItems) {
    const key = item.ingredientId
      ? `id:${item.ingredientId}`
      : `name:${item.ingredientName.toLowerCase()}`;

    if (!groups.has(key)) {
      groups.set(key, { items: [], key });
    }
    groups.get(key)!.items.push(item);
  }

  const aggregated: AggregatedItem[] = [];

  for (const group of groups.values()) {
    const first = group.items[0];
    const sources = group.items
      .map((i) => i.sourceMeal || i.source)
      .filter((s, idx, arr) => arr.indexOf(s) === idx);

    // Try to aggregate quantities
    let totalQuantity = 0;
    let targetUnit = first.unit;
    let canAggregate = true;

    for (const item of group.items) {
      if (canConvert(item.unit, targetUnit)) {
        totalQuantity += convertTo(item.quantity, item.unit, targetUnit);
      } else if (canConvert(targetUnit, item.unit)) {
        // Convert existing total to the other unit
        totalQuantity = convertTo(totalQuantity, targetUnit, item.unit);
        targetUnit = item.unit;
        totalQuantity += item.quantity;
      } else {
        canAggregate = false;
        break;
      }
    }

    if (canAggregate) {
      const best = bestUnit(totalQuantity, targetUnit);
      aggregated.push({
        ingredientId: first.ingredientId,
        name: first.ingredientName,
        category: first.ingredientCategory,
        quantity: best.quantity,
        unit: best.unit,
        sources,
      });
    } else {
      // Can't aggregate — add items separately
      for (const item of group.items) {
        aggregated.push({
          ingredientId: item.ingredientId,
          name: item.ingredientName,
          category: item.ingredientCategory,
          quantity: item.quantity,
          unit: item.unit,
          sources: [item.sourceMeal || item.source],
        });
      }
    }
  }

  // Sort by category order, then alphabetically
  aggregated.sort((a, b) => {
    const catA = CATEGORY_ORDER[a.category] ?? 99;
    const catB = CATEGORY_ORDER[b.category] ?? 99;
    if (catA !== catB) return catA - catB;
    return a.name.localeCompare(b.name);
  });

  return aggregated;
}
