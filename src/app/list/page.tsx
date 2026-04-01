"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

function getMonday(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

export default function ListRedirectPage() {
  const router = useRouter();

  useEffect(() => {
    const monday = getMonday();

    const go = async () => {
      // Find existing plan for this week
      const res = await fetch(`/api/plans?week=${monday}`);
      const existing = await res.json();

      if (existing?.id) {
        router.replace(`/list/${existing.id}`);
        return;
      }

      // Create a plan for this week
      const createRes = await fetch("/api/plans", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ weekStartDate: monday }),
      });
      const plan = await createRes.json();
      router.replace(`/list/${plan.id}`);
    };

    go().catch(() => router.replace("/plan"));
  }, [router]);

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
    </div>
  );
}
