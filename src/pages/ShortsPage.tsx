import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Zap, Star, Download, Heart, Share2, RefreshCw, Pencil, X, Eye, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { useQueryClient } from "@tanstack/react-query";
import { CREDIT_COSTS } from "@/lib/credits";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";

type GeneratedImage = { image_url: string; thumbnail_id: string };

const SHORTS_STYLES = [
  { id: "viral reaction", label: "Viral Reaction", emoji: "😱" },
  { id: "pov moment", label: "POV Moment", emoji: "👁️" },
  { id: "challenge", label: "Challenge", emoji: "🔥" },
  { id: "tutorial", label: "Tutorial", emoji: "📚" },
  { id: "trending", label: "Trending", emoji: "📈" },
  { id: "aesthetic", label: "Aesthetic", emoji: "✨" },
  { id: "comedy", label: "Comedy", emoji: "😂" },
  { id: "motivational", label: "Motivational", emoji: "💪" },
  { id: "satisfying", label: "Satisfying", emoji: "🤤" },
  { id: "horror", label: "Horror", emoji: "👻" },
] as const;

const SHORTS_LOADING = [
  { range: [0, 20], text: "Optimizing for mobile viewers..." },
  { range: [20, 50], text: "Composing vertical masterpiece..." },
  { range: [50, 80], text: "Adding scroll-stopping colors..." },
  { range: [80, 99], text: "Rendering your Shorts cover..." },
];

