import { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { BarChart3, Upload, Pencil, RefreshCw, Copy, Image as ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits, useThumbnails } from "@/hooks/useSupabaseData";
import { useQueryClient } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";

type ScoreResult = {
  overall: number;
  virality: number;
  clarity: number;
  emotion: number;
  curiosity: number;
  design: number;
  improvements: { suggestion: string; priority: string }[];
  category_detected: string;
};

const PROGRESS_MESSAGES = [
  "Checking visual hierarchy...",
  "Analyzing emotional impact...",
  "Comparing against viral patterns...",
  "Calculating click probability...",
];

const SCORE_DIMENSIONS = [
  { key: "virality", label: "Virality Potential", icon: "🔥", tip: "How likely to get clicks" },
  { key: "clarity", label: "Visual Clarity", icon: "👁️", tip: "How easy to understand at small size" },
  { key: "emotion", label: "Emotional Impact", icon: "😮", tip: "Emotional response triggered" },
  { key: "curiosity", label: "Curiosity Factor", icon: "🤔", tip: "How much viewers want to know more" },
  { key: "design", label: "Design Quality", icon: "🎨", tip: "Color, composition, visual balance" },
] as const;

const ThumbnailScorerPage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { data: thumbnails } = useThumbnails();
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMsg, setProgressMsg] = useState("");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const bypassCredits = (import.meta as any).env?.VITE_BYPASS_CREDITS === "true";

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setUploadPreview(dataUrl);
      setSelectedImage(dataUrl);
      setResult(null);
    };
    reader.readAsDataURL(file);
  }, []);

  const handleSelectThumbnail = (url: string) => {
    setSelectedImage(url);
    setUploadPreview(null);
    setResult(null);
  };

  const handleAnalyze = async () => {
    if (!selectedImage || !user) return;
    if (!bypassCredits && (credits?.credits_remaining ?? 0) < 1) { setShowZeroCredits(true); return; }

    setIsAnalyzing(true);
    setResult(null);
    setProgress(0);

    // Animated progress
    const interval = setInterval(() => {
      setProgress(prev => {
        const next = Math.min(prev + 2, 95);
        const msgIdx = Math.floor((next / 100) * PROGRESS_MESSAGES.length);
        setProgressMsg(PROGRESS_MESSAGES[Math.min(msgIdx, PROGRESS_MESSAGES.length - 1)]);
        return next;
      });
    }, 100);

    try {
      const { data, error } = await supabase.functions.invoke("score-thumbnail", {
        body: { image_url: selectedImage, user_id: user.id },
      });
      if (error) throw error;
      setResult(data);
      setProgress(100);
      setProgressMsg("Done!");
      queryClient.invalidateQueries({ queryKey: ["credits"] });
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to analyze";
      toast.error(message);
    } finally {
      clearInterval(interval);
      setIsAnalyzing(false);
    }
  };

  const overallLabel = (s: number) => {
    if (s >= 85) return { text: "Viral Potential 🔥", color: "text-yellow-400" };
    if (s >= 70) return { text: "Excellent", color: "text-green-400" };
    if (s >= 50) return { text: "Good", color: "text-blue-400" };
    return { text: "Below Average", color: "text-red-400" };
  };

  const scoreBarColor = (s: number) => {
    if (s >= 80) return "bg-green-500";
    if (s >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  const gaugeColor = (s: number) => {
    if (s >= 85) return "stroke-yellow-400";
    if (s >= 70) return "stroke-green-400";
    if (s >= 50) return "stroke-yellow-500";
    return "stroke-red-500";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">📊 Thumbnail Scorer</h1>
          <Badge className="bg-primary/20 text-primary border-primary/30">1 credit per analysis</Badge>
        </div>
        <p className="text-muted-foreground">Find out if your thumbnail is optimized to get clicks</p>
      </div>

      {!result && (
        <div className="bg-card border border-border rounded-xl p-6 space-y-5">
          <Tabs defaultValue="upload">
            <TabsList className="bg-muted">
              <TabsTrigger value="upload"><Upload className="h-3 w-3 mr-1" /> Upload Image</TabsTrigger>
              <TabsTrigger value="library"><ImageIcon className="h-3 w-3 mr-1" /> My Thumbnails</TabsTrigger>
            </TabsList>

            <TabsContent value="upload" className="mt-4">
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-border rounded-xl p-10 cursor-pointer hover:border-primary/50 transition-colors aspect-video max-w-lg mx-auto">
                {uploadPreview ? (
                  <img src={uploadPreview} alt="Upload" className="max-h-48 rounded-lg object-contain" />
                ) : (
                  <>
                    <Upload className="h-10 w-10 text-muted-foreground mb-3" />
                    <p className="text-muted-foreground text-sm">Drag & drop or click to upload</p>
                    <p className="text-xs text-muted-foreground mt-1">JPG, PNG, WEBP</p>
                  </>
                )}
                <input type="file" accept="image/*" className="hidden" onChange={handleFileUpload} />
              </label>
            </TabsContent>

            <TabsContent value="library" className="mt-4">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-64 overflow-y-auto">
                {(thumbnails || []).filter(t => t.image_url).slice(0, 20).map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleSelectThumbnail(t.image_url!)}
                    className={`rounded-lg overflow-hidden border-2 transition-all ${selectedImage === t.image_url ? "border-primary ring-2 ring-primary/30" : "border-border hover:border-muted-foreground/30"}`}
                  >
                    <img src={t.image_url!} alt="" className="w-full aspect-video object-cover" />
                  </button>
                ))}
                {(!thumbnails || thumbnails.length === 0) && (
                  <p className="col-span-full text-center text-muted-foreground text-sm py-8">No thumbnails yet</p>
                )}
              </div>
            </TabsContent>
          </Tabs>

          {selectedImage && (
            <Button onClick={handleAnalyze} disabled={isAnalyzing} className="w-full bg-primary text-primary-foreground font-bold h-12">
              {isAnalyzing ? <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Analyzing...</> : <>Analyze Thumbnail — 1 credit</>}
            </Button>
          )}

          {isAnalyzing && (
            <div className="space-y-2">
              <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                <motion.div
                  className="h-full bg-primary rounded-full"
                  animate={{ width: `${progress}%` }}
                  transition={{ ease: "easeOut" }}
                />
              </div>
              <p className="text-sm text-muted-foreground text-center">{progressMsg}</p>
            </div>
          )}
        </div>
      )}

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Overall Score Gauge */}
            <div className="bg-card border border-border rounded-xl p-8 flex flex-col items-center">
              <div className="relative w-40 h-40">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                  <circle cx="60" cy="60" r="52" fill="none" stroke="hsl(var(--muted))" strokeWidth="8" />
                  <motion.circle
                    cx="60" cy="60" r="52" fill="none"
                    className={gaugeColor(result.overall)}
                    strokeWidth="8" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 52}
                    initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - result.overall / 100) }}
                    transition={{ duration: 1.5, ease: "easeOut" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-3xl font-bold text-foreground">{result.overall}</span>
                  <span className="text-xs text-muted-foreground">/100</span>
                </div>
              </div>
              <p className={`mt-3 font-semibold text-lg ${overallLabel(result.overall).color}`}>
                {overallLabel(result.overall).text}
              </p>
              {result.category_detected && (
                <Badge variant="outline" className="mt-2 border-border">{result.category_detected}</Badge>
              )}
            </div>

            {/* Dimension Scores */}
            <div className="bg-card border border-border rounded-xl p-6 space-y-4">
              {SCORE_DIMENSIONS.map(dim => {
                const val = result[dim.key as keyof ScoreResult] as number;
                return (
                  <div key={dim.key} className="space-y-1.5">
                    <div className="flex justify-between text-sm">
                      <span className="text-foreground">{dim.icon} {dim.label}</span>
                      <span className="font-medium text-foreground">{val}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2.5 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${val}%` }}
                        transition={{ duration: 1, ease: "easeOut" }}
                        className={`h-full rounded-full ${scoreBarColor(val)}`}
                      />
                    </div>
                    <p className="text-xs text-muted-foreground">{dim.tip}</p>
                  </div>
                );
              })}
            </div>

            {/* Improvements */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {result.improvements.map((imp, i) => (
                <div key={i} className="bg-card border border-border rounded-xl p-4 space-y-3">
                  <Badge variant="outline" className={imp.priority === "high" ? "border-red-500/30 text-red-400" : imp.priority === "medium" ? "border-yellow-500/30 text-yellow-400" : "border-green-500/30 text-green-400"}>
                    {imp.priority} priority
                  </Badge>
                  <p className="text-sm text-foreground">💡 {imp.suggestion}</p>
                  <Button
                    variant="outline" size="sm"
                    onClick={() => navigate("/dashboard/editor", { state: { imageUrl: selectedImage, instruction: imp.suggestion } })}
                  >
                    <Pencil className="h-3 w-3 mr-1" /> Fix with AI
                  </Button>
                </div>
              ))}
            </div>

            {/* Actions */}
            <div className="flex gap-3 flex-wrap">
              <Button variant="outline" onClick={() => navigate("/dashboard/editor", { state: { imageUrl: selectedImage } })}>
                <Pencil className="h-4 w-4 mr-2" /> Improve with AI
              </Button>
              <Button variant="outline" onClick={() => { setResult(null); setSelectedImage(null); setUploadPreview(null); }}>
                <RefreshCw className="h-4 w-4 mr-2" /> Analyze Another
              </Button>
              <Button variant="outline" onClick={() => {
                const report = `Thumbnail Score: ${result.overall}/100\nVirality: ${result.virality}\nClarity: ${result.clarity}\nEmotion: ${result.emotion}\nCuriosity: ${result.curiosity}\nDesign: ${result.design}\n\nImprovements:\n${result.improvements.map(i => `- ${i.suggestion}`).join("\n")}`;
                navigator.clipboard.writeText(report);
                toast.success("Report copied!");
              }}>
                <Copy className="h-4 w-4 mr-2" /> Copy Report
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />
    </div>
  );
};

export default ThumbnailScorerPage;
