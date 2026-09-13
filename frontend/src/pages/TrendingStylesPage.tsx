import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Zap, Copy, Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

const NICHES = [
  "All",
  "Extreme & Stunts",
  "Luxury & Contrast",
  "Sports & Challenge",
  "Vlog & IRL",
  "Comedy & Entertainment",
  "Tech"
];

const TREND_ICONS: Record<string, string> = {
  hot: "🔥",
  classic: "⭐",
  new: "✨",
};

const TREND_COLORS: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  classic: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  new: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
};

export const LANDING_HERO_TRENDS = [
  {
    id: "train-stunt",
    name: "Extreme Train Collision",
    category: "Extreme & Stunts",
    textHook: "WILL IT STOP?!",
    ctrBoost: "+48% CTR",
    views: "14.8M views",
    why_it_works: "High-contrast collision climax paired with authentic human disbelief creates an instant curiosity gap that viewers cannot scroll past.",
    psychological_trigger: "Shock & Curiosity",
    best_niches: ["extreme", "stunts", "challenges"],
    generation_prompt: "Photorealistic YouTube thumbnail, a massive red freight locomotive train smashing violently through a reinforced brick barrier with flying bricks and smoke. On the right side, a young man in a black hoodie with an ultra-realistic shocked face, eyes wide open and hand on mouth in complete disbelief. High contrast, sharp 8K photography, real skin texture, cinematic lighting, bold text 'WILL IT STOP?!'",
    trend_status: "hot",
    image_url: "/hero-thumb-train.jpg",
  },
  {
    id: "hotel-contrast",
    name: "$1 vs $1,000,000 Hotel Suite",
    category: "Luxury & Contrast",
    textHook: "$1 VS $1,000,000",
    ctrBoost: "+54% CTR",
    views: "34.2M views",
    why_it_works: "Extreme visual contrast between poverty and luxury triggers immediate curiosity and high click-through rates.",
    psychological_trigger: "Status & Curiosity",
    best_niches: ["luxury", "challenges", "travel"],
    generation_prompt: "Photorealistic split 50/50 YouTube thumbnail comparison, on the left side a young man looking exhausted on a broken $1 camping cot, on the right side the same young man looking thrilled in a $1,000,000 luxury gold hotel suite. Ultra-realistic real human photography, natural skin texture, cinematic studio lighting, sharp 8K quality, bold 3D text '$1 VS $1,000,000'",
    trend_status: "hot",
    image_url: "/hero-thumb-hotel-contrast.jpg",
  },
  {
    id: "speed-irl",
    name: "Festive Street IRL Stream",
    category: "Vlog & IRL",
    textHook: "CRAZY IRL!",
    ctrBoost: "+51% CTR",
    views: "12.4M views",
    why_it_works: "Dynamic crowd energy, vivid festival colors, and ecstatic facial expression compel casual viewers to click.",
    psychological_trigger: "Social Proof & FOMO",
    best_niches: ["streaming", "vlog", "irl"],
    generation_prompt: "Photorealistic YouTube thumbnail, a high-energy young streamer in an electric blue and orange sports jersey shouting with extreme excitement, surrounded by an ecstatic cheering crowd in a vibrant festival street with colorful confetti and fireworks. Ultra-realistic real human faces, natural skin textures, 8K photography, high dynamic range, bold text 'CRAZY IRL!'",
    trend_status: "hot",
    image_url: "/hero-thumb-speed-irl.jpg",
  },
  {
    id: "solitary-confinement",
    name: "50 Hours Solitary Confinement",
    category: "Extreme & Stunts",
    textHook: "DAY 5 - 50 HOURS!",
    ctrBoost: "+46% CTR",
    views: "9.8M views",
    why_it_works: "Heavy steel chains, padlocks, and visible physical exhaustion trigger empathy and high watch-time anticipation.",
    psychological_trigger: "Empathy & Endurance",
    best_niches: ["survival", "stunts", "challenges"],
    generation_prompt: "Photorealistic YouTube thumbnail, a young man trapped in a padded white security cell, chained with realistic steel chains and massive heavy padlock, looking directly at the camera with intense sweat and exhaustion. On the white padded wall behind him, scratch marks and bold text 'DAY 5 - 50 HOURS!'. Ultra-realistic real human skin texture, high dynamic range, intense cinematic studio lighting",
    trend_status: "classic",
    image_url: "/hero-thumb-solitary.jpg",
  },
  {
    id: "tinder-irl",
    name: "Tinder IRL Comedy Challenge",
    category: "Comedy & Entertainment",
    textHook: "TINDER IRL!",
    ctrBoost: "+49% CTR",
    views: "28.5M views",
    why_it_works: "Social awkwardness and dating tension are among the highest-converting entertainment formats on YouTube.",
    psychological_trigger: "Social Intrigue & Humor",
    best_niches: ["comedy", "dating", "entertainment"],
    generation_prompt: "Photorealistic YouTube thumbnail, an expressive Indian young male creator wearing stylish modern glasses and red jacket in the center with a shocked funny expression, seated at a talk show speed-dating set between two glamorous Indian female contestants in stylish red dresses. Bold text hook 'TINDER IRL!' in high-impact red and white typography. Ultra-realistic real human photography, authentic facial features, sharp studio lighting, 8K quality",
    trend_status: "hot",
    image_url: "/hero-thumb-tinder-irl.jpg",
  },
  {
    id: "champion-faceoff",
    name: "Streamer vs World Champion",
    category: "Sports & Challenge",
    textHook: "CHAMPION VS STREAMER",
    ctrBoost: "+58% CTR",
    views: "45.0M views",
    why_it_works: "Complementary cyan/orange split with 50/50 dual focal points follows the proven YouTube Rule of Halves.",
    psychological_trigger: "Rivalry & Celebrity",
    best_niches: ["sports", "gaming", "entertainment"],
    generation_prompt: "Photorealistic YouTube thumbnail, split complementary background cyan on left and vibrant orange on right. On the left side a young male streamer laughing and pointing, on the right side a world-class athletic soccer champion smiling with trophy. Bold 3D paper cutout title 'CHALLENGE: CHAMPION VS STREAMER'. Ultra-realistic real human faces, sharp 8K photography, high dynamic range, rim lighting",
    trend_status: "hot",
    image_url: "/hero-thumb-champion.jpg",
  },
  {
    id: "plane-contrast",
    name: "$1 Flight vs $500k Private Jet",
    category: "Luxury & Contrast",
    textHook: "$1 VS $500K TICKET",
    ctrBoost: "+56% CTR",
    views: "52.1M views",
    why_it_works: "Comparing worst-case vs peak luxury experiences satisfies viewer curiosity about how the top 0.01% live.",
    psychological_trigger: "Curiosity & Luxury",
    best_niches: ["luxury", "travel", "challenges"],
    generation_prompt: "Photorealistic split 50/50 YouTube thumbnail comparison, on the left side a cramped uncomfortable economy airplane seat with broken tray table and messy crumbs labeled '$1 FLIGHT', on the right side an opulent private jet cabin with luxurious cream leather armchair, gold fixtures, and gourmet caviar platter labeled '$500,000 TICKET'. In the center, a young male creator with an expressive reaction. Ultra-realistic real human photography, 8K sharp detail, natural lighting",
    trend_status: "hot",
    image_url: "/hero-thumb-plane-contrast.jpg",
  },
  {
    id: "penny-challenge",
    name: "1 Penny Survival Journey",
    category: "Vlog & IRL",
    textHook: "1 PENNY CHALLENGE",
    ctrBoost: "+47% CTR",
    views: "18.3M views",
    why_it_works: "Top-down perspective and relatable low-budget premise create high curiosity about whether the challenge was possible.",
    psychological_trigger: "Relatability & Adventure",
    best_niches: ["travel", "adventure", "vlog"],
    generation_prompt: "Photorealistic YouTube thumbnail, birds-eye top-down view of two young friends lying on lush green grass with joyful smiling faces looking up at camera. In the center between them is a giant shiny copper penny. High contrast vibrant natural daylight photography, ultra-realistic real human skin texture, authentic smiles, sharp 8K quality, bold text hook '1 PENNY CHALLENGE!'",
    trend_status: "classic",
    image_url: "/hero-thumb-penny.jpg",
  },
  {
    id: "trick-shot",
    name: "Impossible Rooftop Trick Shot",
    category: "Sports & Challenge",
    textHook: "IMPOSSIBLE SHOT!",
    ctrBoost: "+44% CTR",
    views: "11.2M views",
    why_it_works: "Clear athletic action framing with a glowing target makes the goal instantly understood within 0.2 seconds.",
    psychological_trigger: "Athletic Disbelief",
    best_niches: ["sports", "challenges", "trickshots"],
    generation_prompt: "Photorealistic YouTube thumbnail, an athletic female football player with dark hair in a sporty black tracksuit lining up an insane curved kick with a soccer ball. In the background, a giant 10-foot glowing neon bullseye target suspended over a luxury rooftop infinity pool, with a tall goalkeeper diving in mid-air. Ultra-realistic real human photography, natural skin texture, dramatic daylight lighting, bold text 'IMPOSSIBLE SHOT!'",
    trend_status: "new",
    image_url: "/hero-thumb-celine.jpg",
  },
  {
    id: "tornado-survival",
    name: "100-Day Circle Survival",
    category: "Extreme & Stunts",
    textHook: "DAY 99 SURVIVAL!",
    ctrBoost: "+52% CTR",
    views: "38.7M views",
    why_it_works: "Countdown stakes ('Day 99') combined with severe weather peril create urgency and high click-through commitment.",
    psychological_trigger: "Urgency & Peril",
    best_niches: ["survival", "stunts", "challenges"],
    generation_prompt: "Photorealistic YouTube thumbnail, a gritty young man with dirt and sweat on his face lying prone on a grass field gripping grass with white knuckles, staying inside a painted red circular border line. In the background, a massive dark swirling tornado tearing across the stormy sky. Ultra-realistic real human skin texture, gritty cinematic realism, intense dramatic lighting, bold text 'DAY 99!' in upper corner",
    trend_status: "hot",
    image_url: "/hero-thumb-tornado.jpg",
  },
  {
    id: "transparent-phone",
    name: "Transparent Holographic Tech",
    category: "Tech",
    textHook: "FUTURE TECH?!",
    ctrBoost: "+45% CTR",
    views: "16.4M views",
    why_it_works: "Novelty tech unboxing with glowing holographic visuals sparks massive curiosity from gadget and science fans.",
    psychological_trigger: "Future Novelty",
    best_niches: ["tech", "unboxing", "gadgets"],
    generation_prompt: "Photorealistic YouTube thumbnail, a charismatic young Indian tech creator with stylish trimmed beard and glasses in a neon-lit futuristic technology studio, looking amazed as he holds a glowing transparent holographic glass smartphone that projects a 3D hologram. High contrast studio lighting, ultra-realistic real human face and hands, natural skin pores, bold text 'TRANSPARENT PHONE?!'",
    trend_status: "new",
    image_url: "/hero-thumb-tech.jpg",
  }
];

