import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Upload, ChevronRight, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

const CATEGORIES = [
  { id: "finance", emoji: "💰", label: "Finance" },
  { id: "gaming", emoji: "🎮", label: "Gaming" },
  { id: "fitness", emoji: "💪", label: "Fitness" },
  { id: "tech", emoji: "🤖", label: "Tech" },
  { id: "travel", emoji: "✈️", label: "Travel" },
  { id: "food", emoji: "🍕", label: "Food" },
  { id: "motivation", emoji: "💡", label: "Motivation" },
  { id: "education", emoji: "📚", label: "Education" },
  { id: "true_crime", emoji: "😱", label: "True Crime" },
  { id: "entertainment", emoji: "🎭", label: "Entertainment" },
  { id: "other", emoji: "✨", label: "Other" },
];

const NICHE_PROMPTS: Record<string, string> = {
  finance: "Shocked person holding ₹1 lakh cash, bold text saying I MADE THIS, dramatic red lighting, cinematic",
  gaming: "Intense gamer face close-up, headset on, RGB lighting reflection on face, dark background, battle-ready expression",
  fitness: "Muscular person doing dramatic pose, gym background, sweat drops visible, high contrast with red accent",
  tech: "Person in dark hoodie, face partially lit by blue holographic screens, futuristic hacker aesthetic",
  travel: "Person arms wide open on mountain peak at golden hour, dramatic landscape, adventure energy",
  food: "Dramatic cheese pull, mozzarella stretching, dark moody background, food porn lighting",
  motivation: "Lone person at desk at 3am working, city lights through window, hustle grind aesthetic",
  education: "Brain exploding with colorful knowledge particles, learning visualization, vibrant style",
  true_crime: "Dark mysterious figure in shadow, red and black dramatic lighting, crime documentary poster style",
  entertainment: "Person reacting with extreme surprise, colorful background, dynamic energy",
  other: "Eye-catching YouTube thumbnail, dramatic lighting, bold colors, professional quality",
};

interface OnboardingModalProps {
  onComplete: () => void;
}

