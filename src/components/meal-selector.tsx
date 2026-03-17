"use client";

import { useState, useEffect, useRef } from "react";
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";

interface Meal {
  id: number;
  name: string;
  category: string;
  serves: number;
}

interface MealSelectorProps {
  onSelect: (meal: Meal) => void;
  filterCategory?: string;
  placeholder?: string;
}

export function MealSelector({ onSelect, filterCategory, placeholder }: MealSelectorProps) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState<Meal[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  useEffect(() => {
    if (!search.trim()) {
      setResults([]);
      return;
    }

    const params = new URLSearchParams({ search });
    if (filterCategory) params.set("category", filterCategory);

    fetch(`/api/meals?${params}`)
      .then((r) => r.json())
      .then((data) => setResults(data))
      .catch(() => setResults([]));
  }, [search, filterCategory]);

  const handleSelect = (meal: Meal) => {
    onSelect(meal);
    setSearch("");
    setResults([]);
    setOpen(false);
  };

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder || "Search meals..."}
          className="pl-7 h-8 text-sm"
        />
      </div>
      {open && results.length > 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg max-h-48 overflow-y-auto">
          {results.map((meal) => (
            <button
              key={meal.id}
              onClick={() => handleSelect(meal)}
              className="w-full text-left px-3 py-2 text-sm hover:bg-accent transition-colors flex items-center justify-between"
            >
              <span>{meal.name}</span>
              <span className="text-xs text-muted-foreground">serves {meal.serves}</span>
            </button>
          ))}
        </div>
      )}
      {open && search.trim() && results.length === 0 && (
        <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-popover border rounded-md shadow-lg p-3 text-sm text-muted-foreground">
          No meals found. Add meals in the Meal Library first.
        </div>
      )}
    </div>
  );
}
