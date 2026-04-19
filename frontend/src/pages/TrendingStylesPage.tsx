import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { TrendingUp, Zap, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

const NICHES = ["All", "Finance", "Tech", "Gaming", "Fitness", "Food", "Travel"];

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

const PLACEHOLDER_GRADIENTS = [
  "from-red-500/30 to-orange-500/30",
  "from-blue-500/30 to-purple-500/30",
  "from-green-500/30 to-teal-500/30",
  "from-pink-500/30 to-rose-500/30",
  "from-yellow-500/30 to-amber-500/30",
  "from-indigo-500/30 to-violet-500/30",
  "from-cyan-500/30 to-sky-500/30",
  "from-emerald-500/30 to-lime-500/30",
  "from-fuchsia-500/30 to-pink-500/30",
];

type TrendItem = {
  name: string;
  category: string;
  why_it_works: string;
  psychological_trigger: string;
  best_niches: string[];
  generation_prompt: string;
  trend_status: string;
};

const TrendingStylesPage = () => {
  const navigate = useNavigate();
  const [niche, setNiche] = useState("All");
  const [trends, setTrends] = useState<TrendItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTrends = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("get-trends", {
        body: { niche: niche.toLowerCase() },
      });
      if (error) throw error;
      if (data?.trends) setTrends(data.trends);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : "Failed to load trends";
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { fetchTrends(); }, [niche]);

  const handleTryStyle = (prompt: string) => {
    navigate("/dashboard", { state: { prefillPrompt: prompt } });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-2xl font-heading font-bold text-foreground">📈 Trending Thumbnail Styles</h1>
          <Badge variant="outline" className="border-border text-muted-foreground">Updated daily</Badge>
        </div>
        <p className="text-muted-foreground">What's working on YouTube right now</p>
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
      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="bg-card border border-border rounded-xl p-5 space-y-3 animate-pulse">
              <div className={`h-24 sm:h-28 rounded-lg bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[i]}`} />
              <div className="h-4 bg-muted rounded w-3/4" />
              <div className="h-3 bg-muted rounded w-full" />
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {trends.map((trend, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="bg-card border border-border rounded-xl p-5 space-y-3 hover:border-primary/30 transition-colors"
            >
              {/* Visual mockup */}
              <div className={`h-24 sm:h-28 rounded-lg bg-gradient-to-br ${PLACEHOLDER_GRADIENTS[i % PLACEHOLDER_GRADIENTS.length]} flex items-center justify-center`}>
                <span className="text-3xl">{TREND_ICONS[trend.trend_status] || "📌"}</span>
              </div>

              <div className="flex items-center gap-2">
                <h3 className="font-semibold text-foreground text-sm">{trend.name}</h3>
                <Badge variant="outline" className={TREND_COLORS[trend.trend_status] || "border-border"}>
                  {TREND_ICONS[trend.trend_status]} {trend.trend_status}
                </Badge>
              </div>

              <p className="text-xs text-muted-foreground">{trend.why_it_works}</p>

              <div className="flex flex-wrap gap-1">
                {trend.best_niches.map(n => (
                  <span key={n} className="text-xs bg-muted px-2 py-0.5 rounded-full text-muted-foreground">{n}</span>
                ))}
              </div>

              <Button
                variant="outline" size="sm" className="w-full"
                onClick={() => handleTryStyle(trend.generation_prompt)}
              >
                <Zap className="h-3 w-3 mr-1" /> Try This Style
              </Button>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default TrendingStylesPage;
