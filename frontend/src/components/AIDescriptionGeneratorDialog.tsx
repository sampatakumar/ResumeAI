import { useEffect, useMemo, useState } from "react";
import { Sparkles } from "lucide-react";
import { toast } from "sonner";
import { apiRequest } from "@/lib/api";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";

type Tone = "professional" | "confident" | "concise";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  idToken?: string | null | undefined;
  title: string;
  defaultPrompt: string;
  context: string;
  onApply: (nextValue: string) => void;
};

const AIDescriptionGeneratorDialog = ({
  open,
  onOpenChange,
  idToken,
  title,
  defaultPrompt,
  context,
  onApply
}: Props) => {
  const [customPrompt, setCustomPrompt] = useState("");
  const [tone, setTone] = useState<Tone>("professional");
  const [generating, setGenerating] = useState(false);
  const [previewBullets, setPreviewBullets] = useState<string[]>([]);

  useEffect(() => {
    if (open) {
      setCustomPrompt("");
      setTone("professional");
      setPreviewBullets([]);
    }
  }, [open]);

  const effectivePrompt = useMemo(() => {
    const trimmed = customPrompt.trim();
    return trimmed || defaultPrompt;
  }, [customPrompt, defaultPrompt]);

  const handleGenerate = async () => {
    setGenerating(true);
    try {
      const response = await apiRequest<{ bullets: string[] }>("/ai/description-bullets", {
        method: "POST",
        body: {
          prompt: effectivePrompt,
          context,
          tone,
          count: 3
        }
      });

      const bullets = (response.data.bullets || []).map((item) => item.trim()).filter(Boolean);
      if (!bullets.length) {
        toast.error("AI returned empty output");
        return;
      }

      setPreviewBullets(bullets);
      toast.success("Preview generated. Review and insert when ready.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to generate points");
    } finally {
      setGenerating(false);
    }
  };

  const handleInsert = () => {
    if (!previewBullets.length) {
      toast.info("Generate a preview first");
      return;
    }

    onApply(previewBullets.join("\n"));
    onOpenChange(false);
    toast.success("Inserted generated points.");
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass border-border/50 w-[calc(100vw-1rem)] sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-primary" /> {title}
          </DialogTitle>
          <DialogDescription>
            Enter your own prompt or leave it blank to use the default ATS-optimized prompt for 3 high-quality points.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Custom prompt (optional)</p>
          <Textarea
            value={customPrompt}
            onChange={(event) => setCustomPrompt(event.target.value)}
            placeholder={defaultPrompt}
            className="min-h-[120px] bg-background/50 resize-y"
          />
          {!customPrompt.trim() && (
            <p className="text-xs text-muted-foreground">Using default prompt: {defaultPrompt}</p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Tone</p>
          <Select value={tone} onValueChange={(value) => setTone(value as Tone)}>
            <SelectTrigger className="bg-background/50 focus:ring-primary">
              <SelectValue placeholder="Select tone" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="confident">Confident</SelectItem>
              <SelectItem value="concise">Concise</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Preview</p>
          <div className="min-h-[110px] rounded-md border border-border/50 bg-background/40 p-3">
            {previewBullets.length ? (
              <ul className="space-y-2 text-sm text-foreground">
                {previewBullets.map((bullet, index) => (
                  <li key={`${index}-${bullet.slice(0, 24)}`} className="leading-relaxed">
                    - {bullet}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-muted-foreground">No preview yet. Click Generate to preview 3 points.</p>
            )}
          </div>
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={generating}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleGenerate} disabled={generating || !idToken} className="glow-primary">
            {generating ? "Generating..." : previewBullets.length ? "Regenerate" : "Generate"}
          </Button>
          <Button variant="hero" onClick={handleInsert} disabled={generating || !idToken || !previewBullets.length} className="glow-primary">
            Insert
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AIDescriptionGeneratorDialog;
