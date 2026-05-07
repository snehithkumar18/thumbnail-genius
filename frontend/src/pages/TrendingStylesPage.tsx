import { useState } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";

const NICHES = ["All", "Finance", "Tech", "Gaming", "Fitness", "Vlog"];

const TREND_ICONS: Record<string, string> = {
  hot: "🔥",
  classic: "⭐",
  new: "🆕",
};

const TREND_COLORS: Record<string, string> = {
  hot: "bg-red-500/20 text-red-400 border-red-500/30",
  classic: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
  new: "bg-blue-500/20 text-blue-400 border-blue-500/30",
};

const CURATED_TRENDS = [
  {
    name: "Shock Reveal",
    category: "All",
    why_it_works: "High contrast and strong emotion instantly grab attention.",
    psychological_trigger: "curiosity",
    best_niches: ["entertainment", "tech", "finance"],
    generation_prompt: "MrBeast style YouTube thumbnail, a shocked young man holding a giant glowing stack of money, crazy dramatic lighting, vibrant cyan and magenta background, 4k, hyper-detailed, extremely expressive",
    trend_status: "hot",
    image_url: "/trends/mrbeast.png"
  },
  {
    name: "Big Number Promise",
    category: "Finance",
    why_it_works: "Numbers create specificity and make results feel measurable.",
    psychological_trigger: "certainty",
    best_niches: ["finance", "business"],
    generation_prompt: "Finance YouTube thumbnail, confident man pointing at a glowing green upward graph, big bold 3D text '100X', dark moody studio background, blue and green neon lights, 4k",
    trend_status: "hot",
    image_url: "/trends/finance.png"
  },
  {
    name: "Reaction Close-up",
    category: "Gaming",
    why_it_works: "Extreme emotional reactions connect perfectly with gaming audiences.",
    psychological_trigger: "empathy",
    best_niches: ["gaming", "entertainment"],
    generation_prompt: "Gaming YouTube thumbnail, dramatic close-up of a sweaty competitive gamer reacting in shock, intense red and orange lighting, glowing eyes, cinematic, 4k",
    trend_status: "hot",
    image_url: "/trends/gaming.png"
  },
  {
    name: "Minimal Premium Tech",
    category: "Tech",
    why_it_works: "Clean, premium gradients signal high-quality production value.",
    psychological_trigger: "status",
    best_niches: ["tech", "reviews"],
    generation_prompt: "Tech review YouTube thumbnail, sleek modern smartphone floating, neon purple and pink gradient background, clean minimalist studio lighting, high contrast, 4k",
    trend_status: "classic",
    image_url: "/trends/tech.png"
  },
  {
    name: "Before vs After Split",
    category: "Fitness",
    why_it_works: "Clear visual contrast makes the value proposition obvious instantly.",
    psychological_trigger: "clarity",
    best_niches: ["fitness", "education"],
    generation_prompt: "Fitness YouTube thumbnail, before and after split screen, dramatic body transformation, intense gym lighting, high contrast, bold text, 4k",
    trend_status: "classic",
    image_url: "/trends/fitness.png"
  },
  {
    name: "Aspirational Lifestyle",
    category: "Vlog",
    why_it_works: "Beautiful saturated colors and aspirational settings trigger FOMO.",
    psychological_trigger: "fomo",
    best_niches: ["travel", "vlog"],
    generation_prompt: "Vlog YouTube thumbnail, beautiful tropical beach at sunset, creator looking back at camera with a surprised expression, warm golden hour lighting, high saturation, 4k",
    trend_status: "new",
    image_url: "/trends/vlog.png"
  }
];

const TrendingStylesPage = () => {
  const navigate = useNavigate();
  const [niche, setNiche] = useState("All");

  const filteredTrends = niche === "All" 
    ? CURATED_TRENDS 
    : CURATED_TRENDS.filter(t => t.category.toLowerCase() === niche.toLowerCase() || t.category === "All");

  const handleTryStyle = (prompt: string) => {
    navigate("/dashboard", { state: { prefillPrompt: prompt } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">📈 Trending Thumbnail Styles</h1>
          <Badge variant="outline" className="border-border text-muted-foreground">Curated Selection</Badge>
        </div>
        <p className="text-muted-foreground">High-converting styles with copy-paste prompts</p>
      </div>

      {/* Niche filter */}
      <div className="flex gap-2 flex-wrap">
        {NICHES.map(n => (
          <Button
            key={n}
            variant={niche === n ? "default" : "outline"}
            size="sm"
            onClick={() => setNiche(n)}
            className={niche === n ? "bg-primary text-primary-foreground" : ""}
          >
            {n}
          </Button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {filteredTrends.map((trend, i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-xl p-5 space-y-4 hover:border-primary/30 transition-colors flex flex-col"
          >
            {/* Visual mockup */}
            <div className="relative h-40 rounded-lg overflow-hidden border border-border shadow-sm">
              <img src={trend.image_url} alt={trend.name} className="w-full h-full object-cover" />
              <div className="absolute top-2 right-2">
                <Badge variant="outline" className={`backdrop-blur-md shadow-sm ${TREND_COLORS[trend.trend_status]}`}>
                  {TREND_ICONS[trend.trend_status]} {trend.trend_status}
                </Badge>
              </div>
            </div>

            <div className="flex-1 space-y-3">
              <div>
                <h3 className="font-semibold text-foreground text-sm">{trend.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 leading-relaxed line-clamp-2" title={trend.why_it_works}>
                  {trend.why_it_works}
                </p>
              </div>

              <div className="flex flex-wrap gap-1">
                {trend.best_niches.map(n => (
                  <span key={n} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground capitalize">
                    {n}
                  </span>
                ))}
              </div>
            </div>

            <Button
              variant="default" size="sm" className="w-full mt-auto"
              onClick={() => handleTryStyle(trend.generation_prompt)}
            >
              <Zap className="h-3.5 w-3.5 mr-1.5 fill-current" /> Use This Prompt
            </Button>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default TrendingStylesPage;
