import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RefreshCw, Link2, ClipboardPaste, Check, Download, Heart, Pencil, ArrowLeftRight, Lock, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useQueryClient } from "@tanstack/react-query";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";
import { useNavigate } from "react-router-dom";

const CREDIT_COST = 3;

const SIMILARITY_LABELS: Record<number, { label: string; desc: string }> = {
  30: { label: "Inspired", desc: "Keeps composition, changes everything else" },
  60: { label: "Remix", desc: "Similar feel, noticeably different" },
  90: { label: "Near-Clone", desc: "Almost identical, subtle changes" },
};

const LOADING_MESSAGES = [
  { range: [0, 20], text: "Analyzing original thumbnail..." },
  { range: [20, 50], text: "Extracting style and composition..." },
  { range: [50, 80], text: "Recreating with your changes..." },
  { range: [80, 100], text: "Rendering your version..." },
];

const RecreatePage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { plan } = usePlanAccess();
  const isFreePlan = ['none'].includes(plan?.toLowerCase() || '');
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [similarity, setSimilarity] = useState([60]);
  const [changes, setChanges] = useState("");
  const [language, setLanguage] = useState("original");
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [result, setResult] = useState<{ image_url: string; thumbnail_id: string } | null>(null);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const [comparePosition, setComparePosition] = useState(50);
  const abortRef = useRef(false);
  const bypassCredits = (import.meta as any).env?.VITE_BYPASS_CREDITS === "true";

  const remaining = credits?.credits_remaining ?? 0;

  // Extract video ID on URL change
  useEffect(() => {
    const match = url.match(/(?:v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
    setVideoId(match ? match[1] : null);
  }, [url]);

  const originalThumbUrl = videoId ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg` : null;

  // Progress sim
  useEffect(() => {
    if (!generating) return;
    setProgress(0);
    const interval = setInterval(() => {
      setProgress((p) => (p >= 95 ? (clearInterval(interval), 95) : p + Math.random() * 3 + 1));
    }, 600);
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessage = LOADING_MESSAGES.find((m) => progress >= m.range[0] && progress < m.range[1])?.text ?? "Generating...";

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
    } catch {
      toast.error("Could not read clipboard");
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!user || !videoId) {
      toast.error("Please enter a valid YouTube URL");
      return;
    }
    if (!bypassCredits && remaining < CREDIT_COST) {
      setShowZeroCredits(true);
      return;
    }

    setGenerating(true);
    setResult(null);
    abortRef.current = false;

    try {
      const { data, error } = await supabase.functions.invoke("recreate-thumbnail", {
        body: {
          youtube_url: url,
          similarity_strength: similarity[0],
          change_instruction: changes.trim(),
          language_change: language,
        },
      });

      if (abortRef.current) return;
      if (error) throw new Error(error.message || "Recreation failed");
      if (data?.error) {
        if (!bypassCredits && data.error === "Insufficient credits") { setShowZeroCredits(true); return; }
        throw new Error(data.error);
      }

      setResult({ image_url: data.image_url, thumbnail_id: data.thumbnail_id });
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
      toast.success("Thumbnail recreated!");
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        toast.error(message);
      }
    } finally {
      setGenerating(false);
    }
  }, [user, videoId, url, similarity, changes, language, remaining, queryClient]);

  const handleDownload = async (imageUrl: string) => {
    try {
      let finalUrl = imageUrl;
      if (credits?.plan_type === "studio") {
        const { data: upscaleData, error: upscaleError } = await supabase.functions.invoke("upscale-image", {
          body: { image_url: imageUrl },
        });
        if (!upscaleError && upscaleData?.image_url) {
          finalUrl = upscaleData.image_url;
          toast.success("4K upscale applied");
        }
      }

      const resp = await fetch(finalUrl);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `thumbai-recreate-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  };

  const handleFavorite = async (thumbnailId: string) => {
    await supabase.from("thumbnails").update({ is_favorite: true }).eq("id", thumbnailId);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    toast.success("Added to favorites");
  };

  const simKey = similarity[0] <= 30 ? 30 : similarity[0] <= 60 ? 60 : 90;

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0">
      {/* LEFT — Controls */}
      <div className="lg:w-[40%] shrink-0 overflow-y-auto space-y-5 pr-0 lg:pr-2">
        {/* Header */}
        <div>
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            🔁 Recreate from YouTube
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Paste any YouTube URL and recreate its thumbnail in your own style
          </p>
        </div>

        {/* Step 1: URL Input */}
        <div className="glass-card rounded-xl p-4 space-y-3">
          <Label className="text-sm font-medium text-foreground">Step 1 — YouTube URL</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://youtube.com/watch?v=..."
                className="pl-9 bg-background border-border text-foreground"
              />
            </div>
            <Button variant="outline" size="icon" onClick={handlePaste} className="border-border shrink-0">
              <ClipboardPaste className="h-4 w-4" />
            </Button>
          </div>
          {videoId && (
            <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-2 text-xs text-primary">
              <Check className="h-3 w-3" /> Video ID detected: {videoId}
            </motion.div>
          )}
        </div>

        {/* Original thumbnail preview */}
        <AnimatePresence>
          {originalThumbUrl && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="space-y-2">
              <Label className="text-xs text-muted-foreground">Original Thumbnail</Label>
              <div className="aspect-video rounded-xl overflow-hidden border border-border">
                <img src={originalThumbUrl} alt="Original YouTube thumbnail" className="w-full h-full object-cover" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Step 2: Style Controls */}
        <div className="glass-card rounded-xl p-4 space-y-4">
          <Label className="text-sm font-medium text-foreground">Step 2 — Style Controls</Label>

          {/* Similarity slider */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">How similar to original?</span>
              <span className="text-xs font-medium text-foreground">{similarity[0]}%</span>
            </div>
            <Slider value={similarity} onValueChange={setSimilarity} min={10} max={100} step={10} className="w-full" />
            <div className="flex justify-between text-[10px] text-muted-foreground">
              <span>← My Style</span>
              <span>Inspired</span>
              <span>Clone →</span>
            </div>
            <p className="text-xs text-primary/70">
              {SIMILARITY_LABELS[simKey]?.label}: {SIMILARITY_LABELS[simKey]?.desc}
            </p>
          </div>

          {/* Changes textarea */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">What do you want to change?</Label>
            <Textarea
              value={changes}
              onChange={(e) => setChanges(e.target.value)}
              placeholder="e.g. Replace the person with an Indian man, change background to space, keep the text style but change it to say MY RESULT"
              className="min-h-[80px] bg-background border-border text-foreground text-sm resize-none"
              maxLength={300}
            />
            <span className="text-[10px] text-muted-foreground float-right">{changes.length}/300</span>
          </div>

          {/* Language */}
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Text language</Label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-background border-border text-foreground text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-card border-border">
                <SelectItem value="original">Keep Original</SelectItem>
                <SelectItem value="Hindi">Translate to Hindi</SelectItem>
                <SelectItem value="Spanish">Translate to Spanish</SelectItem>
                <SelectItem value="Portuguese">Translate to Portuguese</SelectItem>
                <SelectItem value="French">Translate to French</SelectItem>
                <SelectItem value="German">Translate to German</SelectItem>
                <SelectItem value="Japanese">Translate to Japanese</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Step 3: Generate */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Cost: <span className="text-foreground font-semibold">{CREDIT_COST} credits</span></span>
            <span>Remaining: <span className="text-foreground font-semibold">{remaining}</span></span>
          </div>
          <Button
            variant="hero"
            size="xl"
            className="w-full"
            onClick={handleGenerate}
            disabled={generating || !videoId}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                Recreating...
              </span>
            ) : (
              <>
                <RefreshCw className="h-4 w-4 mr-2" />
                Recreate Thumbnail (3 credits)
              </>
            )}
          </Button>
        </div>
      </div>

      {/* RIGHT — Preview */}
      <div className="flex-1 min-w-0 flex flex-col">
        {generating ? (
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className="w-full max-w-lg aspect-video rounded-2xl overflow-hidden shimmer bg-muted mb-6" />
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{loadingMessage}</span>
                <span className="text-foreground font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5">
                <motion.div className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
              </div>
              <Button variant="ghostNav" size="sm" className="w-full" onClick={() => { abortRef.current = true; setGenerating(false); toast.info("Cancelled"); }}>
                Cancel
              </Button>
            </div>
          </div>
        ) : result && originalThumbUrl ? (
          <div className="flex-1 flex flex-col">
            {/* Side-by-side comparison */}
            <div className="flex-1 flex items-center justify-center mb-4">
              <div className="w-full max-w-2xl space-y-4">
                {/* Comparison slider */}
                <div className="relative aspect-video rounded-2xl overflow-hidden border border-border select-none">
                  {/* Original (full width behind) */}
                  <img src={originalThumbUrl} alt="Original" className="absolute inset-0 w-full h-full object-cover" />
                  {/* Recreated (clipped) */}
                  <div className="absolute inset-0 overflow-hidden" style={{ width: `${comparePosition}%` }}>
                    <img src={result.image_url} alt="Recreated" className="w-full h-full object-cover" style={{ width: `${(100 / comparePosition) * 100}%`, maxWidth: "none" }} />
                  </div>
                  {/* Slider handle */}
                  <div
                    className="absolute top-0 bottom-0 w-1 bg-primary cursor-col-resize z-10"
                    style={{ left: `${comparePosition}%` }}
                    onMouseDown={(e) => {
                      const rect = e.currentTarget.parentElement!.getBoundingClientRect();
                      const move = (ev: MouseEvent) => {
                        const pct = Math.max(5, Math.min(95, ((ev.clientX - rect.left) / rect.width) * 100));
                        setComparePosition(pct);
                      };
                      const up = () => { document.removeEventListener("mousemove", move); document.removeEventListener("mouseup", up); };
                      document.addEventListener("mousemove", move);
                      document.addEventListener("mouseup", up);
                    }}
                  >
                    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-primary flex items-center justify-center shadow-lg">
                      <ArrowLeftRight className="h-4 w-4 text-primary-foreground" />
                    </div>
                  </div>
                  {/* Labels */}
                  <div className="absolute top-3 left-3 px-2 py-1 bg-background/80 rounded text-[10px] font-medium text-foreground">Recreated</div>
                  <div className="absolute top-3 right-3 px-2 py-1 bg-background/80 rounded text-[10px] font-medium text-foreground">Original</div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
              <Button variant="outline" size="sm" className="border-border" onClick={() => handleDownload(result.image_url)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download
              </Button>
              <button 
                className="flex items-center justify-center bg-gradient-to-br from-[#8B47FF] to-[#6366F1] text-white font-sans text-[13px] font-semibold px-[14px] py-[7px] rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(139,71,255,0.35)] active:translate-y-0 disabled:opacity-80 disabled:cursor-not-allowed"
                onClick={(e) => { 
                  e.stopPropagation(); 
                  if (isFreePlan) { navigate('/pricing'); return; }
                  navigate(`/dashboard/smart-editor?thumbnail_id=${result.thumbnail_id}&image_url=${encodeURIComponent(result.image_url || '')}`); 
                }}
              >
                {isFreePlan ? <><Lock className="h-3.5 w-3.5 mr-1.5" /> Smart Edit</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> ✨ Smart Edit</>}
              </button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => handleFavorite(result.thumbnail_id)}>
                <Heart className="h-3.5 w-3.5 mr-1.5" /> Save
              </Button>
            </div>
          </div>
        ) : (
          /* Empty state */
          <div className="flex-1 flex flex-col items-center justify-center text-center px-6">
            <div className="w-40 h-28 rounded-2xl border-2 border-dashed border-border flex items-center justify-center mb-6">
              <RefreshCw className="h-10 w-10 text-muted-foreground/30" />
            </div>
            <h3 className="text-lg font-heading font-semibold text-foreground mb-2">Paste a YouTube URL to start</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              We'll show the original thumbnail and let you recreate it with your own style, face, and text
            </p>
          </div>
        )}
      </div>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />
    </div>
  );
};

export default RecreatePage;
