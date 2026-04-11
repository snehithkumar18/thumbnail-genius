import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";

interface HeroSectionProps {
  onOpenAuth: () => void;
}

const PROMPTS = [
  "A shocked face reacting to a stock portfolio...",
  "Dark gaming thumbnail with neon effects...",
  "Fitness transformation before and after...",
  "Tech review of the latest iPhone...",
];

const HeroSection = ({ onOpenAuth }: HeroSectionProps) => {
  const [typed, setTyped] = useState("");
  const [promptIdx, setPromptIdx] = useState(0);
  const [charIdx, setCharIdx] = useState(0);
  const [showThumb, setShowThumb] = useState(false);

  useEffect(() => {
    const prompt = PROMPTS[promptIdx];
    if (charIdx < prompt.length) {
      const t = setTimeout(() => {
        setTyped(prompt.slice(0, charIdx + 1));
        setCharIdx((c) => c + 1);
      }, 40);
      return () => clearTimeout(t);
    } else {
      setShowThumb(true);
      const t = setTimeout(() => {
        setShowThumb(false);
        setCharIdx(0);
        setTyped("");
        setPromptIdx((p) => (p + 1) % PROMPTS.length);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [charIdx, promptIdx]);

  return (
    <section className="relative min-h-screen flex items-center justify-center pt-16 dot-grid-bg overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/10 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-secondary/8 rounded-full blur-[100px]" />

      <div className="container mx-auto px-4 py-20">
        <div className="max-w-5xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7 }}
          >
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-heading font-extrabold leading-tight mb-6">
              Generate{" "}
              <span className="relative inline-block">
                <span className="gradient-text">Viral</span>
                <span className="absolute -bottom-1 left-0 w-full h-1 bg-gradient-to-r from-primary to-secondary rounded-full" />
              </span>{" "}
              YouTube Thumbnails in Seconds
            </h1>
          </motion.div>

          <motion.p
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.4 }}
            className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-6"
          >
            <Button variant="hero" size="xl" onClick={onOpenAuth}>
              Try for just $2 — 30 Credits, No Subscription
            </Button>
            <Button
              variant="heroGhost"
              size="xl"
              onClick={() => document.getElementById("examples")?.scrollIntoView({ behavior: "smooth" })}
            >
              See Examples
            </Button>
          </motion.div>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-xs text-muted-foreground mb-16"
          >
            🔥 Most creators start here
          </motion.p>

          {/* Hero visual mockup */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
            className="relative max-w-3xl mx-auto"
          >
            <div className="glass-card rounded-2xl p-6 grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-background rounded-xl p-4 border border-border">
                <div className="text-xs text-muted-foreground mb-2 font-body">Your prompt</div>
                <div className="text-sm text-foreground min-h-[60px] font-body">
                  {typed}
                  <span className="animate-pulse text-primary">|</span>
                </div>
              </div>
              <div className="bg-background rounded-xl border border-border overflow-hidden relative">
                <div className={`absolute inset-0 transition-opacity duration-700 ${showThumb ? "opacity-100" : "opacity-0"}`}>
                  <div className="w-full h-full bg-gradient-to-br from-primary/20 via-secondary/10 to-primary/20 flex items-center justify-center">
                    <div className="text-center">
                      <div className="w-full aspect-video bg-muted rounded-lg shimmer" />
                    </div>
                  </div>
                </div>
                {!showThumb && (
                  <div className="flex items-center justify-center h-full min-h-[100px] text-muted-foreground text-sm">
                    Waiting for prompt...
                  </div>
                )}
              </div>
            </div>

            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 1.2 }}
              className="absolute -bottom-6 left-4 md:left-0 glass-card rounded-full px-4 py-2 flex items-center gap-2 animate-float"
            >
              <Flame className="h-4 w-4 text-primary" />
              <span className="text-xs text-foreground font-medium">47 thumbnails generated in last hour</span>
            </motion.div>
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default HeroSection;
