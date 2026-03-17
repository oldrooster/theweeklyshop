// Unit conversion system for ingredient aggregation

type UnitGroup = {
  units: { name: string; factor: number }[];
};

const UNIT_GROUPS: UnitGroup[] = [
  {
    // Weight
    units: [
      { name: "g", factor: 1 },
      { name: "kg", factor: 1000 },
    ],
  },
  {
    // Volume (metric)
    units: [
      { name: "ml", factor: 1 },
      { name: "l", factor: 1000 },
    ],
  },
  {
    // Cooking spoons
    units: [
      { name: "tsp", factor: 1 },
      { name: "tbsp", factor: 3 },
      { name: "cup", factor: 48 },
    ],
  },
];

function findGroup(unit: string): UnitGroup | null {
  return UNIT_GROUPS.find((g) => g.units.some((u) => u.name === unit)) || null;
}

function getFactor(group: UnitGroup, unit: string): number {
  return group.units.find((u) => u.name === unit)?.factor ?? 1;
}

export function canConvert(unitA: string, unitB: string): boolean {
  if (unitA === unitB) return true;
  const group = findGroup(unitA);
  return group !== null && group.units.some((u) => u.name === unitB);
}

export function convertTo(quantity: number, fromUnit: string, toUnit: string): number {
  if (fromUnit === toUnit) return quantity;
  const group = findGroup(fromUnit);
  if (!group) return quantity;
  const fromFactor = getFactor(group, fromUnit);
  const toFactor = getFactor(group, toUnit);
  return (quantity * fromFactor) / toFactor;
}

// Pick the best display unit for a quantity (e.g. 1500g -> 1.5kg)
export function bestUnit(quantity: number, unit: string): { quantity: number; unit: string } {
  const group = findGroup(unit);
  if (!group) return { quantity, unit };

  const baseValue = quantity * getFactor(group, unit);

  // Find the largest unit where the value is >= 1
  const sorted = [...group.units].sort((a, b) => b.factor - a.factor);
  for (const u of sorted) {
    const converted = baseValue / u.factor;
    if (converted >= 1) {
      // Round to reasonable precision
      const rounded = Math.round(converted * 100) / 100;
      return { quantity: rounded, unit: u.name };
    }
  }

  // Fall back to smallest unit
  const smallest = group.units[0];
  return { quantity: Math.round(baseValue / smallest.factor * 100) / 100, unit: smallest.name };
}

export function formatQuantity(qty: number): string {
  if (qty === Math.floor(qty)) return qty.toString();
  return qty.toFixed(qty < 10 ? 1 : 0);
}
