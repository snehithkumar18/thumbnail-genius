import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Monitor, Smartphone, Zap, Star, BookOpen, ChevronRight, X, Download, Heart, Share2, RefreshCw, Pencil, User, Globe, Layers, Lock, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useQueryClient } from "@tanstack/react-query";
import { useLocation, useNavigate } from "react-router-dom";
import { STYLE_PRESETS, NICHE_TEMPLATES, LOADING_MESSAGES, CTR_TIPS } from "@/lib/generate-constants";
import { CREDIT_COSTS } from "@/lib/credits";
import { LANGUAGES, type LanguageId } from "@/lib/languages";
import { cn, hapticFeedback } from "@/lib/utils";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";
import BatchGenerator from "@/components/BatchGenerator";

type GeneratedImage = {
  image_url: string;
  thumbnail_id: string;
};

const GeneratePage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { canUseBatch } = usePlanAccess();
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
  const [showBatch, setShowBatch] = useState(false);
  const [currentTip, setCurrentTip] = useState(0);
  const [activeTab, setActiveTab] = useState<"controls" | "preview">("controls");
  const abortRef = useRef(false);

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
    if (remaining < creditCost) {
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
        },
      });

      if (abortRef.current) return;

      if (error) throw new Error(error.message || "Generation failed");

      if (data?.error) {
        if (data.error === "Insufficient credits") {
          setShowZeroCredits(true);
          return;
        }
        throw new Error(data.error);
      }

      setResults(data.images || []);
      setEnhancedPrompt(data.enhanced_prompt || "");
      setProgress(100);
      setActiveTab("preview"); // Switch to preview tab on mobile
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
  }, [user, prompt, enhancePrompt, textOverlay, textContent, style, niche, format, quality, variations, language, remaining, creditCost, queryClient]);

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
      a.download = `thumbai-${Date.now()}.png`;
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
    <div className="flex flex-col lg:flex-row gap-6 h-full lg:h-[calc(100vh-60px-48px)] overflow-hidden">
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
              <p className="text-[10px] text-primary/70 mt-1">Uses Ideogram model — best for text in images</p>
              
              {/* Language selector — only when text overlay is on */}
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
          {!textOverlay && (
            <p className="text-[10px] text-muted-foreground">Uses FLUX Pro — best for photorealistic faces</p>
          )}
        </div>

        {/* Style Presets */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-3 block">Style</Label>
          <div className="flex lg:grid lg:grid-cols-3 gap-3 overflow-x-auto scroll-x scrollbar-hide -mx-4 px-4 lg:mx-0 lg:px-0">
            {STYLE_PRESETS.map((s) => (
              <button
                key={s.id}
                onClick={() => setStyle(s.id)}
                className={`group relative aspect-[4/3] rounded-xl overflow-hidden border-2 shrink-0 w-[140px] lg:w-auto snap-start transition-all ${
                  style === s.id
                    ? "border-primary ring-2 ring-primary/20 shadow-lg"
                    : "border-transparent hover:border-border"
                }`}
              >
                <img src={s.image} alt={s.label} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                <div className={`absolute inset-0 bg-black/40 transition-opacity ${style === s.id ? 'opacity-100' : 'opacity-40 group-hover:opacity-60'}`} />
                <div className="absolute inset-0 flex flex-col items-center justify-center p-2 text-center text-white">
                  <span className="text-xl mb-1">{s.emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wider">{s.label}</span>
                </div>
                {style === s.id && (
                    <div className="absolute top-1 right-1 bg-primary text-white p-0.5 rounded-full">
                        <Check className="h-3 w-3" />
                    </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Niche Templates */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Quick templates by niche</Label>
          <Select value={niche} onValueChange={handleNicheSelect}>
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Select a niche..." />
            </SelectTrigger>
            <SelectContent className="bg-card border-border">
              {Object.entries(NICHE_TEMPLATES).map(([key, val]) => (
                <SelectItem key={key} value={key} className="text-foreground">{val.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Format */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Format</Label>
          <div className="grid grid-cols-2 gap-2">
            {([["16:9", "📺 YouTube Thumbnail", Monitor], ["9:16", "📱 Shorts Cover", Smartphone]] as const).map(([f, label, Icon]) => (
              <button
                key={f}
                onClick={() => setFormat(f)}
                className={`flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium transition-all ${
                  format === f
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Quality */}
        <div>
          <Label className="text-sm font-medium text-foreground mb-2 block">Quality</Label>
          <div className="space-y-2">
            {([
              { id: "fast" as const, icon: Zap, label: "Fast", model: "Schnell", credits: 0, time: "~5s" },
              { id: "pro" as const, icon: Star, label: "Pro", model: "Ultra", credits: 0, time: "~15s" },
            ]).map((q) => (
              <button
                key={q.id}
                onClick={() => setQuality(q.id)}
                className={`w-full flex items-center gap-3 p-3 rounded-xl border text-sm transition-all ${
                  quality === q.id
                    ? "bg-primary/10 border-primary/40"
                    : "bg-muted border-border hover:border-muted-foreground/40"
                }`}
              >
                <q.icon className={`h-4 w-4 ${quality === q.id ? "text-primary" : "text-muted-foreground"}`} />
                <div className="text-left flex-1">
                  <span className={`font-medium ${quality === q.id ? "text-primary" : "text-foreground"}`}>{q.label}</span>
                  <span className="text-muted-foreground text-xs ml-2">{q.model} — {q.credits === 0 ? "Free" : `${q.credits} credit`} — {q.time}</span>
                </div>
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
                  variations === v
                    ? "bg-primary/10 border-primary/40 text-primary"
                    : "bg-muted border-border text-muted-foreground hover:text-foreground"
                }`}
              >
                {v}
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            Total cost: <span className="text-foreground font-semibold">{creditCost === 0 ? "Free" : `${creditCost} credits`}</span>
          </p>
        </div>

        {/* Batch Mode Toggle */}
        <div className="glass-card rounded-xl p-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm text-foreground font-medium">Batch Mode</span>
            {!canUseBatch && (
              <Tooltip>
                <TooltipTrigger>
                  <Lock className="h-3 w-3 text-muted-foreground" />
                </TooltipTrigger>
                <TooltipContent>Creator plan and above</TooltipContent>
              </Tooltip>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            className="text-xs border-border"
            onClick={() => setShowBatch(true)}
          >
            {canUseBatch ? "Open Batch" : "🔒 Pro Feature"}
          </Button>
        </div>

        {/* Generate Button Wrapper */}
        <div className="fixed bottom-[calc(56px+env(safe-area-inset-bottom)+1rem)] left-4 right-4 z-30 lg:relative lg:bottom-0 lg:left-0 lg:right-0 lg:z-0">
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

      <AnimatePresence>
        <BatchGenerator
          visible={showBatch}
          onClose={() => setShowBatch(false)}
          basePrompt={prompt}
          quality={quality}
          format={format}
        />
      </AnimatePresence>
    </div>
  );
};

export default GeneratePage;
