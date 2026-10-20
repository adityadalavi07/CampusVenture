import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Sparkles,
  Key,
  Flame,
  Scale,
  Smile,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import {
  getAIConfig,
  saveAIConfig,
  testAIConnection,
  type AIConfig,
  type HonestyLevel,
} from "@/lib/ai-readiness";
import { toast } from "sonner";

interface AISettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfigSaved?: () => void;
}

export function AISettingsDialog({ open, onOpenChange, onConfigSaved }: AISettingsDialogProps) {
  const [config, setConfig] = useState<AIConfig>(() => getAIConfig());
  const [showKey, setShowKey] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);

  // Sync state whenever opened
  function handleOpenChange(nextOpen: boolean) {
    if (nextOpen) {
      setConfig(getAIConfig());
      setTestResult(null);
    }
    onOpenChange(nextOpen);
  }

  function handleSave() {
    saveAIConfig(config);
    toast.success("AI Configuration updated successfully!");
    if (onConfigSaved) onConfigSaved();
    onOpenChange(false);
  }

  async function handleTest() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await testAIConnection(config);
      setTestResult(res);
      if (res.success) {
        toast.success(res.message);
      } else {
        toast.error(res.message);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      setTestResult({ success: false, message: msg });
      toast.error(msg);
    } finally {
      setTesting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-[540px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Sparkles className="size-4" />
            </div>
            <div>
              <DialogTitle className="text-base">AI Investment Readiness Engine</DialogTitle>
              <DialogDescription className="text-xs">
                Configure your AI model and due diligence honesty parameters
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 py-2 text-sm">
          {/* Provider Selection */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold">AI Provider</Label>
            <div className="flex flex-col items-start rounded-lg border border-primary bg-primary/5 ring-1 ring-primary p-3 text-left">
              <div className="flex items-center justify-between w-full">
                <span className="font-semibold text-xs flex items-center gap-1.5">
                  Google Gemini
                </span>
                <Badge variant="secondary" className="text-[10px] py-0 px-1.5">
                  Recommended · Free Tier
                </Badge>
              </div>
              <span className="text-[11px] text-muted-foreground mt-1">
                Fast, generous free tier via Google AI Studio (gemini-1.5-flash)
              </span>
            </div>
          </div>

          {/* Model Selection */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold">Model</Label>
            <select
              value={config.model}
              onChange={(e) => setConfig((p) => ({ ...p, model: e.target.value }))}
              className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-xs focus:ring-1 focus:ring-primary"
            >
              <option value="gemini-1.5-flash">gemini-1.5-flash (Fastest &amp; Free Tier Recommended)</option>
              <option value="gemini-2.0-flash">gemini-2.0-flash (Latest Next-Gen)</option>
              <option value="gemini-1.5-pro">gemini-1.5-pro (Deep Due Diligence Analysis)</option>
            </select>
          </div>

          {/* API Key Input */}
          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Key className="size-3 text-muted-foreground" />
                API Key
              </Label>
              <a
                href={
                  config.provider === "gemini"
                    ? "https://aistudio.google.com/app/apikey"
                    : "https://platform.openai.com/api-keys"
                }
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-primary hover:underline flex items-center gap-1"
              >
                Get Free Google Gemini API Key
                <ExternalLink className="size-2.5" />
              </a>
            </div>
            <div className="relative">
              <Input
                type={showKey ? "text" : "password"}
                placeholder="AIzaSy..."
                value={config.apiKey}
                onChange={(e) => setConfig((p) => ({ ...p, apiKey: e.target.value }))}
                className="pr-20 text-xs font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground text-xs"
              >
                {showKey ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Stored locally in your browser. Leave blank to use built-in offline Due Diligence Engine.
            </p>
          </div>

          {/* Test Connection Button */}
          {config.apiKey.trim() && (
            <div className="flex items-center justify-between rounded-lg border bg-muted/30 p-2.5">
              <span className="text-xs text-muted-foreground">Verify your API credentials</span>
              <Button
                size="sm"
                variant="outline"
                type="button"
                onClick={handleTest}
                disabled={testing}
                className="h-7 text-xs gap-1.5"
              >
                {testing ? <Loader2 className="size-3 animate-spin" /> : null}
                {testing ? "Testing..." : "Test Connection"}
              </Button>
            </div>
          )}

          {testResult && (
            <div
              className={`flex items-start gap-2 rounded-lg p-2.5 text-xs ${
                testResult.success
                  ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20"
                  : "bg-destructive/10 text-destructive border border-destructive/20"
              }`}
            >
              {testResult.success ? (
                <CheckCircle2 className="size-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="size-4 shrink-0 mt-0.5" />
              )}
              <span className="leading-tight">{testResult.message}</span>
            </div>
          )}

          {/* Honesty Function Selector */}
          <div className="space-y-2 pt-1 border-t">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-semibold flex items-center gap-1.5">
                <Flame className="size-3.5 text-amber-500" />
                Honesty Function (Truth Calibration)
              </Label>
              <Badge
                variant="outline"
                className={
                  config.honestyLevel === "brutal"
                    ? "border-red-500/40 text-red-600 dark:text-red-400 bg-red-500/10"
                    : "border-primary/40 text-primary"
                }
              >
                {config.honestyLevel === "brutal"
                  ? "Zero Sugarcoating"
                  : config.honestyLevel === "strict"
                    ? "Institutional VC"
                    : "Constructive"}
              </Badge>
            </div>

            <RadioGroup
              value={config.honestyLevel}
              onValueChange={(val) => setConfig((p) => ({ ...p, honestyLevel: val as HonestyLevel }))}
              className="grid gap-2"
            >
              <label
                className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                  config.honestyLevel === "brutal"
                    ? "border-red-500/50 bg-red-500/5 ring-1 ring-red-500/30"
                    : "hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="brutal" id="r-brutal" className="mt-0.5 text-red-600" />
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs font-semibold text-foreground">
                      🔥 Brutal VC Due Diligence (No Sugarcoating)
                    </span>
                    <Badge className="bg-red-500 text-white text-[9px] py-0 px-1">
                      Recommended
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Evaluates your startup like a cynical Silicon Valley GP or Shark Tank investor. Zero false praise. Calls out fake moats, commodity wrappers, weak unit economics, and punishes vanity metrics.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                  config.honestyLevel === "strict"
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="strict" id="r-strict" className="mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Scale className="size-3 text-primary" />
                    Strict Angel Investor
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Objective and rigorous scrutiny. Questions market size assumptions and technical differentiation without aggressive harshness.
                  </p>
                </div>
              </label>

              <label
                className={`flex items-start gap-3 rounded-lg border p-2.5 cursor-pointer transition-colors ${
                  config.honestyLevel === "balanced"
                    ? "border-primary/50 bg-primary/5 ring-1 ring-primary/30"
                    : "hover:bg-muted/40"
                }`}
              >
                <RadioGroupItem value="balanced" id="r-balanced" className="mt-0.5" />
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                    <Smile className="size-3 text-muted-foreground" />
                    Constructive Mentor
                  </span>
                  <p className="text-[11px] text-muted-foreground leading-relaxed">
                    Direct feedback balanced with encouraging tips and advice for early student founders.
                  </p>
                </div>
              </label>
            </RadioGroup>
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)} className="text-xs">
            Cancel
          </Button>
          <Button size="sm" onClick={handleSave} className="text-xs gap-1.5">
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
