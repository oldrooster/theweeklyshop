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
  Bot,
  AlertTriangle,
  FlaskConical,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { CLAUDE_MODELS, VERTEX_MODELS } from "@/lib/ai-constants";

// ---- Types ----------------------------------------------------------------

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

interface AIConfig {
  purpose: "import" | "generate";
  provider: "claude" | "vertex";
  model: string;
  maxTokens: number;
  vertexProject: string | null;
  vertexLocation: string | null;
}

interface AISettingsData {
  configs: { import: AIConfig; generate: AIConfig };
  credentials: { claude: boolean; vertex: boolean };
}

type TestState = "idle" | "testing" | "ok" | "error";

// ---- AI Provider Panel ----------------------------------------------------

function AIProviderPanel({
  label,
  purpose,
  config,
  credentials,
  onChange,
}: {
  label: string;
  purpose: "import" | "generate";
  config: AIConfig;
  credentials: { claude: boolean; vertex: boolean };
  onChange: (updates: Partial<AIConfig>) => void;
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [claudeTest, setClaudeTest] = useState<TestState>("idle");
  const [claudeTestMsg, setClaudeTestMsg] = useState("");
  const [vertexTest, setVertexTest] = useState<TestState>("idle");
  const [vertexTestMsg, setVertexTestMsg] = useState("");
  const [open, setOpen] = useState(true);

  const handleSave = async () => {
    setSaving(true);
    setSaved(false);
    await fetch("/api/settings/ai", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...config, purpose }),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleTest = async (provider: "claude" | "vertex") => {
    const setTest = provider === "claude" ? setClaudeTest : setVertexTest;
    const setMsg = provider === "claude" ? setClaudeTestMsg : setVertexTestMsg;

    setTest("testing");
    setMsg("");

    const res = await fetch("/api/settings/ai/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ purpose, provider }),
    });
    const data = await res.json();

    if (data.success) {
      setTest("ok");
      setMsg(`Connected — model replied: "${data.response}"`);
    } else {
      setTest("error");
      setMsg(data.error || "Unknown error");
    }
    setTimeout(() => setTest("idle"), 6000);
  };

  const models = config.provider === "claude" ? CLAUDE_MODELS : VERTEX_MODELS;

  return (
    <Card>
      <CardHeader>
        <button
          type="button"
          className="flex items-center justify-between w-full text-left"
          onClick={() => setOpen(!open)}
        >
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="h-5 w-5 text-primary" />
            {label}
          </CardTitle>
          {open ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </button>
      </CardHeader>

      {open && (
        <CardContent className="space-y-6">
          {/* Provider selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium block">AI Provider</label>
            <div className="flex gap-2">
              {(["claude", "vertex"] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    const defaultModel = p === "claude"
                      ? (purpose === "import" ? "claude-sonnet-4-6" : "claude-haiku-4-5")
                      : "gemini-2.0-flash-001";
                    onChange({ provider: p, model: defaultModel });
                  }}
                  className={`px-4 py-2 rounded-md text-sm font-medium border transition-colors ${
                    config.provider === p
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-input hover:bg-accent"
                  }`}
                >
                  {p === "claude" ? "Claude (Anthropic)" : "Vertex AI (Google)"}
                </button>
              ))}
            </div>
          </div>

          {/* Credential warnings */}
          <div className="space-y-2">
            {config.provider === "claude" && !credentials.claude && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>ANTHROPIC_API_KEY</strong> is not set. Add it to your{" "}
                  <code className="bg-amber-100 px-1 rounded">.env.local</code> or Docker environment.
                </div>
              </div>
            )}
            {config.provider === "vertex" && !credentials.vertex && (
              <div className="flex items-start gap-2 p-3 rounded-md bg-amber-50 border border-amber-200 text-amber-800">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5" />
                <div className="text-sm">
                  <strong>GOOGLE_VERTEX_SA_KEY</strong> is not set. Add the full service account JSON string to your environment.
                </div>
              </div>
            )}
          </div>

          {/* Model + tokens */}
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium block">Model</label>
              <select
                value={config.model}
                onChange={(e) => onChange({ model: e.target.value })}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                {models.map((m) => (
                  <option key={m.id} value={m.id}>{m.label}</option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium block">Max Tokens</label>
              <Input
                type="number"
                min={256}
                max={32768}
                step={256}
                value={config.maxTokens}
                onChange={(e) => onChange({ maxTokens: parseInt(e.target.value) || 4096 })}
              />
              <p className="text-xs text-muted-foreground">
                {purpose === "import"
                  ? "Higher values handle longer receipts (8096 recommended)"
                  : "2048–4096 is sufficient for recipes"}
              </p>
            </div>
          </div>

          {/* Vertex-specific fields */}
          {config.provider === "vertex" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium block">GCP Project ID</label>
                <Input
                  value={config.vertexProject ?? ""}
                  onChange={(e) => onChange({ vertexProject: e.target.value || null })}
                  placeholder="my-gcp-project"
                />
                <p className="text-xs text-muted-foreground">
                  Falls back to <code>GOOGLE_CLOUD_PROJECT</code> env var if blank
                </p>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium block">Region</label>
                <select
                  value={config.vertexLocation ?? "us-central1"}
                  onChange={(e) => onChange({ vertexLocation: e.target.value })}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                >
                  {[
                    "us-central1",
                    "us-east1",
                    "us-west1",
                    "europe-west1",
                    "europe-west4",
                    "asia-southeast1",
                    "australia-southeast1",
                  ].map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Test credential buttons */}
          <div className="flex flex-wrap gap-2 pt-2 border-t">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={claudeTest === "testing" || !credentials.claude}
              onClick={() => handleTest("claude")}
              title={!credentials.claude ? "ANTHROPIC_API_KEY not set" : ""}
            >
              {claudeTest === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : claudeTest === "ok" ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              ) : (
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test Claude
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={vertexTest === "testing" || !credentials.vertex}
              onClick={() => handleTest("vertex")}
              title={!credentials.vertex ? "GOOGLE_VERTEX_SA_KEY not set" : ""}
            >
              {vertexTest === "testing" ? (
                <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
              ) : vertexTest === "ok" ? (
                <Check className="h-3.5 w-3.5 mr-1.5 text-green-600" />
              ) : (
                <FlaskConical className="h-3.5 w-3.5 mr-1.5" />
              )}
              Test Vertex AI
            </Button>

            {/* Test result messages */}
            {claudeTestMsg && (
              <span className={`text-xs self-center ${claudeTest === "ok" ? "text-green-600" : "text-destructive"}`}>
                Claude: {claudeTestMsg}
              </span>
            )}
            {vertexTestMsg && (
              <span className={`text-xs self-center ${vertexTest === "ok" ? "text-green-600" : "text-destructive"}`}>
                Vertex: {vertexTestMsg}
              </span>
            )}
          </div>

          {/* Save */}
          <div className="flex justify-end">
            <Button type="button" onClick={handleSave} disabled={saving} size="sm">
              {saving ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : saved ? (
                <Check className="h-4 w-4 mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {saved ? "Saved!" : "Save"}
            </Button>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

// ---- Main page ------------------------------------------------------------

export default function SettingsPage() {
  const [household, setHousehold] = useState<Household | null>(null);
  const [name, setName] = useState("");
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const [aiSettings, setAiSettings] = useState<AISettingsData | null>(null);

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

  const fetchAISettings = useCallback(async () => {
    const res = await fetch("/api/settings/ai");
    const data = await res.json();
    setAiSettings(data);
  }, []);

  useEffect(() => {
    fetchHousehold();
    fetchAISettings();
  }, [fetchHousehold, fetchAISettings]);

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

  const addMember = () => setMembers([...members, { name: "", type: "adult" }]);

  const updateMember = (index: number, updates: Partial<Member>) => {
    const updated = [...members];
    updated[index] = { ...updated[index], ...updates };
    setMembers(updated);
  };

  const removeMember = (index: number) => setMembers(members.filter((_, i) => i !== index));

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

  const updateAIConfig = (purpose: "import" | "generate", updates: Partial<AIConfig>) => {
    if (!aiSettings) return;
    setAiSettings({
      ...aiSettings,
      configs: {
        ...aiSettings.configs,
        [purpose]: { ...aiSettings.configs[purpose], ...updates },
      },
    });
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
          Manage your household profile, AI configuration, and data.
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

      {/* AI Settings */}
      {aiSettings && (
        <>
          <div>
            <h2 className="text-lg font-semibold flex items-center gap-2 mb-1">
              <Bot className="h-5 w-5 text-primary" />
              AI Configuration
            </h2>
            <p className="text-sm text-muted-foreground">
              Choose which AI provider and model to use for each feature. Credentials are read from environment variables — never stored in the database.
            </p>
          </div>

          <AIProviderPanel
            label="Receipt Import"
            purpose="import"
            config={aiSettings.configs.import}
            credentials={aiSettings.credentials}
            onChange={(updates) => updateAIConfig("import", updates)}
          />

          <AIProviderPanel
            label="Recipe Generator"
            purpose="generate"
            config={aiSettings.configs.generate}
            credentials={aiSettings.credentials}
            onChange={(updates) => updateAIConfig("generate", updates)}
          />
        </>
      )}

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
