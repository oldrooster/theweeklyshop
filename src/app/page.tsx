import Link from "next/link";
import { UtensilsCrossed, ShoppingCart, BookOpen, Plus } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export default function Dashboard() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Welcome to The Weekly Shop</h1>
        <p className="text-muted-foreground mt-1">
          Plan your meals, build your shopping list, and simplify your weekly grocery run.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <UtensilsCrossed className="h-5 w-5 text-primary" />
              Meal Library
            </CardTitle>
            <CardDescription>
              Build up your collection of go-to meals with ingredients and recipes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/meals">
              <Button className="w-full">
                <BookOpen className="h-4 w-4 mr-2" />
                Browse Meals
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Plus className="h-5 w-5 text-primary" />
              Add a Meal
            </CardTitle>
            <CardDescription>
              Create a new meal with ingredients and cooking instructions.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Link href="/meals?new=true">
              <Button variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                New Meal
              </Button>
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ShoppingCart className="h-5 w-5 text-primary" />
              Weekly Plan
            </CardTitle>
            <CardDescription>
              Plan your meals for the week and generate a shopping list.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="secondary" className="w-full" disabled>
              Coming in Phase 2
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
