import { useState } from "react";
import { motion } from "framer-motion";
import { Star, Sparkles, ArrowRight, Play, CheckCircle2, TrendingUp } from "lucide-react";
import { Button } from "@/components/ui/button";

interface HeroSectionProps {
  onOpenAuth: () => void;
  visible?: boolean;
}

// Curated high-CTR showcase items with realistic world-famous creator thumbnails
const ROW_1_THUMBNAILS = [
  {
    title: "Can a 20-Foot Brick Wall Stop a Speeding Train?",
    views: "14.8M views",
    ctr: "+48% CTR",
    tag: "Extreme Challenge",
    image: "/hero-thumb-train.jpg",
    textHook: "WILL IT STOP?!",
    category: "Extreme",
  },
  {
    title: "$1 Camping Cot vs $1,000,000 Hotel Suite!",
    views: "34.2M views",
    ctr: "+54% CTR",
    tag: "Luxury Split",
    image: "/hero-thumb-hotel-contrast.jpg",
    textHook: "$1 VS $1,000,000",
    category: "Luxury",
  },
  {
    title: "Crazy IRL Stream: Festive Street Celebration!",
    views: "12.4M views",
    ctr: "+51% CTR",
    tag: "High Energy IRL",
    image: "/hero-thumb-speed-irl.jpg",
    textHook: "CRAZY IRL!",
    category: "Streaming",
  },
  {
    title: "50 Hours Trapped In Solitary Confinement",
    views: "9.8M views",
    ctr: "+46% CTR",
    tag: "Survival Stunt",
    image: "/hero-thumb-solitary.jpg",
    textHook: "DAY 5 - 50 HOURS!",
    category: "Survival",
  },
  {
    title: "Blind Dating In Real Life (Comedy Challenge)",
    views: "28.5M views",
    ctr: "+49% CTR",
    tag: "Comedy IRL",
    image: "/hero-thumb-tinder-irl.jpg",
    textHook: "TINDER IRL!",
    category: "Comedy",
  },
];

const ROW_2_THUMBNAILS = [
  {
    title: "Streamer vs World Football Champion!",
    views: "45.0M views",
    ctr: "+58% CTR",
    tag: "Creator Faceoff",
    image: "/hero-thumb-champion.jpg",
    textHook: "CHAMPION VS STREAMER",
    category: "Athletics",
  },
  {
    title: "$1 Flight vs $500,000 Private Jet Ticket!",
    views: "52.1M views",
    ctr: "+56% CTR",
    tag: "Extreme Luxury",
    image: "/hero-thumb-plane-contrast.jpg",
    textHook: "$1 VS $500K TICKET",
    category: "Challenge",
  },
  {
    title: "I Survived On 1 Penny Across The Country",
    views: "18.3M views",
    ctr: "+47% CTR",
    tag: "Penny Challenge",
    image: "/hero-thumb-penny.jpg",
    textHook: "1 PENNY CHALLENGE",
    category: "Adventure",
  },
  {
    title: "Impossible Trick Shot Over Infinity Pool!",
    views: "11.2M views",
    ctr: "+44% CTR",
    tag: "Trick Shots",
    image: "/hero-thumb-celine.jpg",
    textHook: "IMPOSSIBLE SHOT!",
    category: "Sports",
  },
  {
    title: "Survive 100 Days In A Circle (Tornado Survival)",
    views: "38.7M views",
    ctr: "+52% CTR",
    tag: "Extreme Survival",
    image: "/hero-thumb-tornado.jpg",
    textHook: "DAY 99 SURVIVAL!",
    category: "Stunt",
  },
];