const ShortsPage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const queryClient = useQueryClient();

  const [prompt, setPrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [textOverlay, setTextOverlay] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [style, setStyle] = useState("viral reaction");
  const [compositionGuide, setCompositionGuide] = useState(true);
  const [quality, setQuality] = useState<"fast" | "pro">("pro");
  const [variations, setVariations] = useState(1);
  const [language, setLanguage] = useState<LanguageId>("en");

  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const [showYTPreview, setShowYTPreview] = useState(false);
  const abortRef = useRef(false);

  const creditCost = (quality === "fast" ? CREDIT_COSTS.FAST_GENERATE : CREDIT_COSTS.PRO_GENERATE) * variations;
  const remaining = credits?.credits_remaining ?? 0;

  useEffect(() => {
    if (!generating) return;
    setProgress(0);
    const duration = quality === "fast" ? 8000 : 20000;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return 95; }
        return p + Math.random() * 3 + 1;
      });
    }, duration / 30);
    return () => clearInterval(interval);
  }, [generating, quality]);

  const loadingMessage = SHORTS_LOADING.find(
    (m) => progress >= m.range[0] && progress < m.range[1]
  )?.text ?? "Generating...";

  const handleGenerate = useCallback(async () => {
    if (!user || !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (remaining < creditCost) {
      setShowZeroCredits(true);
      return;
    }

    setGenerating(true);
    setResults([]);
    abortRef.current = false;

    try {
      let finalPrompt = prompt.trim();
      if (compositionGuide) {
        finalPrompt += ". Close-up face fills top 60% of frame, subject centered, bottom third reserved for text.";
      }

      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: {
          prompt: finalPrompt,
          enhance_prompt: enhancePrompt,
          text_overlay: textOverlay,
          text_content: textContent,
          style,
          format: "9:16",
          quality,
          count: variations,
          language: language !== "en" ? language : undefined,
        },
      });

      if (abortRef.current) return;
      if (error) throw new Error(error.message || "Generation failed");
      if (data?.error) {
        if (data.error === "Insufficient credits") { setShowZeroCredits(true); return; }
        throw new Error(data.error);
      }

      setResults(data.images || []);
      setEnhancedPrompt(data.enhanced_prompt || "");
      setProgress(100);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
      toast.success(`Generated ${data.images?.length || 0} Shorts cover(s)!`);
    } catch (err: any) {
      if (!abortRef.current) toast.error(err.message || "Something went wrong");
    } finally {
      setGenerating(false);
    }
  }, [user, prompt, enhancePrompt, textOverlay, textContent, style, compositionGuide, quality, variations, remaining, creditCost, queryClient]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "Enter" && !generating) {
        e.preventDefault();
        handleGenerate();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleGenerate, generating]);

  const handleCancel = () => { abortRef.current = true; setGenerating(false); toast.info("Cancelled"); };

  const handleDownload = async (url: string) => {
    try {
      const resp = await fetch(url);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `thumbai-shorts-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  };

  const handleFavorite = async (thumbnailId: string) => {
    await supabase.from("thumbnails").update({ is_favorite: true }).eq("id", thumbnailId);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    toast.success("Added to favorites");
  };

  const activeUrl = results[activeImage]?.image_url;

  return (
    <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-60px-48px)]">
      {/* LEFT — Controls */}
      <div className="lg:w-[40%] shrink-0 overflow-y-auto space-y-5 pr-2">
        {/* Header */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-xl font-heading font-bold text-foreground">📱 Shorts Cover Generator</h1>
            <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary text-[10px] font-bold uppercase tracking-wider">⚡ Shorts</span>
          </div>
          <p className="text-xs text-muted-foreground">Create vertical 9:16 thumbnails for your Shorts</p>
        </div>

        {/* Prompt */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Prompt</Label>
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Close-up shocked face, eyes wide open, pointing at camera, bold text: WAIT FOR IT, vibrant neon pink background"
              className="min-h-[120px] bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">{prompt.length}/500</span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch checked={enhancePrompt} onCheckedChange={setEnhancePrompt} id="enhance-shorts" />
            <Label htmlFor="enhance-shorts" className="text-xs text-muted-foreground cursor-pointer">
              ✨ AI will optimize prompt for vertical format
            </Label>
          </div>
        </div>

        {/* Text overlay */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Type className="h-4 w-4" /> Include text in cover
            </Label>
            <Switch checked={textOverlay} onCheckedChange={setTextOverlay} />
          </div>
          {textOverlay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}>
              <Input
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="e.g. WAIT FOR IT"
                maxLength={20}
                className="bg-background border-border text-foreground text-sm mb-2"
              />
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">
                  {textContent.split(/\s+/).filter(Boolean).length > 3 && (
                    <span className="text-secondary">⚠️ Keep it punchy! 1-3 words hit hardest</span>
                  )}
                </span>
                <span className="text-muted-foreground">{textContent.length}/20</span>
              </div>
              
              {/* Language selector */}
              <div className="mt-3">
                <Label className="text-xs text-muted-foreground mb-1.5 flex items-center gap-1"><Globe className="h-3 w-3" /> Text Language</Label>
                <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
                  {LANGUAGES.map(l => (
                    <button
                      key={l.id}
                      onClick={() => setLanguage(l.id)}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-[10px] font-medium border transition-all ${
                        language === l.id
                          ? "bg-primary/10 border-primary/40 text-primary"
                          : "bg-muted border-border text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {l.flag} {l.label}
                    </button>
                  ))}
                </div>
                {language !== "en" && (
                  <Badge variant="outline" className="mt-1.5 text-[10px] border-primary/30 text-primary">
                    Using Ideogram 3.0 — best for {LANGUAGES.find(l => l.id === language)?.label} text
                  </Badge>
                )}
              </div>
            </motion.div>
          )}
        </div>

        {/* Style Presets */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Shorts Style</Label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {SHORTS_STYLES.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
                  style === s.id
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground hover:border-muted-foreground/40"
                }`}
              >
                {s.emoji} {s.label}
              </button>
            ))}
          </div>
        </div>

        {/* Composition Guide */}
        <div className="flex items-center justify-between glass-card rounded-xl p-4">
          <div>
            <Label className="text-sm font-medium text-foreground">🎯 Composition Guide</Label>
            <p className="text-[10px] text-muted-foreground mt-0.5">Face fills top 60%, text area at bottom</p>
          </div>
          <Switch checked={compositionGuide} onCheckedChange={setCompositionGuide} />
        </div>

        {/* Quality */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Quality</Label>
          <div className="space-y-2">
            {([
              { id: "fast" as const, icon: Zap, label: "Fast", credits: 1, time: "~5s" },
              { id: "pro" as const, icon: Star, label: "Pro", credits: 2, time: "~15s" },
            ]).map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                  quality === q.id ? "bg-primary/10 border-primary/40" : "bg-muted border-border hover:border-muted-foreground/40"
                }`}
              >
                <q.icon className={`h-4 w-4 ${quality === q.id ? "text-primary" : "text-muted-foreground"}`} />
                <span className={`font-medium ${quality === q.id ? "text-primary" : "text-foreground"}`}>{q.label}</span>
                <span className="text-muted-foreground text-xs ml-auto">{q.credits} credit — {q.time}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Variations */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Variations</Label>
          <div className="flex gap-2">
            {[1, 2, 4].map((v) => (
              <button
                key={v}
                onClick={() => setVariations(v)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${
                  variations === v ? "bg-primary/10 border-primary/40 text-primary" : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">Total cost: <span className="text-foreground font-semibold">{creditCost} credits</span></p>
        </div>

        {/* Generate */}
        <Button variant="hero" size="xl" className="w-full" onClick={handleGenerate} disabled={generating || !prompt.trim()}>
          {generating ? (
            <span className="flex items-center gap-2">
              <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
              Generating...
            </span>
          ) : (
            <>Generate Shorts Cover ({creditCost} credits)</>
          )}
        </Button>
        <p className="text-[10px] text-center text-muted-foreground -mt-3">⌘ + Enter</p>
      </div>

      {/* RIGHT — Phone Mockup Preview */}
      <div className="flex-1 min-w-0 flex flex-col items-center justify-center">
        {/* Phone Frame */}
        <div className="relative mx-auto" style={{ width: "min(280px, 100%)" }}>
          {/* Phone bezel */}
          <div className="rounded-[2.5rem] border-[6px] border-foreground/20 bg-background overflow-hidden shadow-2xl shadow-primary/5">
            {/* Notch */}
            <div className="relative h-6 bg-background flex items-center justify-center">
              <div className="w-20 h-4 bg-foreground/20 rounded-b-xl" />
            </div>

            {/* Screen */}
            <div className="aspect-[9/16] bg-muted overflow-hidden relative">
              {generating ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center p-6">
                  <div className="w-full h-full shimmer rounded-lg bg-muted" />
                  <div className="absolute bottom-8 left-4 right-4 space-y-2">
                    <p className="text-[10px] text-muted-foreground text-center">{loadingMessage}</p>
                    <div className="w-full bg-border rounded-full h-1">
                      <motion.div className="bg-gradient-to-r from-primary to-secondary h-1 rounded-full" animate={{ width: `${progress}%` }} transition={{ duration: 0.3 }} />
                    </div>
                    <Button variant="ghostNav" size="sm" className="w-full text-xs" onClick={handleCancel}>Cancel</Button>
                  </div>
                </div>
              ) : activeUrl ? (
                <img src={activeUrl} alt="Shorts cover" className="w-full h-full object-cover" />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6">
                  <div className="w-12 h-12 rounded-xl bg-muted-foreground/10 flex items-center justify-center mb-3">
                    <Sparkles className="h-6 w-6 text-muted-foreground" />
                  </div>
                  <p className="text-xs text-muted-foreground font-medium">Your Shorts cover will appear here</p>
                  <p className="text-[10px] text-muted-foreground/60 mt-1">Use bold faces & bright colors</p>
                </div>
              )}
            </div>

            {/* Bottom bar */}
            <div className="h-4 bg-background" />
          </div>
        </div>

        {/* Info below phone */}
        <p className="text-[10px] text-muted-foreground mt-3 text-center">1080 × 1920px • YouTube Shorts optimized</p>

        {/* Actions below phone */}
        {results.length > 0 && (
          <div className="mt-4 space-y-3 w-full max-w-sm">
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <Button variant="outline" size="sm" className="border-border" onClick={() => handleDownload(activeUrl)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download 1080×1920
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                <Pencil className="h-3.5 w-3.5 mr-1.5" /> Edit
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => handleFavorite(results[activeImage].thumbnail_id)}>
                <Heart className="h-3.5 w-3.5 mr-1.5" /> Favorite
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => setShowYTPreview(true)}>
                <Eye className="h-3.5 w-3.5 mr-1.5" /> See on YouTube
              </Button>
            </div>

            {/* Variations strip */}
            {results.length > 1 && (
              <div className="flex items-center justify-center gap-2">
                {results.map((r, i) => (
                  <button
                    key={r.thumbnail_id}
                    onClick={() => setActiveImage(i)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeImage ? "border-primary ring-1 ring-primary/30" : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={r.image_url} alt="" className="w-10 h-[72px] object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Enhanced prompt */}
            {enhancedPrompt && enhancedPrompt !== prompt && (
              <div className="glass-card rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">✨ Enhanced Prompt</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{enhancedPrompt}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* YouTube Shorts Preview Modal */}
      <Dialog open={showYTPreview} onOpenChange={setShowYTPreview}>
        <DialogContent className="max-w-sm p-0 bg-black border-none overflow-hidden rounded-2xl">
          {/* Fake YT Shorts player */}
          <div className="relative aspect-[9/16]">
            {activeUrl && <img src={activeUrl} alt="Shorts preview" className="w-full h-full object-cover" />}
            {/* YT Shorts UI overlay */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Top bar */}
              <div className="absolute top-0 left-0 right-0 p-4 flex items-center justify-between">
                <span className="text-white font-bold text-sm">Shorts</span>
                <div className="flex gap-3">
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                  <div className="w-6 h-6 rounded-full bg-white/20" />
                </div>
              </div>
              {/* Right side actions */}
              <div className="absolute right-3 bottom-24 flex flex-col items-center gap-5">
                {["👍", "👎", "💬", "↗️"].map((e, i) => (
                  <div key={i} className="flex flex-col items-center gap-1">
                    <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm">{e}</div>
                    <span className="text-white/60 text-[9px]">{["Like", "Dislike", "Comment", "Share"][i]}</span>
                  </div>
                ))}
              </div>
              {/* Bottom info */}
              <div className="absolute bottom-4 left-4 right-16">
                <p className="text-white font-semibold text-sm mb-1">@yourchannel</p>
                <p className="text-white/80 text-xs">Your Shorts video title goes here #shorts</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />
    </div>
  );
};

export default ShortsPage;
