import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Type, Zap, BookOpen, ChevronRight, X, Download, Heart, Share2, RefreshCw, User, Upload, Camera, UserCircle } from "lucide-react";
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
import { useQueryClient, useQuery } from "@tanstack/react-query";
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

const extractQuotedText = (promptStr: string): string => {
  const match = promptStr.match(/"([^"]{2,40})"|'([^']{2,40})'/);
  return (match ? (match[1] || match[2] || "") : "").trim();
};

const GeneratePage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { plan } = usePlanAccess();
  const queryClient = useQueryClient();
  const location = useLocation();
  const navigate = useNavigate();

  // Controls
  const [inputMode, setInputMode] = useState<"prompt" | "script">("prompt");
  const [prompt, setPrompt] = useState("");
  const [script, setScript] = useState("");
  const [enhancePrompt, setEnhancePrompt] = useState(true);
  const [style, setStyle] = useState("realistic");
  const [niche, setNiche] = useState("");
  const [format, setFormat] = useState<"16:9" | "9:16">("16:9");
  const [quality, setQuality] = useState<"fast" | "pro">("pro");
  const [modelChoice, setModelChoice] = useState("auto");
  const [variations, setVariations] = useState(1);
  const [language, setLanguage] = useState<LanguageId>("en");
  const [analyzingScript, setAnalyzingScript] = useState(false);

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

  // Profile Face Modal State for Script Pipeline
  const [showFaceUploadModal, setShowFaceUploadModal] = useState(false);
  const [modalFaceFile, setModalFaceFile] = useState<File | null>(null);
  const [modalFacePreview, setModalFacePreview] = useState<string | null>(null);
  const [uploadingModalFace, setUploadingModalFace] = useState(false);

  // Avatar state
  const [useAvatar, setUseAvatar] = useState(false);
  const [overrideFaceFile, setOverrideFaceFile] = useState<File | null>(null);
  const [overrideFacePreview, setOverrideFacePreview] = useState<string | null>(null);
  const avatarFileRef = useRef<HTMLInputElement>(null);

  // Fetch saved faces
  const { data: savedFaces } = useQuery({
    queryKey: ["faces", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data } = await supabase.from("faces").select("*").eq("user_id", user.id).order("created_at", { ascending: false });
      return data || [];
    },
    enabled: !!user,
  });
  const defaultFaceUrl = savedFaces?.[0]?.face_url || null;

  const handleAvatarDrop = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOverrideFaceFile(file);
    const reader = new FileReader();
    reader.onload = () => setOverrideFacePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const activeFaceUrl = overrideFacePreview || defaultFaceUrl;

  // Accept prefilled prompt from navigation state
  useEffect(() => {
    const state = location.state as { prefillPrompt?: string } | null;
    if (state?.prefillPrompt) {
      setPrompt(state.prefillPrompt);
      // Clear state so it doesn't persist on re-render
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  const wordCount = script.trim().split(/\s+/).filter(Boolean).length;
  const baseCost = (quality === "fast" ? CREDIT_COSTS.FAST_GENERATE : CREDIT_COSTS.PRO_GENERATE) * variations;
  const analysisCost = inputMode === "script" ? CREDIT_COSTS.TITLE_GENERATOR : 0;
  const creditCost = baseCost + analysisCost;
  const remaining = credits?.credits_remaining ?? 0;

  // Progress simulation during generation (paused during script analysis)
  useEffect(() => {
    if (!generating || analyzingScript) return;
    setProgress(0);
    const duration = quality === "fast" ? 8000 : 20000;
    const interval = setInterval(() => {
      setProgress((p) => {
        if (p >= 95) { clearInterval(interval); return 95; }
        return p + Math.random() * 3 + 1;
      });
    }, duration / 30);
    return () => clearInterval(interval);
  }, [generating, analyzingScript, quality]);

  // Rotate tips during generation
  useEffect(() => {
    if (!generating) return;
    const interval = setInterval(() => {
      setCurrentTip(prev => (prev + 1) % CTR_TIPS.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [generating]);

  const loadingMessage = analyzingScript
    ? "Reading your script..."
    : (LOADING_MESSAGES.find(
        (m) => progress >= m.range[0] && progress < m.range[1]
      )?.text ?? "Generating...");

  const handleNicheSelect = (nicheKey: string) => {
    setNiche(nicheKey);
    const templates = NICHE_TEMPLATES[nicheKey];
    if (templates && templates.prompts.length > 0) {
      setPrompt(templates.prompts[0]);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!user) return;

    if (inputMode === "prompt" && !prompt.trim()) {
      toast.error("Please enter a prompt");
      return;
    }

    if (inputMode === "script" && wordCount < 20) {
      toast.error("Please enter at least 20 words for the script");
      return;
    }

    // Require profile face photo for Script-to-Thumbnail pipeline
    if (inputMode === "script" && !activeFaceUrl && !modalFacePreview) {
      setShowFaceUploadModal(true);
      return;
    }

    // Automatically enable creator avatar face swap when profile face is present
    if (inputMode === "script" && (activeFaceUrl || modalFacePreview)) {
      setUseAvatar(true);
    }

    if (!bypassCredits && remaining < creditCost) {
      setShowZeroCredits(true);
      return;
    }

    setGenerating(true);
    setResults([]);
    abortRef.current = false;

    let targetPrompt = prompt;

    try {
      if (inputMode === "script") {
        setAnalyzingScript(true);
        const { data: analysisData, error: analysisError } = await supabase.functions.invoke("generate-titles", {
          body: { script: script.trim() }
        });

        if (abortRef.current) return;

        if (analysisError || !analysisData?.image_prompt) {
          throw new Error(analysisError?.message || "Failed to analyze script");
        }

        targetPrompt = analysisData.image_prompt;
        setAnalyzingScript(false);
      }

      const textVal = extractQuotedText(targetPrompt);
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: {
          prompt: targetPrompt.trim(),
          enhance_prompt: enhancePrompt,
          text_overlay: !!textVal,
          text_content: textVal,
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

      // Face swap post-processing
      if (useAvatar && activeFaceUrl && data.images?.length > 0) {
        try {
          let faceUrl = activeFaceUrl;
          // If override file, upload it first
          if (overrideFaceFile) {
            const tempPath = `${user.id}/faces/temp_${crypto.randomUUID()}.png`;
            const { error: upErr } = await supabase.storage.from('thumbnails').upload(tempPath, overrideFaceFile, { contentType: overrideFaceFile.type });
            if (!upErr) {
              const { data: urlData } = supabase.storage.from('thumbnails').getPublicUrl(tempPath);
              faceUrl = urlData.publicUrl;
            }
          }

          const editorBase = import.meta.env.VITE_SMART_EDITOR_API_BASE || "http://localhost:3001";
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;

          const swappedResults: GeneratedImage[] = [];
          for (const img of data.images) {
            try {
              const swapResp = await fetch(`${editorBase}/face-swap`, {
                method: "POST",
                headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
                body: JSON.stringify({ face_url: faceUrl, target_url: img.image_url, swap_strength: 90 }),
              });
              if (swapResp.ok) {
                const swapData = await swapResp.json();
                const swappedUrl = swapData.image_url || (swapData.image_base64 ? `data:image/png;base64,${swapData.image_base64}` : img.image_url);
                swappedResults.push({ ...img, image_url: swappedUrl, thumbnail_id: swapData.thumbnail_id || img.thumbnail_id });
              } else {
                swappedResults.push(img);
              }
            } catch {
              swappedResults.push(img);
            }
          }
          setResults(swappedResults);
          toast.success("Avatar face-swapped!");
        } catch {
          toast.info("Face swap skipped — using original");
        }
      }
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
      setAnalyzingScript(false);
    }
  }, [user, prompt, script, inputMode, wordCount, enhancePrompt, style, niche, format, quality, variations, language, remaining, creditCost, queryClient, credits?.plan_type, modelChoice, useAvatar, activeFaceUrl, overrideFaceFile]);

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
    setAnalyzingScript(false);
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
        {/* Prominent Two-Card Mode Selector */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <button
            type="button"
            onClick={() => setInputMode("prompt")}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 relative overflow-hidden ${
              inputMode === "prompt"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              ✍️ Write a Prompt
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              Describe your idea directly
            </span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("script")}
            className={`p-3.5 rounded-xl border text-left transition-all flex flex-col gap-1 relative overflow-hidden ${
              inputMode === "script"
                ? "border-primary bg-primary/10 ring-2 ring-primary/20 shadow-md"
                : "border-border bg-card/60 hover:bg-card hover:border-muted-foreground/30 text-muted-foreground"
            }`}
          >
            <span className="absolute top-2 right-2 text-[9px] font-black bg-gradient-to-r from-amber-500 to-red-500 text-white px-1.5 py-0.5 rounded-full shadow-sm animate-pulse">
              🔥 NEW
            </span>
            <span className="text-sm font-bold text-foreground flex items-center gap-1.5">
              📜 Paste Your Script
            </span>
            <span className="text-[11px] text-muted-foreground leading-tight">
              Auto-find viral key moment
            </span>
          </button>
        </div>

        {/* Input area depends on selected inputMode */}
        {inputMode === "prompt" ? (
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
              />
              <span className="absolute bottom-2 right-3 text-[10px] text-muted-foreground">
                {prompt.length} characters
              </span>
            </div>
            <div className="flex items-center gap-2 mt-2">
              <Switch checked={enhancePrompt} onCheckedChange={setEnhancePrompt} id="enhance" />
              <Label htmlFor="enhance" className="text-xs text-muted-foreground cursor-pointer">
                ✨ AI will improve your prompt before generating
              </Label>
            </div>
          </div>
        ) : (
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-sm font-medium text-foreground">Script / Transcript</Label>
            </div>
            <div className="relative">
              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your full video script or transcript here..."
                rows={9}
                className="bg-background border-border text-foreground placeholder:text-muted-foreground resize-none w-full"
              />
            </div>
            <p className="text-xs text-muted-foreground mt-2 leading-relaxed">
              AI will read your script, find the most dramatic moment, and write the perfect prompt for you automatically.
            </p>
            <div className="flex justify-between items-center mt-2 text-[11px]">
              <span className="text-muted-foreground font-medium">
                {wordCount} {wordCount === 1 ? "word" : "words"} ({script.length} characters)
              </span>
              {wordCount < 20 && (
                <span className="text-muted-foreground">
                  Add a bit more detail for better results
                </span>
              )}
            </div>
          </div>
        )}



        {/* Avatar / Face-Swap */}
        <div className="glass-card rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <Label className="text-sm font-medium text-foreground flex items-center gap-2">
              <UserCircle className="h-4 w-4" /> Use My Avatar
            </Label>
            <Switch checked={useAvatar} onCheckedChange={setUseAvatar} />
          </div>
          {useAvatar && (
            <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>
              <div className="flex items-center gap-3">
                {activeFaceUrl ? (
                  <img src={activeFaceUrl} alt="Avatar" className="w-14 h-14 rounded-full object-cover border-2 border-border" />
                ) : (
                  <div className="w-14 h-14 rounded-full border-2 border-dashed border-border flex items-center justify-center bg-muted">
                    <UserCircle className="h-6 w-6 text-muted-foreground" />
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <Button variant="outline" size="sm" onClick={() => avatarFileRef.current?.click()}>
                    <Camera className="h-3.5 w-3.5 mr-1.5" /> Change
                  </Button>
                  <p className="text-[10px] text-muted-foreground">Your face will be swapped onto the generated thumbnail</p>
                </div>
              </div>
              <input ref={avatarFileRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarDrop} />
            </motion.div>
          )}
        </div>

        {/* Generate Button Wrapper */}
        <div className="fixed bottom-4 left-4 right-4 z-30 lg:relative lg:bottom-0 lg:left-0 lg:right-0 lg:z-0">
          <Button
            variant="hero"
            size="xl"
            className="w-full shadow-2xl lg:shadow-none"
            onClick={handleGenerateClick}
            disabled={generating || (inputMode === "prompt" ? !prompt.trim() : wordCount < 20)}
          >
            {generating ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                {analyzingScript ? "Reading your script..." : "Generating..."}
              </span>
            ) : (
              <>
                {inputMode === "prompt" ? "Generate Thumbnail" : "Analyze Script & Generate"}{" "}
                ({creditCost === 0 ? "Free" : `${creditCost} credits`})
              </>
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
                onClick={() => {
                  const textVal = extractQuotedText(prompt);
                  navigate(`/dashboard/smart-editor?thumbnail_id=${results[activeImage].thumbnail_id}&image_url=${encodeURIComponent(results[activeImage].image_url)}${textVal ? `&text=${encodeURIComponent(textVal)}` : ''}`);
                }}
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

      {/* Profile Face Upload Modal for Script Pipeline */}
      <Dialog open={showFaceUploadModal} onOpenChange={setShowFaceUploadModal}>
        <DialogContent className="max-w-md bg-card border-border shadow-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <UserCircle className="h-5 w-5 text-primary" />
              Upload Creator Profile Photo
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground leading-relaxed mt-1">
              To generate personalized YouTube thumbnails from your video scripts, please add a clear photo of your face. We will automatically put your real face into every thumbnail!
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="border-2 border-dashed border-border hover:border-primary/50 rounded-xl p-4 text-center transition-all bg-muted/20 relative">
              {modalFacePreview ? (
                <div className="flex flex-col items-center gap-2">
                  <img src={modalFacePreview} alt="Face Preview" className="h-24 w-24 rounded-full object-cover border-2 border-primary shadow-md" />
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-destructive" onClick={() => { setModalFaceFile(null); setModalFacePreview(null); }}>
                    Remove Photo
                  </Button>
                </div>
              ) : (
                <label className="cursor-pointer flex flex-col items-center gap-2 py-4">
                  <Camera className="h-8 w-8 text-muted-foreground" />
                  <span className="text-xs font-medium text-foreground">Click to upload clear face photo</span>
                  <span className="text-[10px] text-muted-foreground">PNG, JPG or WEBP up to 10MB</span>
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    setModalFaceFile(file);
                    const reader = new FileReader();
                    reader.onload = () => setModalFacePreview(reader.result as string);
                    reader.readAsDataURL(file);
                  }} />
                </label>
              )}
            </div>

            <div className="flex items-center justify-between gap-2 pt-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs text-muted-foreground"
                onClick={() => {
                  setShowFaceUploadModal(false);
                  setUseAvatar(false);
                  setTimeout(() => handleGenerate(), 100);
                }}
              >
                Skip & Use AI Face
              </Button>

              <Button
                variant="hero"
                size="sm"
                disabled={!modalFaceFile || uploadingModalFace}
                onClick={async () => {
                  if (!user || !modalFaceFile) return;
                  setUploadingModalFace(true);
                  try {
                    const fileName = `faces/${user.id}/${crypto.randomUUID()}.png`;
                    const { error: upErr } = await supabase.storage.from("thumbnails").upload(fileName, modalFaceFile, { contentType: modalFaceFile.type });
                    if (upErr) throw upErr;
                    const { data: urlData } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
                    await supabase.from("faces").insert({ user_id: user.id, face_url: urlData.publicUrl, label: "My Profile Face" });
                    queryClient.invalidateQueries({ queryKey: ["faces"] });
                    setOverrideFacePreview(urlData.publicUrl);
                    setUseAvatar(true);
                    setShowFaceUploadModal(false);
                    toast.success("Profile photo saved! Starting thumbnail pipeline...");
                    setTimeout(() => handleGenerate(), 300);
                  } catch (err: any) {
                    toast.error("Failed to save profile photo: " + (err.message || "Unknown error"));
                  } finally {
                    setUploadingModalFace(false);
                  }
                }}
              >
                {uploadingModalFace ? "Saving Photo..." : "Save Photo & Generate"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

    </div>
  );
};

export default GeneratePage;
