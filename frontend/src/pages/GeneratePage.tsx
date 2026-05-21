import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Zap, BookOpen, ChevronRight, X, Download, Heart, Share2, RefreshCw, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { NICHE_TEMPLATES, LOADING_MESSAGES, CTR_TIPS } from "@/lib/generate-constants";
import { CREDIT_COSTS } from "@/lib/credits";
import { type LanguageId } from "@/lib/languages";
import { hapticFeedback } from "@/lib/utils";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";

type GeneratedImage = {
  image_url: string;
  thumbnail_id: string;
  provider?: string;
  model_used?: string;
};

const GeneratePage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { plan } = usePlanAccess();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Controls
  const [prompt, setPrompt] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [textOverlay, setTextOverlay] = useState(false);
  const [textContent, setTextContent] = useState("");
  const [style, setStyle] = useState("realistic");
  const [niche, setNiche] = useState("");
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  const [quality, setQuality] = useState<"fast" | "pro">("pro");
  const [modelChoice, setModelChoice] = useState("auto");
  const [variations, setVariations] = useState(1);
  const [language, setLanguage] = useState<LanguageId>("en");

  // State
  const [generating, setGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<GeneratedImage[]>([]);
  const [enhancedPrompt, setEnhancedPrompt] = useState("");
  const [activeImage, setActiveImage] = useState(0);
  const [showPromptLibrary, setShowPromptLibrary] = useState(false);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [activeTab, setActiveTab] = useState<"controls" | "preview">("controls");
  const [showPollinationsUpsell, setShowPollinationsUpsell] = useState(false);
  const abortRef = useRef(false);
  const bypassCredits = (import.meta as any).env?.VITE_BYPASS_CREDITS === "true";

  // Accept prefilled prompt from navigation state
  useEffect(() => {
    const state = location.state as { prefillPrompt?: string } | null;
    if (state?.prefillPrompt) {
      setPrompt(state.prefillPrompt);
      // Clear state so it doesn't persist on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const creditCost = (quality === "fast" ? CREDIT_COSTS.FAST_GENERATE : CREDIT_COSTS.PRO_GENERATE) * variations;
  const remaining = credits?.credits_remaining ?? 0;

  // Progress simulation during generation
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

  // Rotate tips during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % CTR_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessage = LOADING_MESSAGES.find(
    (m) => progress >= m.range[0] && progress < m.range[1]
  )?.text ?? "Generating...";

  const handleNicheSelect = (nicheKey: string) => {
    setNiche(nicheKey);
    const templates = NICHE_TEMPLATES[nicheKey];
    if (templates && templates.prompts.length > 0) {
      setPrompt(templates.prompts[0]);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!user || !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }
    if (!bypassCredits && remaining < creditCost) {
      setShowZeroCredits(true);
      return;
    }

    setGenerating(true);
    setResults([]);
    abortRef.current = false;

    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: {
          prompt: prompt.trim(),
          enhance_prompt: enhancePrompt,
          text_overlay: textOverlay,
          text_content: textContent,
          style,
          niche,
          format,
          quality,
          count: variations,
          language: language !== "en" ? language : undefined,
          model_choice: modelChoice,
        },
      });

      if (abortRef.current) return;

      if (error) throw new Error(error.message || "Generation failed");

      if (data?.error) {
        if (!bypassCredits && data.error === "Insufficient credits") {
          setShowZeroCredits(true);
          return;
        }
        throw new Error(data.error);
      }

      setResults(data.images || []);
      setEnhancedPrompt(data.enhanced_prompt || "");
      setProgress(100);
      setActiveTab("preview"); // Switch to preview tab on mobile
      if (credits?.plan_type === "free" || credits?.plan_type === "none") {
        const usedPollinations = (data.images || []).some((img: GeneratedImage) => img.provider === "pollinations");
        if (usedPollinations) setShowPollinationsUpsell(true);
      }
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnail-stats"] });
      toast.success(`Generated ${data.images?.length || 0} thumbnail(s)!`);
    } catch (err: unknown) {
      if (!abortRef.current) {
        const message = err instanceof Error ? err.message : "Something went wrong";
        toast.error(message);
      }
    } finally {
      setGenerating(false);
    }
  }, [user, prompt, enhancePrompt, textOverlay, textContent, style, niche, format, quality, variations, language, remaining, creditCost, queryClient, credits?.plan_type, modelChoice]);

  // Cmd+Enter shortcut
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

  const handleCancel = () => {
    abortRef.current = true;
    setGenerating(false);
    toast.info("Generation cancelled");
  };

  const handleDownload = async (url: string) => {
    try {
      let finalUrl = url;
      if (credits?.plan_type === "studio") {
        const { data: upscaleData, error: upscaleError } = await supabase.functions.invoke("upscale-image", {
          body: { image_url: url },
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
      a.download = `Thumbly-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch {
      toast.error("Download failed");
    }
  };

  const handleFavorite = async (thumbnailId: string) => {
    await supabase.from("thumbnails").update({ is_favorite: true }).eq("id", thumbnailId);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    toast.success("Added to favorites");
  };

  const handleGenerateClick = () => {
    hapticFeedback(20);
    handleGenerate();
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-0 overflow-hidden">
      {/* Mobile Tab Switcher */}
      <div className="lg:hidden flex p-1 bg-muted rounded-xl mb-2">
        {(["controls", "preview"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all ${
              activeTab === tab ? "bg-white text-primary shadow-sm" : "text-muted-foreground"
            }`}
          >
            {tab === "controls" ? "⚙️ Controls" : "🖼️ Preview"}
          </button>
        ))}
      </div>

      {/* LEFT — Controls */}
      <div className={`flex-1 lg:flex-[0.4] overflow-y-auto space-y-6 pb-24 lg:pb-0 scrollbar-hide ${activeTab === "preview" ? "hidden lg:block" : "block"}`}>
        {/* Prompt */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-sm font-medium text-foreground">Prompt</Label>
            <button
              onClick={() => setShowPromptLibrary(true)}
              className="flex items-center gap-1 text-xs text-primary hover:underline"
            >
              <BookOpen className="h-3 w-3" /> Prompt Library
            </button>
          </div>
          <div className="relative">
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g. Shocked Indian man holding ₹1 lakh cash, bold text saying I MADE THIS IN 1 WEEK, dramatic red lighting"
              className="min-h-[120px] bg-background border-border text-foreground placeholder:text-muted-foreground resize-none"
              maxLength={500}
            />
            <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
              {prompt.length}/500
            </span>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Switch checked={enhancePrompt} onCheckedChange={setEnhancePrompt} id="enhance" />
            <Label htmlFor="enhance" className="text-xs text-muted-foreground cursor-pointer">
              ✨ AI will improve your prompt before generating
            </Label>
          </div>
        </div>

        {/* Text overlay */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <Type className="h-4 w-4" /> Include text in thumbnail
            </Label>
            <Switch checked={textOverlay} onCheckedChange={setTextOverlay} />
          </div>
          {textOverlay && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <Input
                value={textContent}
                onChange={(e) => setTextContent(e.target.value)}
                placeholder="e.g. I MADE THIS IN 1 WEEK"
                maxLength={30}
                className="bg-background border-border text-foreground text-sm mb-2"
              />
              <div className="flex justify-between text-[10px]">
                <span className="text-muted-foreground">
                  {textContent.split(/\s+/).filter(Boolean).length > 4 && (
                    <span className="text-secondary">⚠️ Shorter text performs better!</span>
                  )}
                </span>
                <span className="text-muted-foreground">{textContent.length}/30</span>
              </div>
            </motion.div>
          )}
          {!textOverlay && (
            <p className="text-[10px] text-muted-foreground">Uses FLUX Pro — best for photorealistic faces</p>
          )}
        </div>

        {/* Generate Button Wrapper */}
        <div className="fixed bottom-4 left-4 right-4 z-30 lg:relative lg:bottom-0 lg:left-0 lg:right-0 lg:z-0">
          <Button
            variant="hero"
            size="xl"
            className="w-full shadow-2xl lg:shadow-none"
            onClick={handleGenerateClick}
            disabled={generating || !prompt.trim()}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                Generating...
              </span>
            ) : (
              <>Generate Thumbnail ({creditCost === 0 ? "Free" : `${creditCost} credits`})</>
            )}
          </Button>
          <p className="hidden lg:block text-[10px] text-center text-muted-foreground mt-2">
            ⌘ + Enter
          </p>
        </div>
      </div>

      {/* RIGHT — Preview */}
      <div className={`flex-1 min-w-0 flex flex-col ${activeTab === "controls" ? "hidden lg:flex" : "flex"}`}>
        {generating ? (
          /* Loading State */
          <div className="flex-1 flex flex-col items-center justify-center">
            <div className={`w-full max-w-lg ${format === "9:16" ? "aspect-[9/16] max-h-[60vh]" : "aspect-video"} rounded-2xl overflow-hidden shimmer bg-muted mb-6`} />
            <div className="w-full max-w-xs space-y-3">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">{loadingMessage}</span>
                <span className="text-foreground font-medium">{Math.round(progress)}%</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 mb-4">
                <motion.div
                  className="bg-gradient-to-r from-primary to-secondary h-1.5 rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              {/* CTR Tip Card */}
              <AnimatePresence mode="wait">
                  <motion.div
                    key={currentTip}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="p-4 bg-primary/5 border border-primary/10 rounded-2xl text-center"
                  >
                    <p className="text-[10px] uppercase font-bold text-primary tracking-widest mb-1">💡 CTR Tip</p>
                    <p className="text-xs text-foreground/80 italic">"{CTR_TIPS[currentTip]}"</p>
                  </motion.div>
              </AnimatePresence>

              <Button variant="ghostNav" size="sm" className="w-full mt-4" onClick={handleCancel}>
                Cancel
              </Button>
            </div>
          </div>
        ) : results.length > 0 ? (
          /* Generated State */
          <div className="flex-1 flex flex-col">
            {/* Main image */}
            <div className="flex-1 flex items-center justify-center mb-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className={`relative w-full max-w-2xl ${format === "9:16" ? "aspect-[9/16] max-h-[55vh]" : "aspect-video"} rounded-2xl overflow-hidden border border-border`}
              >
                <img
                  src={results[activeImage]?.image_url}
                  alt="Generated thumbnail"
                  className="w-full h-full object-cover"
                />
              </motion.div>
            </div>

            {/* Action bar */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-4">
              <Button variant="outline" size="sm" className="border-border">
                <User className="h-3.5 w-3.5 mr-1.5" /> Face Swap
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={() => handleDownload(results[activeImage].image_url)}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Download PNG
              </Button>
              <button 
                className="flex items-center justify-center bg-gradient-to-br from-[#8B47FF] to-[#6366F1] text-white font-sans text-[13px] font-semibold px-[14px] py-[7px] rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(139,71,255,0.35)] active:translate-y-0 disabled:opacity-80 disabled:cursor-not-allowed"
                onClick={() => navigate(`/dashboard/smart-editor?thumbnail_id=${results[activeImage].thumbnail_id}&image_url=${encodeURIComponent(results[activeImage].image_url)}`)}
              >
                {['none'].includes(plan.toLowerCase()) ? (
                    <><Lock className="h-3.5 w-3.5 mr-1.5" /> Smart Edit</>
                ) : (
                    <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> ✨ Smart Edit</>
                )}
              </button>
              <Button
                variant="outline"
                size="sm"
                className="border-border"
                onClick={() => handleFavorite(results[activeImage].thumbnail_id)}
              >
                <Heart className="h-3.5 w-3.5 mr-1.5" /> Favorite
              </Button>
              <Button variant="outline" size="sm" className="border-border">
                <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
              </Button>
              <Button variant="outline" size="sm" className="border-border" onClick={handleGenerate}>
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            </div>

            {/* Variations strip */}
            {results.length > 1 && (
              <div className="flex items-center justify-center gap-3">
                {results.map((r, i) => (
                  <button
                    key={r.thumbnail_id}
                    onClick={() => setActiveImage(i)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${
                      i === activeImage ? "border-primary ring-1 ring-primary/30" : "border-border opacity-60 hover:opacity-100"
                    }`}
                  >
                    <img src={r.image_url} alt="" className="w-20 h-12 object-cover" />
                  </button>
                ))}
              </div>
            )}

            {/* Enhanced prompt */}
            {enhancedPrompt && enhancedPrompt !== prompt && (
              <div className="mt-4 glass-card rounded-xl p-3">
                <p className="text-[10px] uppercase text-muted-foreground tracking-wider mb-1">✨ Enhanced Prompt Used</p>
                <p className="text-xs text-foreground/80 leading-relaxed">{enhancedPrompt}</p>
              </div>
            )}
          </div>
        ) : (
          /* Empty State */
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className={`w-full max-w-sm ${format === "9:16" ? "aspect-[9/16] max-h-[40vh]" : "aspect-video"} rounded-2xl border-2 border-dashed border-border flex flex-col items-center justify-center mb-6`}>
              <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
                <Sparkles className="h-8 w-8 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground font-medium">Your thumbnail will appear here</p>
            </div>
            <p className="text-xs text-muted-foreground max-w-xs">
              💡 Tip: Add specific emotions and colors for best results
            </p>
          </div>
        )}
      </div>

      {/* Prompt Library Slide-in */}
      <AnimatePresence>
        {showPromptLibrary && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-background/60 z-40"
              onClick={() => setShowPromptLibrary(false)}
            />
            <motion.div
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="fixed right-0 top-0 bottom-0 w-[380px] max-w-full bg-card border-l border-border z-50 flex flex-col"
            >
              <div className="flex items-center justify-between p-4 border-b border-border">
                <h3 className="font-heading font-semibold text-foreground">📚 Prompt Library</h3>
                <Button variant="ghost" size="icon" onClick={() => setShowPromptLibrary(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
              <ScrollArea className="flex-1 p-4">
                {Object.entries(NICHE_TEMPLATES).map(([key, val]) => (
                  <div key={key} className="mb-6">
                    <h4 className="text-xs uppercase tracking-wider text-muted-foreground font-semibold mb-3">
                      {val.label}
                    </h4>
                    <div className="space-y-2">
                      {val.prompts.map((p, i) => (
                        <button
                          key={i}
                          onClick={() => {
                            setPrompt(p);
                            setNiche(key);
                            setShowPromptLibrary(false);
                            toast.success("Prompt loaded!");
                          }}
                          className="w-full text-left p-3 rounded-lg border border-border hover:border-primary/30 hover:bg-primary/5 transition-all group"
                        >
                          <p className="text-xs text-foreground leading-relaxed">{p}</p>
                          <span className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 mt-1">
                            Click to use <ChevronRight className="h-3 w-3" />
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </ScrollArea>
            </motion.div>
          </>
        )}
      </AnimatePresence>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />

      <Dialog open={showPollinationsUpsell} onOpenChange={setShowPollinationsUpsell}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Upgrade for Realistic Quality</DialogTitle>
            <DialogDescription>
              Don’t compromise with quality. Upgrade to Pro for more realistic thumbnails and premium models.
            </DialogDescription>
          </DialogHeader>
          <div className="flex gap-2 justify-end">
            <Button variant="outline" onClick={() => setShowPollinationsUpsell(false)}>Not now</Button>
            <Button variant="hero" onClick={() => navigate("/pricing")}>Upgrade to Pro</Button>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default GeneratePage;
