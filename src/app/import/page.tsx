"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Upload,
  FileText,
  Loader2,
  Check,
  X,
  PackagePlus,
  ShoppingBasket,
  AlertCircle,
  Image as ImageIcon,
} from "lucide-react";

interface ExtractedItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  price: number | null;
  currency: string;
  matched: { id: number; name: string; category: string } | null;
  action: "add_to_plan" | "add_staple" | "skip";
}

interface Plan {
  id: number;
  weekStartDate: string;
}

export default function ImportPage() {
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [extracting, setExtracting] = useState(false);
  const [items, setItems] = useState<ExtractedItem[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch available plans for "add to plan" action
  useEffect(() => {
    fetch("/api/plans")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setPlans(data);
          if (data.length > 0) setSelectedPlanId(data[0].id);
        }
      })
      .catch(() => {});
  }, []);

  const handleFileSelect = useCallback((f: File) => {
    setFile(f);
    setItems(null);
    setError(null);
    setSaved(false);

    // Create preview for images
    if (f.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target?.result as string);
      reader.readAsDataURL(f);
    } else {
      setPreview(null);
    }
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files[0];
      if (f) handleFileSelect(f);
    },
    [handleFileSelect]
  );

  const handleExtract = async () => {
    if (!file) return;

    setExtracting(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/import", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Failed to extract items");
        setExtracting(false);
        return;
      }

      // Set default action based on whether item matched an existing ingredient
      const itemsWithAction = data.items.map((item: ExtractedItem) => ({
        ...item,
        action: "add_to_plan" as const,
      }));

      setItems(itemsWithAction);
    } catch {
      setError("Failed to connect to the server");
    }

    setExtracting(false);
  };

  const updateItem = (index: number, updates: Partial<ExtractedItem>) => {
    if (!items) return;
    const newItems = [...items];
    newItems[index] = { ...newItems[index], ...updates };
    setItems(newItems);
  };

  const handleConfirm = async () => {
    if (!items) return;

    setSaving(true);

    const itemsToSave = items
      .filter((i) => i.action !== "skip")
      .map((i) => ({
        name: i.matched?.name || i.name,
        quantity: i.quantity,
        unit: i.unit,
        category: i.matched?.category || i.category,
        action: i.action,
        planId: i.action === "add_to_plan" ? selectedPlanId : undefined,
      }));

    try {
      await fetch("/api/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: itemsToSave }),
      });
      setSaved(true);
    } catch {
      setError("Failed to save items");
    }

    setSaving(false);
  };

  const activeItems = items?.filter((i) => i.action !== "skip") || [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Upload className="h-8 w-8 text-primary" />
          Import Receipt
        </h1>
        <p className="text-muted-foreground mt-1">
          Upload a photo or PDF of a grocery receipt. Claude will extract the items for you.
        </p>
      </div>

      {/* Upload area */}
      {!items && (
        <Card>
          <CardContent className="pt-6">
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-lg p-8 text-center cursor-pointer hover:border-primary hover:bg-accent/50 transition-colors"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*,application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleFileSelect(f);
                }}
              />
              {file ? (
                <div className="space-y-3">
                  {preview ? (
                    <img
                      src={preview}
                      alt="Receipt preview"
                      className="max-h-64 mx-auto rounded-md"
                    />
                  ) : (
                    <FileText className="h-12 w-12 mx-auto text-primary" />
                  )}
                  <p className="text-sm font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(0)} KB — Click to change
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="flex justify-center gap-2 text-muted-foreground">
                    <ImageIcon className="h-10 w-10" />
                    <FileText className="h-10 w-10" />
                  </div>
                  <p className="font-medium">Drop a receipt here or click to browse</p>
                  <p className="text-sm text-muted-foreground">
                    Supports photos (JPG, PNG) and PDF files
                  </p>
                </div>
              )}
            </div>

            {file && (
              <div className="mt-4 flex justify-center">
                <Button onClick={handleExtract} disabled={extracting} size="lg">
                  {extracting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting items...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Extract Items
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Error */}
      {error && (
        <Card className="border-destructive">
          <CardContent className="pt-6 flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p className="text-sm">{error}</p>
          </CardContent>
        </Card>
      )}

      {/* Review extracted items */}
      {items && !saved && (
        <>
          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Review Extracted Items ({items.length} found)
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Choose what to do with each item. Edit names or categories as needed.
              </p>
            </CardHeader>
            <CardContent>
              {/* Target plan selector */}
              {plans.length > 0 && (
                <div className="mb-4 flex items-center gap-2">
                  <label className="text-sm text-muted-foreground">Add to plan:</label>
                  <select
                    className="h-8 rounded-md border border-input bg-background px-2 text-sm"
                    value={selectedPlanId ?? ""}
                    onChange={(e) => setSelectedPlanId(parseInt(e.target.value))}
                  >
                    {plans.map((p) => (
                      <option key={p.id} value={p.id}>
                        Week of {p.weekStartDate}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="space-y-2">
                {items.map((item, index) => (
                  <div
                    key={index}
                    className={`flex items-center gap-2 py-2 px-3 rounded-md transition-colors ${
                      item.action === "skip"
                        ? "bg-muted/30 opacity-50"
                        : "bg-card border"
                    }`}
                  >
                    {/* Match indicator */}
                    {item.matched && (
                      <span className="text-xs text-primary bg-primary/10 px-1.5 py-0.5 rounded shrink-0" title="Matched to existing ingredient">
                        matched
                      </span>
                    )}

                    {/* Editable name */}
                    <Input
                      value={item.name}
                      onChange={(e) => updateItem(index, { name: e.target.value })}
                      className="h-8 text-sm flex-1 min-w-0"
                    />

                    {/* Quantity + unit */}
                    <Input
                      type="number"
                      step="any"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, { quantity: parseFloat(e.target.value) || 1 })}
                      className="h-8 text-sm w-16"
                    />
                    <select
                      className="h-8 rounded-md border border-input bg-background px-1 text-sm w-20"
                      value={item.unit}
                      onChange={(e) => updateItem(index, { unit: e.target.value })}
                    >
                      {["pieces", "g", "kg", "ml", "l", "packs", "loaves", "bottles", "rolls", "bags"].map((u) => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>

                    {/* Category */}
                    <select
                      className="h-8 rounded-md border border-input bg-background px-1 text-sm w-24 hidden sm:block"
                      value={item.category}
                      onChange={(e) => updateItem(index, { category: e.target.value })}
                    >
                      {["produce", "dairy", "meat", "bakery", "frozen", "pantry", "household", "bathroom", "snacks", "drinks", "other"].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>

                    {/* Price */}
                    {item.price != null && (
                      <span className="text-xs text-muted-foreground w-14 text-right shrink-0">
                        {new Intl.NumberFormat("en-NZ", { style: "currency", currency: item.currency || "NZD" }).format(item.price)}
                      </span>
                    )}

                    {/* Action buttons */}
                    <div className="flex gap-1 shrink-0">
                      <Button
                        variant={item.action === "add_to_plan" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItem(index, { action: "add_to_plan" })}
                        title="Add to this week's list"
                      >
                        <ShoppingBasket className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={item.action === "add_staple" ? "default" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItem(index, { action: "add_staple" })}
                        title="Save as staple"
                      >
                        <PackagePlus className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant={item.action === "skip" ? "destructive" : "ghost"}
                        size="icon"
                        className="h-7 w-7"
                        onClick={() => updateItem(index, { action: "skip" })}
                        title="Skip this item"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Confirm */}
          <div className="flex items-center justify-between">
            <Button
              variant="outline"
              onClick={() => {
                setItems(null);
                setFile(null);
                setPreview(null);
              }}
            >
              Start Over
            </Button>
            <Button onClick={handleConfirm} disabled={saving || activeItems.length === 0} size="lg">
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Check className="h-4 w-4 mr-2" />
                  Confirm {activeItems.length} Items
                </>
              )}
            </Button>
          </div>
        </>
      )}

      {/* Success */}
      {saved && (
        <Card className="border-primary">
          <CardContent className="pt-6 text-center space-y-4">
            <Check className="h-12 w-12 mx-auto text-primary" />
            <h2 className="text-xl font-bold">Import Complete!</h2>
            <p className="text-muted-foreground">
              {activeItems.length} items have been saved.
            </p>
            <div className="flex justify-center gap-3">
              <Button
                variant="outline"
                onClick={() => {
                  setItems(null);
                  setFile(null);
                  setPreview(null);
                  setSaved(false);
                }}
              >
                Import Another
              </Button>
              <Button onClick={() => window.location.href = "/plan"}>
                Go to Plan
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
