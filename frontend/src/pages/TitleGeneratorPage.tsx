import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Type, Copy, Zap, RefreshCw, CheckCircle, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const CATEGORIES = [
  "Finance & Investing", "Tech & AI", "Gaming", "Fitness",
  "Motivation", "Food", "Travel", "Education", "True Crime",
  "Relationships", "Comedy",
];

const AUDIENCES = ["General", "Indians", "Youth 18-25", "Business Owners", "Students", "Global"];
const LANGUAGES = ["English", "Hindi", "Hinglish", "Tamil", "Telugu", "Spanish", "Portuguese"];
const TONES = ["Shocking", "Curious", "Inspiring", "Educational", "Funny"];

const STRATEGY_COLORS: Record<string, string> = {
  curiosity_gap: "bg-red-500/20 text-red-400 border-red-500/30",
  power_number: "bg-orange-500/20 text-orange-400 border-orange-500/30",
  how_to: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  controversy: "bg-green-500/20 text-green-400 border-green-500/30",
  emotional_trigger: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  fomo: "bg-purple-500/20 text-purple-400 border-purple-500/30",
};

const STRATEGY_LABELS: Record<string, string> = {
  curiosity_gap: "🟥 Curiosity Gap",
  power_number: "🟧 Power Number",
  how_to: "🟨 How-To",
  controversy: "🟩 Controversy",
  emotional_trigger: "🟦 Emotional Trigger",
  fomo: "🟪 FOMO",
};

type GeneratedTitle = {
  title: string;
  strategy: string;
  ctr_score: number;
  emoji: string;
  why_it_works: string;
};

const TitleGeneratorPage = () => {
  const navigate = useNavigate();
  const [topic, setTopic] = useState("");
  const [category, setCategory] = useState("Tech & AI");
  const [audience, setAudience] = useState("General");
  const [language, setLanguage] = useState("English");
  const [tone, setTone] = useState("Curious");
  const [isGenerating, setIsGenerating] = useState(false);
  const [titles, setTitles] = useState<GeneratedTitle[]>([]);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [showWhy, setShowWhy] = useState(false);

  const handleGenerate = async () => {
    if (!topic.trim()) { toast.error("Enter a video topic"); return; }
    setIsGenerating(true);
    setTitles([]);
    try {
      const { data, error } = await supabase.functions.invoke("generate-titles", {
        body: { topic, category, audience, language, tone },
      });
      if (error) throw error;
      if (data?.titles) setTitles(data.titles);
      else throw new Error("No titles returned");
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to generate titles";
      toast.error(message);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenOne = async (idx: number) => {
    // Re-run entire generation (simple approach)
    await handleGenerate();
  };

  const handleCopy = (text: string, idx: number) => {
    navigator.clipboard.writeText(text);
    setCopiedIdx(idx);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIdx(null), 2000);
  };

  const handleUseForThumbnail = (title: string) => {
    const prompt = `YouTube thumbnail for video titled: "${title}", eye-catching, bold text overlay, dramatic lighting`;
    navigate("/dashboard", { state: { prefillPrompt: prompt } });
  };

  const ctrColor = (score: number) => {
    if (score >= 80) return "bg-green-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">🔤 Title & Script Generator</h1>
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">✅ No credits needed</Badge>
        </div>
        <p className="text-muted-foreground">AI-powered titles that get clicks — free, unlimited</p>
      </div>

      {/* Form */}
      <div className="bg-card border border-border rounded-xl p-6 space-y-5">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">What is your video about?</label>
          <Textarea
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="I invested ₹10,000 in 5 stocks for 6 months and here are the results"
            className="bg-muted border-border min-h-[80px]"
          />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Category</label>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Audience</label>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{AUDIENCES.map(a => <SelectItem key={a} value={a}>{a}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Language</label>
            <Select value={language} onValueChange={setLanguage}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{LANGUAGES.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-xs text-muted-foreground mb-1 block">Tone</label>
            <Select value={tone} onValueChange={setTone}>
              <SelectTrigger className="bg-muted border-border"><SelectValue /></SelectTrigger>
              <SelectContent>{TONES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
        </div>

        <Button
          onClick={handleGenerate}
          disabled={isGenerating || !topic.trim()}
          className="w-full bg-primary hover:bg-primary/90 text-primary-foreground font-bold h-12"
        >
          {isGenerating ? (
            <><RefreshCw className="h-4 w-4 animate-spin mr-2" /> Generating titles...</>
          ) : (
            <><Type className="h-4 w-4 mr-2" /> Generate Titles — Free</>
          )}
        </Button>
      </div>

      {/* Results */}
      <AnimatePresence>
        {titles.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-heading font-semibold text-foreground">Generated Titles</h2>
              <Button variant="outline" size="sm" onClick={handleGenerate} disabled={isGenerating}>
                <RefreshCw className="h-3 w-3 mr-1" /> Regenerate All
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {titles.map((t, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="bg-card border border-border rounded-xl p-5 space-y-3"
                >
                  <p className="text-foreground font-semibold text-base leading-snug">
                    {t.emoji} {t.title}
                  </p>

                  <Badge variant="outline" className={STRATEGY_COLORS[t.strategy] || "border-border"}>
                    {STRATEGY_LABELS[t.strategy] || t.strategy}
                  </Badge>

                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Predicted CTR</span>
                      <span className="font-medium text-foreground">{t.ctr_score}/100</span>
                    </div>
                    <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${t.ctr_score}%` }}
                        transition={{ duration: 1, delay: i * 0.1 }}
                        className={`h-full rounded-full ${ctrColor(t.ctr_score)}`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => handleCopy(t.title, i)}>
                      {copiedIdx === i ? <CheckCircle className="h-3 w-3 mr-1" /> : <Copy className="h-3 w-3 mr-1" />}
                      {copiedIdx === i ? "Copied" : "Copy"}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => handleUseForThumbnail(t.title)}>
                      <Zap className="h-3 w-3 mr-1" /> Use for Thumbnail
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleRegenOne(i)}>
                      <RefreshCw className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>

            {/* Why section */}
            <button
              onClick={() => setShowWhy(!showWhy)}
              className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              💡 Why these techniques work
              <ChevronDown className={`h-4 w-4 transition-transform ${showWhy ? "rotate-180" : ""}`} />
            </button>
            <AnimatePresence>
              {showWhy && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  className="bg-card border border-border rounded-xl p-5 space-y-3 overflow-hidden"
                >
                  {titles.map((t, i) => (
                    <div key={i} className="flex gap-3">
                      <Badge variant="outline" className={`${STRATEGY_COLORS[t.strategy]} shrink-0`}>
                        {STRATEGY_LABELS[t.strategy]}
                      </Badge>
                      <p className="text-sm text-muted-foreground">{t.why_it_works}</p>
                    </div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default TitleGeneratorPage;
