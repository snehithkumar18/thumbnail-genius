import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Sparkles, ArrowRight, Play, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onOpenAuth: () => void;
  visible?: boolean;
}

// Curated high-CTR showcase items for the dual-row marquee
const ROW_1_THUMBNAILS = [
  {
    title: "I Flattened a $250,000 Lamborghini With a Hydraulic Press!",
    views: "8,200,000+ views",
    ctr: "+41% CTR",
    tag: "Viral",
    bg: "from-red-950/80 to-zinc-950",
    textHook: "PRESS VS LAMBO!",
    category: "Extreme",
  },
  {
    title: "How Samuel Onuha Made Millions in 18 Months",
    views: "1,800,000+ views",
    ctr: "+36% CTR",
    tag: "Finance",
    bg: "from-amber-950/80 to-zinc-950",
    textHook: "$10M BLUEPRINT",
    category: "Business",
  },
  {
    title: "The Unfathomable Wealth of Dubai's $100B Megaproject",
    views: "3,400,000+ views",
    ctr: "+48% CTR",
    tag: "Docu",
    bg: "from-blue-950/80 to-zinc-950",
    textHook: "BURIED SECRETS",
    category: "Luxury",
  },
  {
    title: "I Survived 100 Days Inside a 10,000° Subterranean Volcano",
    views: "4,500,000+ views",
    ctr: "+52% CTR",
    tag: "Gaming",
    bg: "from-orange-950/80 to-zinc-950",
    textHook: "DAY 99 SECRET!",
    category: "Challenge",
  },
  {
    title: "Level 1 to 100 Mind Paradox to Fall Asleep To",
    views: "2,900,000+ views",
    ctr: "+33% CTR",
    tag: "Education",
    bg: "from-purple-950/80 to-zinc-950",
    textHook: "BRAIN BROKEN?",
    category: "Science",
  },
];