export const HeroSection: React.FC<HeroSectionProps> = ({ onOpenAuth }) => {
  const [scriptText, setScriptText] = useState("");
  return (
    <section className="relative flex flex-col items-center pt-28 pb-16 overflow-hidden bg-white">
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

      <div className="container mx-auto px-4 sm:px-6 relative z-30 text-center max-w-5xl">
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
          className="text-4xl sm:text-6xl md:text-7xl font-extrabold tracking-tight text-[#0F0A1E] leading-[1.08] mb-4 sm:mb-5"
        >
          The{" "}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-primary via-[#9B51E0] to-[#00D2FF]">
            Cheat Code
          </span>{" "}
          <br className="hidden sm:inline" />
          to Millions of Views
        </motion.h1>

        {/* Short & Punchy Caption Below */}
        <motion.p
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-base sm:text-lg md:text-xl text-[#524B66] max-w-2xl mx-auto mb-8 sm:mb-10 font-medium"
        >
          From Script to Viral YouTube Thumbnails in Seconds
        </motion.p>

        {/* Interactive Topic / Script Prompt Input Card (Pikzels Floating Style) */}
        <motion.div
          initial={{ opacity: 0, y: 25 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.25 }}
          className="max-w-4xl mx-auto w-full relative z-30 mb-2"
        >
          {/* Outer Card with border glow */}
          <div className="relative rounded-3xl p-[1px] bg-gradient-to-b from-white/30 via-white/10 to-transparent shadow-[0_25px_60px_rgba(15,10,30,0.25)]">
            <div className="relative rounded-[23px] bg-[#14151F] p-6 sm:p-8 text-left border border-white/15 shadow-2xl min-h-[180px] sm:min-h-[210px] flex flex-col justify-between">
              <textarea
                value={scriptText}
                onChange={(e) => setScriptText(e.target.value)}
                placeholder="The mysterious disappearance of flight MH370..."
                rows={4}
                className="w-full bg-transparent text-base sm:text-lg text-zinc-100 placeholder:text-zinc-500 font-normal resize-none focus:outline-none leading-relaxed selection:bg-[#00E5FF] selection:text-black tracking-normal pb-6"
              />

              {/* Centered Floating Pill Action Button at Bottom Edge */}
              <div className="absolute -bottom-6 left-1/2 -translate-x-1/2 z-40">
                <Button
                  size="default"
                  onClick={() => {
                    if (scriptText.trim()) {
                      localStorage.setItem("thumbly_draft_prompt", scriptText.trim());
                    }
                    onOpenAuth();
                  }}
                  className="h-12 sm:h-13 px-8 sm:px-10 rounded-full font-extrabold text-xs sm:text-sm bg-gradient-to-r from-[#00E5FF] via-[#2CE8BD] to-[#00E5FF] hover:brightness-110 text-black shadow-[0_0_35px_rgba(0,229,255,0.65)] hover:shadow-[0_0_50px_rgba(0,229,255,0.9)] hover:scale-[1.03] transition-all gap-2 cursor-pointer border border-white/40 whitespace-nowrap"
                >
                  <Sparkles className="h-4 w-4 fill-black text-black" />
                  Generate My First Thumbnail
                </Button>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Watch Demo Link (Positioned directly below the floating button with z-40) */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="flex items-center justify-center gap-3 mt-10 mb-0 relative z-40"
        >
          <button
            onClick={() => {
              const el = document.getElementById("features");
              el?.scrollIntoView({ behavior: "smooth" });
            }}
            className="inline-flex items-center gap-2 text-xs sm:text-sm font-semibold text-zinc-700 hover:text-[#8B47FF] transition-colors cursor-pointer group px-3.5 py-1.5 rounded-full bg-white/95 backdrop-blur-md border border-border shadow-md"
          >
            <span className="w-6 h-6 rounded-full bg-zinc-900 text-white flex items-center justify-center group-hover:bg-[#00E5FF] group-hover:text-black transition-all shadow-sm">
              <Play className="h-3 w-3 fill-current ml-0.5" />
            </span>
            <span className="font-semibold text-foreground">Watch Demo <span className="text-muted-foreground font-mono text-xs ml-1">91 sec</span></span>
          </button>
        </motion.div>
      </div>

      {/* DUAL-ROW CONTINUOUS SLIDING SHOWCASE MARQUEE (Positioned so Row 1 is partially behind and slightly below the prompt box) */}
      <div className="w-full relative -mt-44 sm:-mt-48 pt-2 space-y-4 pointer-events-none select-none z-10">
        {/* Soft radial vignette so cards fade gracefully at edges */}
        <div className="absolute inset-0 bg-gradient-to-b from-white/70 via-transparent to-white pointer-events-none z-10" />

        {/* Gradient edge horizontal fades */}
        <div className="absolute top-0 bottom-0 left-0 w-24 sm:w-48 bg-gradient-to-r from-white via-white/80 to-transparent z-20 pointer-events-none" />
        <div className="absolute top-0 bottom-0 right-0 w-24 sm:w-48 bg-gradient-to-l from-white via-white/80 to-transparent z-20 pointer-events-none" />

        {/* Row 1 - Slide Left */}
        <div className="flex overflow-hidden group opacity-85">
          <div className="flex gap-4 animate-marquee whitespace-nowrap py-1">
            {[...ROW_1_THUMBNAILS, ...ROW_1_THUMBNAILS].map((item, idx) => (
              <ThumbnailMarqueeCard key={idx} item={item} />
            ))}
          </div>
        </div>

        {/* Row 2 - Slide Right */}
        <div className="flex overflow-hidden group opacity-90">
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
    <div className="w-[300px] sm:w-[340px] shrink-0 rounded-2xl bg-white border border-[#EAE5F5] p-3.5 shadow-[0_8px_24px_rgba(15,10,30,0.06)] hover:border-[#8B47FF]/50 transition-all group/card">
      {/* Thumbnail Aspect Card */}
      <div className="relative aspect-video rounded-xl overflow-hidden bg-zinc-950 border border-border/40 mb-2.5 flex items-center justify-center shadow-inner">
        {/* Real Thumbnail Image */}
        <img
          src={item.image}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover group-hover/card:scale-105 transition-transform duration-500"
          loading="lazy"
        />

        {/* Cinematic dark gradient vignette overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-black/30 flex items-end p-3" />

        {/* Text hook watermark */}
        <span className="relative z-10 text-sm sm:text-base font-black text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] tracking-tight uppercase line-clamp-1">
          {item.textHook}
        </span>

        {/* Category tag */}
        <span className="absolute top-2 left-2 z-10 bg-black/60 backdrop-blur-md text-[10px] font-bold text-white px-2 py-0.5 rounded border border-white/10">
          {item.category}
        </span>

        {/* CTR boost badge */}
        <span className="absolute bottom-2 right-2 z-10 bg-[#8B47FF] text-[10px] font-extrabold text-white px-1.5 py-0.5 rounded flex items-center gap-0.5 shadow-md shadow-[#8B47FF]/30">
          <TrendingUp className="h-2.5 w-2.5" />
          {item.ctr}
        </span>
      </div>

      <div className="flex items-center justify-between text-xs pt-0.5">
        <p className="font-bold text-[#0F0A1E] truncate max-w-[200px]" title={item.title}>
          {item.title}
        </p>
        <span className="text-[11px] font-mono text-[#8B47FF] font-bold shrink-0">
          {item.views}
        </span>
      </div>
    </div>
  );
}

export default HeroSection;