export default function OnboardingModal({ onComplete }: OnboardingModalProps) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const isMobile = useIsMobile();
  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [primaryColor, setPrimaryColor] = useState("#8B47FF");
  const [secondaryColor, setSecondaryColor] = useState("#F59E0B");
  const [faceFile, setFaceFile] = useState<File | null>(null);
  const [facePreview, setFacePreview] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);

  const toggleCategory = (id: string) => {
    setSelectedCategories((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : prev.length < 3 ? [...prev, id] : prev
    );
  };

  const handleFaceUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setFaceFile(file);
    const reader = new FileReader();
    reader.onload = () => setFacePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const saveCategory = async () => {
    if (!user || selectedCategories.length === 0) return;
    await supabase
      .from("profiles")
      .update({ niche_category: selectedCategories.join(",") })
      .eq("user_id", user.id);
    setStep(2);
  };

  const saveFace = async () => {
    if (!user || !faceFile) {
      setStep(3);
      return;
    }
    try {
      const fileName = `faces/${user.id}/${crypto.randomUUID()}.png`;
      const { error } = await supabase.storage.from("thumbnails").upload(fileName, faceFile, { contentType: faceFile.type });
      if (error) throw error;
      const { data } = supabase.storage.from("thumbnails").getPublicUrl(fileName);
      await supabase.from("faces").insert({ user_id: user.id, face_url: data.publicUrl, label: "My Face" });
      queryClient.invalidateQueries({ queryKey: ["faces"] });
      toast.success("Face saved!");
    } catch {
      toast.error("Failed to save face");
    }
    setStep(3);
  };

  const saveColors = async () => {
    // Colors could be saved to brand_kits in future
    setStep(4);
  };

  const handleGenerate = async () => {
    if (!user) return;
    setGenerating(true);
    const niche = selectedCategories[0] || "other";
    const prompt = NICHE_PROMPTS[niche] || NICHE_PROMPTS.other;
    try {
      const { data, error } = await supabase.functions.invoke("generate-thumbnail", {
        body: { prompt, enhance_prompt: true, style: "cinematic", format: "16:9", quality: "fast", count: 1 },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message);
      setGeneratedImage(data.images?.[0]?.image_url || null);
      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
      confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
    } catch {
      toast.error("Generation failed — no credits charged");
    } finally {
      setGenerating(false);
    }
  };

  const finishOnboarding = async () => {
    if (!user) return;
    await supabase.from("profiles").update({ onboarding_complete: true }).eq("user_id", user.id);
    queryClient.invalidateQueries({ queryKey: ["profile"] });
    onComplete();
  };

  const stepContent = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2 px-4">Welcome to ThumbAI! 🎉</h2>
              <p className="text-muted-foreground text-sm">What kind of YouTube content do you make?</p>
              <p className="text-[10px] text-muted-foreground mt-1">Select 1–3 categories</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => toggleCategory(cat.id)}
                  className={`flex flex-col items-center gap-1.5 p-3 sm:p-4 rounded-xl border-2 transition-all ${
                    selectedCategories.includes(cat.id)
                      ? "border-primary bg-primary/10"
                      : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <span className="text-xl sm:text-2xl">{cat.emoji}</span>
                  <span className="text-[10px] sm:text-xs font-medium text-foreground">{cat.label}</span>
                  {selectedCategories.includes(cat.id) && (
                    <Check className="h-3 w-3 text-primary" />
                  )}
                </button>
              ))}
            </div>
            <Button onClick={saveCategory} disabled={selectedCategories.length === 0} className="w-full h-12" size="lg">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">Upload Your Face</h2>
              <p className="text-muted-foreground text-sm">For Face Swap thumbnails (optional)</p>
            </div>
            <div className="flex flex-col items-center gap-4">
              {facePreview ? (
                <div className="w-32 h-32 rounded-full overflow-hidden border-4 border-primary">
                  <img src={facePreview} alt="Face" className="w-full h-full object-cover" />
                </div>
              ) : (
                <label className="w-32 h-32 rounded-full border-2 border-dashed border-border flex flex-col items-center justify-center cursor-pointer hover:border-primary/50 transition-colors">
                  <Upload className="h-6 w-6 text-muted-foreground mb-1" />
                  <span className="text-[10px] text-muted-foreground">Upload</span>
                  <input type="file" accept="image/*" className="hidden" onChange={handleFaceUpload} />
                </label>
              )}
            </div>
            <div className="flex gap-3">
              <Button onClick={saveFace} className="flex-1 h-12" size="lg">
                {faceFile ? "Save My Face" : "Skip for now"}
              </Button>
            </div>
            <button onClick={() => setStep(3)} className="text-xs text-muted-foreground hover:text-foreground mx-auto block py-2">
              Skip for now →
            </button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2">Brand Colors</h2>
              <p className="text-muted-foreground text-sm">Set your channel's brand colors (optional)</p>
            </div>
            <div className="flex justify-center gap-8">
              <div className="text-center space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Primary</Label>
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="w-16 h-16 rounded-xl border border-border cursor-pointer appearance-none bg-transparent"
                />
              </div>
              <div className="text-center space-y-2">
                <Label className="text-[10px] text-muted-foreground uppercase tracking-widest">Secondary</Label>
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="w-16 h-16 rounded-xl border border-border cursor-pointer appearance-none bg-transparent"
                />
              </div>
            </div>
            <div className="flex items-center justify-center gap-2">
              <div className="w-40 h-24 rounded-xl border border-border overflow-hidden shadow-lg shadow-black/5" style={{ background: `linear-gradient(135deg, ${primaryColor}, ${secondaryColor})` }}>
                <div className="w-full h-full flex items-center justify-center text-white font-heading font-bold text-sm drop-shadow-lg">
                  Preview
                </div>
              </div>
            </div>
            <Button onClick={saveColors} className="w-full h-12" size="lg">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
            <button onClick={() => setStep(4)} className="text-xs text-muted-foreground hover:text-foreground mx-auto block py-2">
              Skip →
            </button>
          </div>
        );
      case 4:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="text-xl sm:text-2xl font-heading font-bold text-foreground mb-2 px-4">
                {generatedImage ? "Your First Thumbnail! 🎉" : "Let's Generate Your First Thumbnail 🚀"}
              </h2>
              <p className="text-muted-foreground text-sm">
                {generatedImage
                  ? "Looking good! You're all set."
                  : `Pre-filled prompt based on your ${selectedCategories[0] || "selected"} niche`}
              </p>
            </div>
            {!generatedImage ? (
              <>
                <div className="bg-muted rounded-xl p-4 border border-border/50">
                  <p className="text-xs sm:text-sm text-foreground italic leading-relaxed">
                    "{NICHE_PROMPTS[selectedCategories[0]] || NICHE_PROMPTS.other}"
                  </p>
                </div>
                <Button
                  onClick={handleGenerate}
                  disabled={generating}
                  className="w-full h-12 shadow-lg shadow-primary/20"
                  size="lg"
                >
                  {generating ? (
                    <span className="flex items-center gap-2">
                      <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
                      Generating...
                    </span>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" /> Generate My First Thumbnail ⚡
                    </>
                  )}
                </Button>
              </>
            ) : (
              <>
                <div className="rounded-xl overflow-hidden border border-border shadow-2xl">
                  <img src={generatedImage} alt="Generated" className="w-full aspect-video object-cover" />
                </div>
                <Button onClick={finishOnboarding} className="w-full h-12" size="lg">
                  Go to Dashboard <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </>
            )}
            {!generatedImage && (
              <button onClick={finishOnboarding} className="text-xs text-muted-foreground hover:text-foreground mx-auto block py-2">
                Skip & go to dashboard →
              </button>
            )}
          </div>
        );
    }
  };

  if (isMobile) {
    return (
      <Drawer open={true} dismissible={false}>
        <DrawerContent className="p-6 pb-12 focus-visible:outline-none min-h-[85vh]">
          <DrawerTitle className="sr-only">Onboarding</DrawerTitle>
          <div className="flex items-center justify-center gap-2 mb-8 mt-2">
            {[1, 2, 3, 4].map((s) => (
              <div key={s} className="flex items-center gap-1.5">
                <div
                  className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold transition-all ${
                    s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s < step ? <Check className="h-3 w-3" /> : s}
                </div>
                {s < 4 && <div className={`w-6 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
              </div>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.2 }}
            >
              {stepContent()}
            </motion.div>
          </AnimatePresence>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <div className="fixed inset-0 z-[100] bg-background/95 backdrop-blur-xl flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-card border border-border rounded-2xl p-8 shadow-2xl"
      >
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2, 3, 4].map((s) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                  s <= step ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"
                }`}
              >
                {s < step ? <Check className="h-4 w-4" /> : s}
              </div>
              {s < 4 && <div className={`w-8 h-0.5 ${s < step ? "bg-primary" : "bg-muted"}`} />}
            </div>
          ))}
        </div>
        <AnimatePresence mode="wait">
          <motion.div
            key={step}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {stepContent()}
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