const TrendingStylesPage = () => {
  const navigate = useNavigate();
  const [niche, setNiche] = useState("All");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredTrends = niche === "All" 
    ? LANDING_HERO_TRENDS 
    : LANDING_HERO_TRENDS.filter(t => t.category.toLowerCase() === niche.toLowerCase() || t.best_niches.some(bn => bn.toLowerCase().includes(niche.toLowerCase())));

  const handleCopyPrompt = (id: string, promptText: string) => {
    navigator.clipboard.writeText(promptText);
    setCopiedId(id);
    toast.success("Prompt copied to clipboard!");
    setTimeout(() => setCopiedId(null), 2500);
  };

  const handleTryStyle = (promptText: string) => {
    navigate("/dashboard/generate", { state: { prefillPrompt: promptText } });
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl sm:text-3xl font-heading font-extrabold text-foreground tracking-tight flex items-center gap-2">
            <span>📈 Trending Thumbnail Styles</span>
          </h1>
          <Badge variant="outline" className="border-primary/30 text-primary bg-primary/5 font-semibold">
            11 Production Formulas
          </Badge>
        </div>
        <p className="text-muted-foreground text-sm sm:text-base">
          Proven, high-converting thumbnail packaging formulas from the landing page. Copy the exact prompt or open in generator.
        </p>
      </div>

      {/* Niche filter chips */}
      <div className="flex gap-2 flex-wrap items-center">
        {NICHES.map(n => (
          <Button
            key={n}
            variant={niche === n ? "default" : "outline"}
            size="sm"
            onClick={() => setNiche(n)}
            className={`rounded-full text-xs font-semibold cursor-pointer transition-all ${
              niche === n ? "bg-primary text-primary-foreground shadow-md shadow-primary/25" : "border-border hover:bg-muted"
            }`}
          >
            {n}
          </Button>
        ))}
      </div>

      {/* Grid of Styles */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTrends.map((trend, i) => (
          <motion.div
            key={trend.id}
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="bg-card border border-border/80 rounded-2xl p-4 sm:p-5 space-y-4 hover:border-primary/40 hover:shadow-xl hover:shadow-primary/5 transition-all flex flex-col group"
          >
            {/* Visual mockup with CTR badge and hook */}
            <div className="relative aspect-video rounded-xl overflow-hidden border border-border bg-black shadow-sm group-hover:scale-[1.01] transition-transform">
              <img 
                src={trend.image_url} 
                alt={trend.name} 
                className="w-full h-full object-cover" 
                loading="lazy" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 pointer-events-none" />

              {/* Status Badge */}
              <div className="absolute top-2.5 right-2.5">
                <Badge variant="outline" className={`backdrop-blur-md shadow-sm text-[11px] font-bold ${TREND_COLORS[trend.trend_status]}`}>
                  {TREND_ICONS[trend.trend_status]} {trend.trend_status.toUpperCase()}
                </Badge>
              </div>

              {/* Text Hook Watermark */}
              <div className="absolute bottom-2.5 left-2.5">
                <span className="text-xs font-black text-yellow-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] tracking-tight uppercase">
                  {trend.textHook}
                </span>
              </div>

              {/* CTR Boost badge */}
              <div className="absolute bottom-2.5 right-2.5">
                <span className="bg-primary text-[10px] font-extrabold text-white px-2 py-0.5 rounded flex items-center gap-1 shadow-md shadow-primary/40">
                  <TrendingUp className="h-2.5 w-2.5" />
                  {trend.ctrBoost}
                </span>
              </div>
            </div>

            {/* Information */}
            <div className="flex-1 space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold text-foreground text-base tracking-tight">{trend.name}</h3>
                  <span className="text-xs font-mono font-bold text-primary shrink-0">{trend.views}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed line-clamp-2" title={trend.why_it_works}>
                  {trend.why_it_works}
                </p>
              </div>

              {/* Psychology trigger & tags */}
              <div className="flex flex-wrap gap-1.5 items-center">
                <span className="text-[10px] bg-primary/10 text-primary font-bold px-2 py-0.5 rounded-full border border-primary/20">
                  ⚡ {trend.psychological_trigger}
                </span>
                {trend.best_niches.map(n => (
                  <span key={n} className="text-[10px] bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize font-medium">
                    {n}
                  </span>
                ))}
              </div>

              {/* Collapsible/Preview Prompt Box */}
              <div className="rounded-lg bg-muted/60 border border-border/70 p-2.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Sparkles className="h-3 w-3 text-primary" />
                    Exact Prompt
                  </span>
                  <button
                    onClick={() => handleCopyPrompt(trend.id, trend.generation_prompt)}
                    className="hover:text-foreground text-primary flex items-center gap-1 cursor-pointer transition-colors text-[10px] font-bold"
                  >
                    {copiedId === trend.id ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-500" />
                        <span className="text-emerald-500">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>
                <p className="text-xs text-foreground/90 font-mono leading-relaxed line-clamp-3 select-all" title={trend.generation_prompt}>
                  "{trend.generation_prompt}"
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs font-semibold gap-1.5 cursor-pointer"
                onClick={() => handleCopyPrompt(trend.id, trend.generation_prompt)}
              >
                {copiedId === trend.id ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-500" />
                    <span>Copied</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Prompt</span>
                  </>
                )}
              </Button>

              <Button
                variant="hero"
                size="sm"
                className="w-full text-xs font-bold gap-1.5 cursor-pointer shadow-sm"
                onClick={() => handleTryStyle(trend.generation_prompt)}
              >
                <Zap className="h-3.5 w-3.5 fill-current" />
                <span>Use Style</span>
              </Button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingStylesPage;