const ROW_2_THUMBNAILS = [
  {
    title: "How History's Biggest Idiot Accidentally Made a Fortune",
    views: "2,200,000+ views",
    ctr: "+39% CTR",
    tag: "Story",
    bg: "from-emerald-950/80 to-zinc-950",
    textHook: "DUMB LUCK?",
    category: "History",
  },
  {
    title: "The Race That Changed Formula 1 Forever",
    views: "4,700,000+ views",
    ctr: "+44% CTR",
    tag: "Sports",
    bg: "from-rose-950/80 to-zinc-950",
    textHook: "LAST LAP!",
    category: "Racing",
  },
  {
    title: "Trump's New Tariff Plan Explained in 12 Minutes",
    views: "1,500,000+ views",
    ctr: "+31% CTR",
    tag: "News",
    bg: "from-cyan-950/80 to-zinc-950",
    textHook: "WHO PAYS?",
    category: "Economy",
  },
  {
    title: "30 Days Locked in a Cold War Fallout Bunker",
    views: "3,800,000+ views",
    ctr: "+47% CTR",
    tag: "Horror",
    bg: "from-red-950/80 to-zinc-950",
    textHook: "NOT ALONE?",
    category: "Mystery",
  },
  {
    title: "The Satisfying Downfall of Ashton Hall",
    views: "3,400,000+ views",
    ctr: "+35% CTR",
    tag: "Drama",
    bg: "from-violet-950/80 to-zinc-950",
    textHook: "EXPOSED!",
    category: "Culture",
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth }) => {
  return (
    <section className="relative min-h-[92vh] flex flex-col justify-between pt-28 pb-16 overflow-hidden bg-white">
      {/* Dynamic ambient violet background glow on white */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[550px] bg-[radial-gradient(ellipse_at_center,rgba(139,71,255,0.08),transparent_70%)] pointer-events-none" />
      <div className="absolute top-1/3 left-1/4 w-[400px] h-[400px] bg-[#8B47FF]/5 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute top-1/4 right-1/4 w-[400px] h-[400px] bg-[#00E5FF]/5 rounded-full blur-[120px] pointer-events-none" />

      {/* Grid line texture */}
      <div 
        className="absolute inset-0 opacity-[0.03] pointer-events-none"
        style={{
          backgroundImage: "linear-gradient(rgba(15, 10, 30, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(15, 10, 30, 0.2) 1px, transparent 1px)",
          backgroundSize: "40px 40px"
        }}
      />

      <div className="container mx-auto px-4 sm:px-6 relative z-10 text-center max-w-5xl">
        {/* Trustpilot / User Proof Badge */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-3 px-4 py-1.5 rounded-full bg-card/60 backdrop-blur-md border border-border/80 shadow-inner mb-8"
        >
          <div className="flex items-center gap-1 text-amber-400">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            ))}
          </div>
          <span className="text-xs font-semibold text-foreground/90">
            Trusted by <span className="text-primary font-bold">50,000+</span> YouTube Creators & Studios
          </span>
        </motion.div>

        {/* Main Headline */}
        <motion.h1
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight text-foreground leading-[1.08] mb-6"
        >
          From Ignored to Viral With{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#C4A8FF] to-[#00E5FF]">
            Data-Backed AI Thumbnails
          </span>
        </motion.h1>

        {/* Subtitle */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed font-normal"
        >
          Stop guessing what gets clicks. Turn raw video scripts, prompts, or competitor links into click-optimized YouTube thumbnails & titles in seconds.
        </motion.p>

        {/* CTA Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
          className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-8"
        >
          <Button
            size="lg"
            variant="hero"
            onClick={onOpenAuth}
            className="w-full sm:w-auto h-12 sm:h-14 px-8 rounded-full text-base font-bold shadow-[0_0_35px_rgba(139,71,255,0.45)] hover:shadow-[0_0_50px_rgba(139,71,255,0.65)] hover:scale-[1.02] transition-all gap-2"
          >
            <Sparkles className="h-4 w-4" />
            Start Creating Free — No Card Needed
            <ArrowRight className="h-4 w-4" />
          </Button>

          <Button
            size="lg"
            variant="outline"
            onClick={() => {
              const el = document.getElementById("features");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="w-full sm:w-auto h-12 sm:h-14 px-7 rounded-full text-base font-semibold border-border hover:bg-muted/40 hover:border-primary/40 gap-2"
          >
            <Play className="h-4 w-4 fill-primary text-primary" />
            See How It Works
          </Button>
        </motion.div>

        {/* Feature Micro-Pills */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.4 }}
          className="flex flex-wrap items-center justify-center gap-5 text-xs text-muted-foreground font-medium mb-12"
        >
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Script-to-Thumbnail Intelligence</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Persona Face Swap</span>
          </div>
          <div className="flex items-center gap-1.5">
            <CheckCircle2 className="h-4 w-4 text-primary" />
            <span>Free Tier Available</span>
          </div>
        </motion.div>
      </div>

      {/* DUAL-ROW CONTINUOUS SLIDING SHOWCASE MARQUEE (Pikzels-Style) */}
      <div className="w-full relative mt-4 space-y-4 pointer-events-none select-none">
        {/* Gradient edge fades */}
        <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-40 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-40 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Row 1 - Slide Left */}
        <div className="flex overflow-hidden group">
          <div className="flex gap-4 animate-marquee whitespace-nowrap py-1">
            {[...ROW_1_THUMBNAILS, ...ROW_1_THUMBNAILS].map((item, idx) => (
              <ThumbnailMarqueeCard key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Row 2 - Slide Right */}
        <div className="flex overflow-hidden group">
          <div className="flex gap-4 animate-marquee-reverse whitespace-nowrap py-1">
            {[...ROW_2_THUMBNAILS, ...ROW_2_THUMBNAILS].map((item, idx) => (
              <ThumbnailMarqueeCard key={idx} item={item} />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

function ThumbnailMarqueeCard({ item }: { item: typeof ROW_1_THUMBNAILS[0] }) {
  return (
    <div className="w-[300px] sm:w-[340px] shrink-0 rounded-2xl bg-white border border-[#EAE5F5] p-3.5 shadow-[0_8px_24px_rgba(15,10,30,0.06)] hover:border-[#8B47FF]/50 transition-all">
      {/* Thumbnail Aspect Card */}
      <div className={`relative aspect-video rounded-lg overflow-hidden bg-gradient-to-br ${item.bg} border border-border/40 mb-2.5 flex items-center justify-center p-3 shadow-inner`}>
        {/* Text hook watermark */}
        <span className="text-base sm:text-lg font-black text-yellow-300 drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] tracking-tight uppercase text-center">
          {item.textHook}
        </span>
        {/* Category tag */}
        <span className="absolute top-2 left-2 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white px-2 py-0.5 rounded">
          {item.category}
        </span>
        {/* CTR boost badge */}
        <span className="absolute bottom-2 right-2 bg-primary text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow">
          <TrendingUp className="h-2.5 w-2.5" />
          {item.ctr}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs">
        <p className="font-semibold text-foreground/90 truncate max-w-[200px]" title={item.title}>
          {item.title}
        </p>
        <span className="text-[11px] font-mono text-primary font-bold shrink-0">
          {item.views}
        </span>
      </div>
    </div>
  );
}

export default HeroSection;
