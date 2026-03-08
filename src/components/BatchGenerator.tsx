import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layers, Lock, Zap, X, Download, Heart, CheckSquare, Square } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useQueryClient } from "@tanstack/react-query";
import { STYLE_PRESETS } from "@/lib/generate-constants";
import { CREDIT_COSTS } from "@/lib/credits";
import UpgradeModal from "@/components/UpgradeModal";

type BatchJob = {
  id: string;
  prompt: string;
  style?: string;
  status: "queued" | "generating" | "done" | "failed";
  image_url?: string;
  thumbnail_id?: string;
  error?: string;
};

type BatchMode = "styles" | "prompts";

interface BatchGeneratorProps {
  visible: boolean;
  onClose: () => void;
  basePrompt: string;
  quality: "fast" | "pro";
  format: "16:9" | "9:16";
}

const BatchGenerator = ({ visible, onClose, basePrompt, quality, format }: BatchGeneratorProps) => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { canUseBatch, maxBatchSize, plan } = usePlanAccess();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<BatchMode>("styles");
  const [selectedStyles, setSelectedStyles] = useState<string[]>([]);
  const [multiPrompts, setMultiPrompts] = useState("");
  const [jobs, setJobs] = useState<BatchJob[]>([]);
  const [running, setRunning] = useState(false);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const cancelRef = useRef(false);

  const creditPerImage = quality === "fast" ? CREDIT_COSTS.FAST_GENERATE : CREDIT_COSTS.PRO_GENERATE;
  const remaining = credits?.credits_remaining ?? 0;

  const promptLines = multiPrompts.split("\n").filter((l) => l.trim());
  const jobCount = mode === "styles" ? selectedStyles.length : Math.min(promptLines.length, maxBatchSize);
  const totalCost = jobCount * creditPerImage;

  const toggleStyle = (id: string) => {
    setSelectedStyles((prev) =>
      prev.includes(id) ? prev.filter((s) => s !== id) : prev.length < maxBatchSize ? [...prev, id] : prev
    );
  };

  const buildJobs = (): BatchJob[] => {
    if (mode === "styles") {
      return selectedStyles.map((s, i) => ({
        id: `batch_${i}`,
        prompt: basePrompt,
        style: s,
        status: "queued",
      }));
    }
    return promptLines.slice(0, maxBatchSize).map((p, i) => ({
      id: `batch_${i}`,
      prompt: p.trim(),
      status: "queued",
    }));
  };

  const runBatch = useCallback(async () => {
    if (!canUseBatch) {
      setShowUpgrade(true);
      return;
    }
    if (jobCount === 0) {
      toast.error("Add at least one item to generate");
      return;
    }
    if (totalCost > remaining) {
      toast.error("Not enough credits");
      return;
    }

    const batchJobs = buildJobs();
    setJobs(batchJobs);
    setRunning(true);
    cancelRef.current = false;

    // Process with concurrency of 2
    const concurrency = 2;
    let idx = 0;

    const processNext = async () => {
      while (idx < batchJobs.length && !cancelRef.current) {
        const currentIdx = idx++;
        const job = batchJobs[currentIdx];

        setJobs((prev) =>
          prev.map((j) => (j.id === job.id ? { ...j, status: "generating" } : j))
        );

        try {
          const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
            body: {
              prompt: job.prompt,
              enhance_prompt: true,
              style: job.style || "realistic",
              format,
              quality,
              count: 1,
            },
          });

          if (error || data?.error) throw new Error(data?.error || error?.message);

          const img = data.images?.[0];
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id
                ? { ...j, status: "done", image_url: img?.image_url, thumbnail_id: img?.thumbnail_id }
                : j
            )
          );
        } catch (err: any) {
          setJobs((prev) =>
            prev.map((j) =>
              j.id === job.id ? { ...j, status: "failed", error: err.message } : j
            )
          );
        }
      }
    };

    const workers = Array.from({ length: concurrency }, () => processNext());
    await Promise.all(workers);

    setRunning(false);
    queryClient.invalidateQueries({ queryKey: ["credits"] });
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    if (!cancelRef.current) toast.success("Batch generation complete!");
  }, [canUseBatch, jobCount, totalCost, remaining, mode, selectedStyles, basePrompt, multiPrompts, format, quality, maxBatchSize, queryClient]);

  const handleCancel = () => {
    cancelRef.current = true;
    toast.info("Cancelled remaining jobs");
  };

  const doneJobs = jobs.filter((j) => j.status === "done");
  const doneCount = doneJobs.length;
  const totalJobs = jobs.length;

  if (!visible) return null;

  return (
    <>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-background/60 z-40"
        onClick={onClose}
      />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", damping: 25, stiffness: 300 }}
        className="fixed right-0 top-0 bottom-0 w-[480px] max-w-full bg-card border-l border-border z-50 flex flex-col"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-heading font-semibold text-foreground flex items-center gap-2">
            <Layers className="h-5 w-5 text-primary" /> Batch Generator
          </h3>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          {!running && jobs.length === 0 && (
            <>
              {/* Mode selector */}
              <div>
                <Label className="text-sm text-foreground mb-2 block">Mode</Label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => setMode("styles")}
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      mode === "styles" ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <p className="font-medium">Same Prompt, Multiple Styles</p>
                    <p className="text-xs mt-0.5 opacity-70">1 prompt × multiple styles</p>
                  </button>
                  <button
                    onClick={() => setMode("prompts")}
                    className={`p-3 rounded-xl border text-sm text-left transition-all ${
                      mode === "prompts" ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground"
                    }`}
                  >
                    <p className="font-medium">Multiple Prompts</p>
                    <p className="text-xs mt-0.5 opacity-70">1 image per prompt</p>
                  </button>
                </div>
              </div>

              {mode === "styles" ? (
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    Select styles ({selectedStyles.length}/{maxBatchSize})
                  </Label>
                  <div className="grid grid-cols-3 gap-2">
                    {STYLE_PRESETS.map((s) => (
                      <button
                        key={s.id}
                        onClick={() => toggleStyle(s.id)}
                        className={`p-2 rounded-lg border text-xs font-medium transition-all flex items-center gap-1.5 ${
                          selectedStyles.includes(s.id)
                            ? "bg-primary/10 border-primary/40 text-primary"
                            : "bg-muted border-border text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {selectedStyles.includes(s.id) ? (
                          <CheckSquare className="h-3 w-3 shrink-0" />
                        ) : (
                          <Square className="h-3 w-3 shrink-0" />
                        )}
                        {s.emoji} {s.label}
                      </button>
                    ))}
                  </div>
                  {!basePrompt.trim() && (
                    <p className="text-xs text-destructive mt-2">Enter a prompt on the left panel first</p>
                  )}
                </div>
              ) : (
                <div>
                  <Label className="text-sm text-foreground mb-2 block">
                    Prompts (one per line, {promptLines.length}/{maxBatchSize})
                  </Label>
                  <Textarea
                    value={multiPrompts}
                    onChange={(e) => setMultiPrompts(e.target.value)}
                    placeholder={`Shocked man holding cash, dramatic lighting\nBefore/after transformation, split screen\nPerson pointing at chart, blue background`}
                    className="min-h-[200px] bg-background border-border text-foreground text-sm"
                  />
                </div>
              )}

              {/* Cost summary */}
              <div className="glass-card rounded-lg p-3">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Estimated cost</span>
                  <span className={`font-semibold ${totalCost > remaining ? "text-destructive" : "text-foreground"}`}>
                    {totalCost} credits
                  </span>
                </div>
                <div className="flex justify-between text-sm mt-1">
                  <span className="text-muted-foreground">You have</span>
                  <span className="text-foreground font-medium">{remaining} credits</span>
                </div>
                {totalCost > remaining && (
                  <p className="text-xs text-destructive mt-1">Not enough credits — buy more or reduce items</p>
                )}
              </div>

              <Button variant="hero" size="lg" className="w-full" onClick={runBatch} disabled={jobCount === 0}>
                Generate {jobCount} variations — {totalCost} credits
              </Button>
            </>
          )}

          {/* Running / Results */}
          {jobs.length > 0 && (
            <div className="space-y-4">
              {running && (
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="text-foreground font-medium">{doneCount}/{totalJobs}</span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div
                      className="bg-primary h-2 rounded-full transition-all"
                      style={{ width: `${(doneCount / totalJobs) * 100}%` }}
                    />
                  </div>
                  <Button variant="outline" size="sm" className="w-full border-border" onClick={handleCancel}>
                    Cancel Remaining
                  </Button>
                </div>
              )}

              <div className="space-y-2">
                {jobs.map((job) => (
                  <div key={job.id} className="flex items-center gap-3 p-2 rounded-lg border border-border">
                    <div className="w-16 h-10 rounded bg-muted shrink-0 overflow-hidden">
                      {job.image_url ? (
                        <img src={job.image_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className={`w-full h-full ${job.status === "generating" ? "shimmer" : ""}`} />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs text-foreground truncate">
                        {job.style ? `Style: ${job.style}` : job.prompt.slice(0, 50)}
                      </p>
                      <Badge variant="outline" className={`text-[10px] mt-0.5 ${
                        job.status === "done" ? "text-primary border-primary/30" :
                        job.status === "generating" ? "text-secondary border-secondary/30" :
                        job.status === "failed" ? "text-destructive border-destructive/30" :
                        "border-border"
                      }`}>
                        {job.status}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>

              {!running && doneJobs.length > 0 && (
                <div className="space-y-3 pt-2 border-t border-border">
                  <div className="grid grid-cols-3 gap-2">
                    {doneJobs.map((j) => (
                      <div key={j.id} className="rounded-lg overflow-hidden border border-border aspect-video">
                        <img src={j.image_url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="hero"
                    className="w-full"
                    onClick={() => {
                      setJobs([]);
                      onClose();
                    }}
                  >
                    Done — View in My Thumbnails
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </motion.div>

      <UpgradeModal
        open={showUpgrade}
        onClose={() => setShowUpgrade(false)}
        featureName="Batch Generation"
        minimumPlan="creator"
      />
    </>
  );
};

export default BatchGenerator;
