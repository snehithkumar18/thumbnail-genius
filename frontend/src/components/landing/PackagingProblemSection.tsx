import React from "react";
import { motion } from "framer-motion";
import { XCircle, CheckCircle2, TrendingUp, TrendingDown, Eye, MousePointerClick, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PackagingProblemSectionProps {
  onOpenAuth?: () => void;
}

export const PackagingProblemSection: React.FC<PackagingProblemSectionProps> = ({ onOpenAuth }) => {
  return (
    <section className="py-20 lg:py-28 relative bg-[#0B0616] overflow-hidden border-t border-border/40">
      {/* Subtle background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-primary/10 rounded-full blur-[140px] pointer-events-none" />

      <div className="container mx-auto px-4 sm:px-6 relative z-10">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-destructive/10 border border-destructive/20 text-destructive text-xs font-semibold uppercase tracking-wider mb-4"
          >
            <TrendingDown className="h-3.5 w-3.5" />
            The YouTube Reality
          </motion.div>

          <motion.h2
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-foreground mb-6"
          >
            Your YouTube Videos Don’t Get the Views You Deserve.
          </motion.h2>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.2 }}
            className="text-lg text-muted-foreground leading-relaxed"
          >
            It’s not the algorithm. It’s not your content. <span className="text-foreground font-semibold">It’s the packaging.</span> If people don’t click, they don’t watch.
          </motion.p>
        </div>

        {/* Side-by-Side Comparison: Weak vs Thumbly AI */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 lg:gap-8 max-w-5xl mx-auto">
          {/* Card 1: Weak Packaging (The Flop) */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-destructive/20 bg-card/40 backdrop-blur-sm p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-destructive/40" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-destructive flex items-center gap-1.5">
                  <XCircle className="h-4 w-4" />
                  Amateur Packaging
                </span>
                <span className="text-xs text-muted-foreground/80 font-mono bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                  2.4% CTR
                </span>
              </div>

              {/* Simulated Thumbnail Preview (Weak) */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-muted/40 mb-5 border border-border/50 flex flex-col items-center justify-center p-4 text-center">
                <div className="w-16 h-16 rounded-full bg-muted flex items-center justify-center text-2xl mb-2 grayscale opacity-40">
                  😐
                </div>
                <p className="text-xs text-muted-foreground font-medium max-w-[200px]">
                  Boring screenshot, low contrast, no curiosity gap, generic font
                </p>
                <div className="absolute bottom-2 right-2 bg-black/80 text-[10px] text-zinc-400 px-1.5 py-0.5 rounded">
                  12:40
                </div>
              </div>

              <h4 className="text-sm font-semibold text-foreground/80 mb-2 line-clamp-1">
                "My experience with investing in real estate for beginners 2026"
              </h4>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span>Low visual hook — viewers scroll right past it</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span>No clear emotion or curiosity gap in the title</span>
                </div>
                <div className="flex items-center gap-2">
                  <XCircle className="h-3.5 w-3.5 text-destructive shrink-0" />
                  <span>Algorithm stops recommending after 1,200 impressions</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs text-muted-foreground">
              <span className="flex items-center gap-1">
                <Eye className="h-3.5 w-3.5" /> 3,400 Views
              </span>
              <span className="text-destructive font-medium">Underperforming</span>
            </div>
          </motion.div>

          {/* Card 2: Thumbly AI Packaging (The Winner) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="rounded-2xl border border-primary/40 bg-gradient-to-b from-primary/10 via-card/60 to-card/40 backdrop-blur-sm p-6 sm:p-8 flex flex-col justify-between relative overflow-hidden group shadow-[0_0_50px_rgba(139,71,255,0.12)]"
          >
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-primary to-[#00E5FF]" />
            <div>
              <div className="flex items-center justify-between mb-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-primary flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4" />
                  Thumbly AI Data-Backed Packaging
                </span>
                <span className="text-xs font-mono bg-primary/20 text-primary font-bold px-2 py-0.5 rounded flex items-center gap-1">
                  <TrendingUp className="h-3 w-3" /> 11.8% CTR
                </span>
              </div>

              {/* Simulated Thumbnail Preview (Viral High CTR) */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-[#130A24] mb-5 border border-primary/30 flex items-center justify-center p-4 text-center shadow-lg group-hover:border-primary/60 transition-all">
                <img
                  src="/hero-sample.jpg"
                  alt="Viral AI Thumbnail"
                  className="absolute inset-0 w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to stylized vector graphic if local img missing
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                {/* Fallback stylized badge overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-3 text-left">
                  <span className="text-xs font-black tracking-tight text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.9)] uppercase">
                    "I LOST EVERYTHING!"
                  </span>
                  <span className="text-[10px] text-zinc-300">High-contrast 3D expression + bold typography</span>
                </div>
                <div className="absolute top-2 right-2 bg-primary/90 text-[10px] text-white font-bold px-2 py-0.5 rounded shadow">
                  +380% More Clicks
                </div>
              </div>

              <h4 className="text-sm font-bold text-foreground mb-2 line-clamp-1">
                "How I Lost $250,000 on Real Estate in 48 Hours"
              </h4>

              <div className="space-y-2 text-xs text-muted-foreground">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground">High-contrast studio lighting & emotional facial hook</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground">Unbreakable curiosity gap designed by 50M thumbnail AI</span>
                </div>
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-primary shrink-0" />
                  <span className="text-foreground">Algorithm pushes video to millions on Browse & Suggested</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-border/40 flex items-center justify-between text-xs">
              <span className="flex items-center gap-1 text-foreground font-semibold">
                <Eye className="h-3.5 w-3.5 text-primary" /> 482,000+ Views
              </span>
              <span className="text-primary font-bold">Viral Outlier</span>
            </div>
          </motion.div>
        </div>

        {/* Bottom Callout Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="mt-12 text-center"
        >
          <div className="inline-flex flex-col sm:flex-row items-center gap-4 p-4 sm:p-5 rounded-2xl bg-card border border-border/80 shadow-lg">
            <div className="flex items-center gap-3 text-left">
              <div className="h-10 w-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary shrink-0">
                <Sparkles className="h-5 w-5" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Stop guessing what gets clicks.</p>
                <p className="text-xs text-muted-foreground">Thumbly packages your ideas into viral thumbnails in under 15 seconds.</p>
              </div>
            </div>
            <Button
              variant="hero"
              size="sm"
              onClick={onOpenAuth}
              className="rounded-full px-6 font-semibold shrink-0"
            >
              Fix Your Packaging Free
            </Button>
          </div>
        </motion.div>
      </div>
    </section>
  );
};

export default PackagingProblemSection;
