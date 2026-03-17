export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;
export const DAYS_SHORT = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;
export const MEAL_TYPES = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealType = typeof MEAL_TYPES[number];

export function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  // getDay: 0=Sun, 1=Mon ... 6=Sat. We want Monday as start.
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export function addWeeks(dateStr: string, weeks: number): string {
  const d = new Date(dateStr);
  d.setDate(d.getDate() + weeks * 7);
  return d.toISOString().split("T")[0];
}

export function formatWeekRange(mondayStr: string): string {
  const mon = new Date(mondayStr);
  const sun = new Date(mondayStr);
  sun.setDate(sun.getDate() + 6);

  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric" };
  return `${mon.toLocaleDateString("en-GB", opts)} – ${sun.toLocaleDateString("en-GB", opts)}`;
}
