import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Type,
  Copy,
  Zap,
  RefreshCw,
  CheckCircle,
  ChevronDown,
  Upload,
  FileText,
  Sparkles,
  Flame,
  ArrowRight,
  TrendingUp,
  X,
  FileUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Tech & AI",
  "Finance & Investing",
  "Gaming",
  "Motivation & Self-Help",
  "Story & True Crime",
  "Fitness & Health",
  "Food & Cooking",
  "Travel & Adventure",
  "Education & Science",
  "Comedy & Entertainment",
  "Business & Career",
];

const AUDIENCES = ["General", "Indians", "Youth 18-25", "Business Owners", "Students", "Global"];
const LANGUAGES = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Spanish", "Portuguese"];
const TONES = ["Shocking", "Curious", "Urgent", "Controversial", "Inspiring", "Educational", "Funny"];

const STRATEGY_COLORS: Record<string, string> = {
  curiosity_gap: "bg-red-500/20 text-red-400 border-red-500/30",
  power_number: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  how_to: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  controversy: "bg-rose-500/20 text-rose-400 border-rose-500/30",
  emotional_trigger: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fomo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const STRATEGY_LABELS: Record<string, string> = {
  curiosity_gap: "🟥 Curiosity Gap",
  power_number: "🟧 Power Number",
  how_to: "🟨 How-To",
  controversy: "🛑 Controversy",
  emotional_trigger: "🟦 Emotional Trigger",
  fomo: "🟪 FOMO Urgency",
};

const SAMPLE_SCRIPTS = [
  {
    name: "💰 $14K AI Side Hustle",
    text: `I spent 30 days testing 5 AI side hustles to see if any could replace my 9-to-5 job. Most creators on TikTok tell you to dropship or build automated blogs, claiming you'll make $10,000 in your sleep. But on day 17, after losing $1,400 on fake ads and sleeping only 3 hours, I discovered a bizarre automation trick with YouTube thumbnails. By day 28, my dashboard hit $14,230 in verified revenue. Here is the raw data, the exact receipts, and the dangerous mistake that almost wiped out my entire bank account.`,
  },
  {
    name: "🤖 Leaked AI Breakthrough",
    text: `Artificial intelligence is advancing 10x faster than public companies admit. Last week, an unreleased AI tool was accidentally leaked online before being pulled down 42 minutes later. When I tested it on my own machine, it built an entire functioning SaaS application in under 90 seconds from a single voice note. The engineers behind it warned that 80% of entry-level developers might have their roles fundamentally altered by the end of this year.`,
  },
  {
    name: "💀 Secret Abandoned Vault",
    text: `For 14 years, this abandoned vault beneath London was locked with a classified military seal. When our urban exploration team finally received clearance to film inside, the radiation detector instantly spiked to maximum levels. Deep inside room 4, sitting undisturbed on an iron table, was an encrypted black box that wasn't supposed to exist according to government records.`,
  },
];

type GeneratedTitle = {
  title: string;
  strategy: string;
  ctr_score: number;
  emoji: string;
  why_it_works: string;
};

const TitleGeneratorPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [inputMode, setInputMode] = useState<"script" | "topic">("script");
  const [script, setScript] = useState("");
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Tech & AI");
  const [audience, setAudience] = useState("General");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("Shocking");
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);

  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [viralAnalysis, setViralAnalysis] = useState<{
    viral_point?: string;
    key_moment?: string;
    emotion?: string;
  } | null>(null);

  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const scriptWordCount = script.trim() ? script.trim().split(/\s+/).filter(Boolean).length : 0;

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadedFileName(file.name);

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        // Clean text if contains carriage returns
        const clean = text.replace(/\r\n/g, "\n");
        setScript(clean);
        toast.success(`Loaded "${file.name}" (${clean.split(/\s+/).filter(Boolean).length} words)`);
      }
    };
    reader.onerror = () => {
      toast.error("Failed to read file. Please copy and paste your script.");
    };
    reader.readAsText(file);
  };

  const handleGenerate = async () => {
    const activeContent = inputMode === "script" ? script.trim() : topic.trim();
    if (!activeContent) {
      toast.error(inputMode === "script" ? "Please paste or upload your script" : "Please enter a video topic");
      return;
    }

    setIsGenerating(true);
    setGenStep(1);
    setTitles([]);
    setViralAnalysis(null);

    const stepInterval = setInterval(() => {
      setGenStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 1400);

    try {
      const { data, error } = await supabase.functions.invoke("generate-titles", {
        body: {
          mode: "titles",
          script: inputMode === "script" ? script.trim() : undefined,
          topic: inputMode === "topic" ? topic.trim() : undefined,
          category,
          audience,
          language,
          tone,
        },
      });

      clearInterval(stepInterval);

      if (error) throw error;
      if (data?.titles && Array.isArray(data.titles)) {
        setTitles(data.titles);
        if (data.viral_point || data.key_moment) {
          setViralAnalysis({
            viral_point: data.viral_point,
            key_moment: data.key_moment,
            emotion: data.emotion,
          });
        }
        toast.success("Generated 6 viral YouTube titles with 90%+ CTR!");
      } else {
        throw new Error("No titles returned");
      }
    } catch (e: unknown) {
      clearInterval(stepInterval);
      const message = e instanceof Error ? e.message : "Failed to generate titles";
      toast.error(message);
    } finally {
      setIsGenerating(false);
      setGenStep(0);
    }
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleUseForThumbnail = (title: string) => {
    const hook = viralAnalysis?.key_moment ? `, key moment: "${viralAnalysis.key_moment.slice(0, 60)}"` : "";
    const prompt = `YouTube thumbnail for video titled: "${title}"${hook}, dramatic cinematic lighting, bold 3D text overlay, 16:9 aspect ratio, eye-catching viral composition`;
    navigate("/dashboard", { state: { prefillPrompt: prompt } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      {/* Header */}
      <div>
        <div className="flex flex-wrap items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-primary/10 border border-primary/20 text-primary">🔤</span>
            Script-to-Title & Viral Hook Generator
          </h1>
          <Badge className="bg-gradient-to-r from-amber-500/20 to-red-500/20 text-amber-300 border-amber-500/30 flex items-center gap-1">
            <Flame className="h-3 w-3 text-red-400" />
            90%+ Predicted CTR
          </Badge>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            ⚡ Free & Unlimited
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Upload or paste your video script. AI scans every sentence, extracts the peak viral curiosity moment, and crafts short, high-CTR YouTube titles.
        </p>
      </div>

      {/* Main Input Box */}
      <div className="bg-card border border-border/70 rounded-2xl p-5 sm:p-7 shadow-xl space-y-6">
        {/* Mode Selector Tabs */}
        <div className="grid grid-cols-2 gap-3 p-1.5 bg-muted/40 rounded-xl border border-border/50">
          <button
            type="button"
            onClick={() => setInputMode("script")}
            className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 relative ${
              inputMode === "script"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <FileText className="h-4 w-4" />
            <span>📜 Upload or Paste Script</span>
            <span className="hidden sm:inline-block text-[10px] font-black uppercase tracking-wider bg-amber-400 text-black px-1.5 py-0.5 rounded-full ml-1">
              PRO
            </span>
          </button>

          <button
            type="button"
            onClick={() => setInputMode("topic")}
            className={`py-3 px-4 rounded-lg font-semibold text-sm transition-all flex items-center justify-center gap-2 ${
              inputMode === "topic"
                ? "bg-primary text-primary-foreground shadow-md shadow-primary/20"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
            }`}
          >
            <Type className="h-4 w-4" />
            <span>✍️ Quick Topic / Idea</span>
          </button>
        </div>

        {/* Input Form Based on Mode */}
        {inputMode === "script" ? (
          <div className="space-y-4">
            {/* File Upload Zone */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 bg-muted/30 border border-dashed border-border/80 rounded-xl">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-lg bg-primary/10 text-primary">
                  <FileUp className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-semibold text-foreground">
                    Upload Script File (.txt, .md, .srt, .docx)
                  </p>
                  <p className="text-[11px] text-muted-foreground">
                    {uploadedFileName ? `Attached: ${uploadedFileName}` : "Drag and drop or browse from your computer"}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {uploadedFileName && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setUploadedFileName(null);
                      setScript("");
                      if (fileInputRef.current) fileInputRef.current.value = "";
                    }}
                    className="h-8 text-xs text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-3.5 w-3.5 mr-1" /> Clear
                  </Button>
                )}
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".txt,.md,.srt,.vtt,.docx,.doc,.pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="script-file-upload"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fileInputRef.current?.click()}
                  className="h-8 text-xs border-border/80 font-medium"
                >
                  <Upload className="h-3.5 w-3.5 mr-1.5" />
                  {uploadedFileName ? "Replace File" : "Choose File"}
                </Button>
              </div>
            </div>

            {/* Script Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs sm:text-sm font-semibold text-foreground flex items-center gap-1.5">
                  Full Video Script or Transcript
                  <span className="text-[11px] text-muted-foreground font-normal">
                    (AI will pick the #1 viral climax)
                  </span>
                </label>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {scriptWordCount} words ({script.length} chars)
                  </span>
                </div>
              </div>

              <Textarea
                value={script}
                onChange={(e) => setScript(e.target.value)}
                placeholder="Paste your video script, transcript, or bullet-point draft here... The AI reads every sentence to locate the most shocking curiosity moment!"
                rows={9}
                className="bg-muted/20 border-border/80 text-foreground placeholder:text-muted-foreground/60 resize-y leading-relaxed font-sans text-sm"
              />
            </div>

            {/* Quick Sample Scripts */}
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <span className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-amber-400" /> Try a sample script:
              </span>
              {SAMPLE_SCRIPTS.map((sample, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => {
                    setScript(sample.text);
                    setUploadedFileName(null);
                    toast.info(`Loaded sample script: ${sample.name}`);
                  }}
                  className="text-xs px-2.5 py-1 rounded-md bg-muted/60 hover:bg-primary/20 hover:text-primary transition-colors border border-border/50 text-foreground"
                >
                  {sample.name}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <label className="text-xs sm:text-sm font-semibold text-foreground block">
              What is your video idea or topic?
            </label>
            <Textarea
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. I invested $10,000 in 5 AI stocks for 6 months and here are the shocking results..."
              rows={4}
              className="bg-muted/20 border-border/80 text-foreground placeholder:text-muted-foreground/60 text-sm"
            />
          </div>
        )}

        {/* Options Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-border/50">
          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Niche / Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-muted/30 border-border/80 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c} className="text-xs">
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Target Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="bg-muted/30 border-border/80 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => (
                  <SelectItem key={a} value={a} className="text-xs">
                    {a}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-muted/30 border-border/80 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {LANGUAGES.map((l) => (
                  <SelectItem key={l} value={l} className="text-xs">
                    {l}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <label className="text-xs font-medium text-muted-foreground mb-1 block">Emotional Hook / Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-muted/30 border-border/80 text-xs h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {TONES.map((t) => (
                  <SelectItem key={t} value={t} className="text-xs">
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Generate Button */}
        <Button
          onClick={handleGenerate}
          disabled={isGenerating || (inputMode === "script" ? !script.trim() : !topic.trim())}
          className="w-full bg-gradient-to-r from-primary via-primary/95 to-amber-500 hover:opacity-95 text-primary-foreground font-bold h-12 rounded-xl text-sm sm:text-base shadow-lg shadow-primary/20 transition-all"
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4 animate-spin" />
              <span>
                {genStep === 1
                  ? "Analyzing script line-by-line..."
                  : genStep === 2
                  ? "Extracting #1 viral climax & curiosity magnet..."
                  : "Engineering 90%+ CTR YouTube titles..."}
              </span>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Flame className="h-5 w-5 text-amber-300" />
              <span>
                {inputMode === "script"
                  ? "Extract Viral Point & Generate 90%+ CTR Titles"
                  : "Generate 90%+ CTR Titles — Free"}
              </span>
            </div>
          )}
        </Button>
      </div>

      {/* Results Section */}
      <AnimatePresence>
        {titles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
            {/* Viral Point Extraction Banner (If available from script analysis) */}
            {viralAnalysis?.viral_point && (
              <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-gradient-to-r from-amber-500/10 via-red-500/10 to-purple-500/10 border border-amber-500/30 rounded-2xl p-5 sm:p-6 relative overflow-hidden"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">🔥</span>
                    <h3 className="text-sm sm:text-base font-heading font-bold text-foreground">
                      Detected Viral Magnet in Script
                    </h3>
                  </div>
                  {viralAnalysis.emotion && (
                    <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-xs">
                      ⚡ Emotion: {viralAnalysis.emotion}
                    </Badge>
                  )}
                </div>

                {viralAnalysis.key_moment && (
                  <div className="p-3 bg-background/60 rounded-xl border border-border/60 mb-3 text-xs sm:text-sm text-foreground/90 font-medium italic">
                    "{viralAnalysis.key_moment}"
                  </div>
                )}

                <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed">
                  <strong className="text-foreground">Why this hooks viewers: </strong>
                  {viralAnalysis.viral_point}
                </p>
              </motion.div>
            )}

            {/* Title Results Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
                  <span>🎯 6 Viral YouTube Titles</span>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/30 font-bold text-xs">
                    ALL &gt; 90% CTR
                  </Badge>
                </h2>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Short, punchy hooks engineered specifically to prevent scroll-past and maximize click intent.
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleGenerate}
                disabled={isGenerating}
                className="border-border/80"
              >
                <RefreshCw className="h-3.5 w-3.5 mr-1.5" /> Regenerate
              </Button>
            </div>

            {/* Grid of 6 Titles */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {titles.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  className="bg-card border border-border/80 hover:border-primary/40 transition-all rounded-2xl p-5 flex flex-col justify-between space-y-4 shadow-sm group"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <Badge variant="outline" className={`text-[11px] font-semibold ${STRATEGY_COLORS[t.strategy] || "border-border"}`}>
                        {STRATEGY_LABELS[t.strategy] || t.strategy}
                      </Badge>
                      <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-xs font-bold flex items-center gap-1 shadow-sm">
                        <TrendingUp className="h-3 w-3" />
                        {t.ctr_score}% CTR
                      </Badge>
                    </div>

                    <h3 className="text-foreground font-bold text-base sm:text-lg leading-snug tracking-tight">
                      {t.title}
                    </h3>

                    <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">
                      {t.why_it_works}
                    </p>
                  </div>

                  {/* CTR Score Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span className="font-medium">Viral Click Probability</span>
                      <span className="font-bold text-emerald-400">{t.ctr_score} / 100</span>
                    </div>
                    <div className="w-full bg-muted/60 rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.ctr_score}%` }}
                        transition={{ duration: 0.8, delay: i * 0.1 }}
                        className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400"
                      />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleCopy(t.title, i)}
                      className="flex-1 text-xs h-9 border-border/80 hover:bg-muted font-medium"
                    >
                      {copiedIdx === i ? (
                        <>
                          <CheckCircle className="h-3.5 w-3.5 mr-1.5 text-emerald-400" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5 mr-1.5" /> Copy Title
                        </>
                      )}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => handleUseForThumbnail(t.title)}
                      className="flex-1 text-xs h-9 bg-primary/90 hover:bg-primary text-primary-foreground font-semibold shadow-sm"
                    >
                      <Zap className="h-3.5 w-3.5 mr-1.5 text-amber-300" /> Create Thumbnail
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Why section toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowWhy(!showWhy)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                <span>💡 Why these 6 formulas consistently hit 90%+ CTR</span>
                <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showWhy ? "rotate-180" : ""}`} />
              </button>

              <AnimatePresence>
                {showWhy && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="bg-card border border-border/80 rounded-2xl p-5 mt-3 space-y-3 overflow-hidden text-xs sm:text-sm"
                  >
                    {titles.map((t, i) => (
                      <div key={i} className="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-3">
                        <Badge variant="outline" className={`${STRATEGY_COLORS[t.strategy]} shrink-0 w-fit`}>
                          {STRATEGY_LABELS[t.strategy]}
                        </Badge>
                        <p className="text-muted-foreground">{t.why_it_works}</p>
                      </div>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TitleGeneratorPage;
