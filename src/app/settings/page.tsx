"use client";

import { useEffect, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Settings,
  Users,
  Plus,
  Trash2,
  Save,
  Download,
  Loader2,
  Check,
} from "lucide-react";

interface Member {
  id?: number;
  name: string;
  type: "adult" | "child";
}

interface Household {
  id: number;
  name: string;
  members: Member[];
}

export default function SettingsPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const fetchHousehold = useCallback(async () => {
    const res = await fetch("/api/household");
    const data = await res.json();
    if (data) {
      setHousehold(data);
      setName(data.name);
      setMembers(data.members);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchHousehold();
  }, [fetchHousehold]);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);

    await fetch("/api/household", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, members }),
    });

    setSaving(false);
    setSaved(true);
    fetchHousehold();
    setTimeout(() => setSaved(false), 2000);
  };

  const addMember = () => {
    setMembers([...members, { name: "", type: "adult" }]);
  };

  const updateMember = (index: number, updates: Partial<Member>) => {
    const updated = [...members];
    updated[index] = { ...updated[index], ...updates };
    setMembers(updated);
  };

  const removeMember = (index: number) => {
    setMembers(members.filter((_, i) => i !== index));
  };

  const handleExport = async () => {
    const res = await fetch("/api/export");
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `weekly-shop-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const adults = members.filter((m) => m.type === "adult").length;
  const children = members.filter((m) => m.type === "child").length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Settings className="h-7 w-7 sm:h-8 sm:w-8 text-primary" />
          Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your household profile and data.
        </p>
      </div>

      {/* Household Profile */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-5 w-5 text-primary" />
            Household Profile
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Set up who lives in your household. This helps with meal planning portions.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Household Name</label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder='e.g. "The Smiths" or "My household"'
              className="max-w-sm"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium block">Members</label>
            {members.map((member, index) => (
              <div key={index} className="flex items-center gap-2">
                <Input
                  value={member.name}
                  onChange={(e) => updateMember(index, { name: e.target.value })}
                  placeholder="Name"
                  className="flex-1 max-w-[200px]"
                />
                <select
                  value={member.type}
                  onChange={(e) => updateMember(index, { type: e.target.value as "adult" | "child" })}
                  className="h-10 rounded-md border border-input bg-background px-3 text-sm"
                >
                  <option value="adult">Adult</option>
                  <option value="child">Child</option>
                </select>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-9 w-9 text-muted-foreground hover:text-destructive"
                  onClick={() => removeMember(index)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button variant="outline" size="sm" onClick={addMember}>
              <Plus className="h-4 w-4 mr-1" />
              Add Member
            </Button>
          </div>

          {members.length > 0 && (
            <p className="text-sm text-muted-foreground">
              {adults} adult{adults !== 1 ? "s" : ""}{children > 0 ? `, ${children} child${children !== 1 ? "ren" : ""}` : ""}
            </p>
          )}

          <Button onClick={handleSave} disabled={saving || !name.trim()}>
            {saving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : saved ? (
              <Check className="h-4 w-4 mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {saved ? "Saved!" : "Save Profile"}
          </Button>
        </CardContent>
      </Card>

      {/* Data Export */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Data Export & Backup
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Download all your data as a JSON file. Includes meals, plans, ingredients, staples, and shopping lists.
          </p>
        </CardHeader>
        <CardContent>
          <Button variant="outline" onClick={handleExport}>
            <Download className="h-4 w-4 mr-2" />
            Download Backup
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
