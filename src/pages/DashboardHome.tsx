import { motion } from "framer-motion";
import { Zap, Smartphone, RefreshCw, Gem, Heart, BarChart3, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCredits, useThumbnailStats, useThumbnails } from "@/hooks/useSupabaseData";
import { useProfile } from "@/hooks/useSupabaseData";
import { useNavigate } from "react-router-dom";
import { PLAN_LIMITS } from "@/lib/credits";

const DashboardHome = () => {
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();
  const { data: stats } = useThumbnailStats();
  const { data: recentThumbs } = useThumbnails();
  const navigate = useNavigate();

  const planType = (credits?.plan_type ?? "free") as keyof typeof PLAN_LIMITS;
  const maxCredits = PLAN_LIMITS[planType]?.credits ?? 20;

  const statCards = [
    { label: "Total Generated", value: stats?.total ?? 0, icon: BarChart3, color: "text-primary" },
    { label: "Credits Remaining", value: credits?.credits_remaining ?? 0, icon: Gem, color: "text-secondary" },
    { label: "Used This Month", value: credits?.credits_used_this_month ?? 0, icon: Sparkles, color: "text-primary" },
    { label: "Favorites", value: stats?.favorites ?? 0, icon: Heart, color: "text-destructive" },
  ];

  const quickActions = [
    { label: "Generate Thumbnail", icon: Zap, route: "/dashboard", emoji: "⚡" },
    { label: "Shorts Cover", icon: Smartphone, route: "/dashboard/shorts", emoji: "📱" },
    { label: "Recreate", icon: RefreshCw, route: "/dashboard/recreate", emoji: "🔁" },
  ];

  const showWelcome = profile && !profile.onboarding_complete;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      {/* Welcome banner */}
      {showWelcome && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary/5 rounded-full blur-[80px]" />
          <h2 className="text-xl font-heading font-bold text-foreground mb-2">
            Welcome to ThumbAI! You have 20 free credits 🎉
          </h2>
          <p className="text-muted-foreground text-sm mb-4">
            Complete setup to unlock all features
          </p>
          <div className="w-full bg-muted rounded-full h-2 max-w-xs">
            <div className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full" style={{ width: "25%" }} />
          </div>
          <p className="text-xs text-muted-foreground mt-2">1 of 4 steps complete</p>
        </motion.div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="glass-card rounded-xl p-5"
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground">{stat.label}</span>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </div>
            <p className="text-2xl font-heading font-bold text-foreground">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {quickActions.map((action, i) => (
            <motion.div
              key={action.label}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
            >
              <Button
                variant="outline"
                className="w-full h-20 flex flex-col gap-2 border-border hover:border-primary/30 hover:bg-primary/5 transition-all"
                onClick={() => navigate(action.route)}
              >
                <span className="text-2xl">{action.emoji}</span>
                <span className="text-sm font-medium text-foreground">{action.label}</span>
              </Button>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Recent Thumbnails */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Recent Thumbnails</h3>
          <Button variant="ghost" size="sm" className="text-primary" onClick={() => navigate("/dashboard/thumbnails")}>
            View All
          </Button>
        </div>
        {recentThumbs && recentThumbs.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {recentThumbs.slice(0, 8).map((thumb) => (
              <div key={thumb.id} className="glass-card rounded-xl overflow-hidden group cursor-pointer">
                <div className="aspect-video bg-muted relative">
                  {thumb.image_url ? (
                    <img src={thumb.image_url} alt={thumb.prompt ?? ""} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">
                      No preview
                    </div>
                  )}
                  <div className="absolute top-2 right-2">
                    <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 text-foreground font-medium">
                      {thumb.format_type === "9:16" ? "📱 9:16" : "📺 16:9"}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="glass-card rounded-xl p-10 text-center">
            <Zap className="h-8 w-8 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground text-sm">No thumbnails yet. Generate your first one!</p>
            <Button variant="pill" size="sm" className="mt-4" onClick={() => navigate("/dashboard")}>
              Generate Now
            </Button>
          </div>
        )}
      </div>

      {/* Trending Prompt */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="glass-card rounded-xl p-6"
      >
        <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          🔥 Trending Prompt of the Day
        </h3>
        <p className="text-foreground font-medium mb-4">
          "Shocked face looking at laptop screen with stock charts going up, dark background with green glow"
        </p>
        <Button variant="pill" size="sm">
          Try This
        </Button>
      </motion.div>
    </div>
  );
};

export default DashboardHome;
