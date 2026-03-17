import type { Metadata } from "next";
import Link from "next/link";
import { ShoppingCart, UtensilsCrossed, Home, CalendarDays, Package } from "lucide-react";
import "./globals.css";

export const metadata: Metadata = {
  title: "The Weekly Shop",
  description: "Plan your weekly meals and build your shopping list",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className="antialiased min-h-screen bg-background font-sans"
      >
        <header className="border-b bg-card">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <Link href="/" className="flex items-center gap-2 text-xl font-bold text-primary">
              <ShoppingCart className="h-6 w-6" />
              The Weekly Shop
            </Link>
            <nav className="flex items-center gap-4">
              <Link
                href="/"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Home className="h-4 w-4" />
                Dashboard
              </Link>
              <Link
                href="/plan"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <CalendarDays className="h-4 w-4" />
                Plan
              </Link>
              <Link
                href="/meals"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <UtensilsCrossed className="h-4 w-4" />
                Meals
              </Link>
              <Link
                href="/staples"
                className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Package className="h-4 w-4" />
                Staples
              </Link>
            </nav>
          </div>
        </header>
        <main className="container mx-auto px-4 py-6">
          {children}
        </main>
      </body>
    </html>
  );
}
