import { NavLink } from "react-router-dom";
import { Zap, Smartphone, RefreshCw, User, Type, BarChart3, TrendingUp, FolderOpen, Palette, FlaskConical, Settings, BookOpen, Gift, Sparkles, Eraser } from "lucide-react";

const navItems = [
  { title: "Smart Edit", url: "/dashboard", end: true, icon: Sparkles, badge: "NEW" },
  { title: "Generate", url: "/dashboard/generate", icon: Zap },
  { title: "Shorts Cover", url: "/dashboard/shorts", icon: Smartphone },
  { title: "Recreate", url: "/dashboard/recreate", icon: RefreshCw },
  { title: "Face Swap", url: "/dashboard/faceswap", icon: User },
  { title: "Background Removal", url: "/dashboard/background-removal", icon: Eraser },
  { title: "Titles & Scripts", url: "/dashboard/titles", icon: Type },
  { title: "Thumbnail Scorer", url: "/dashboard/scorer", icon: BarChart3 },
  { title: "Trending Styles", url: "/dashboard/trending", icon: TrendingUp },
  { title: "Prompt Library", url: "/dashboard/prompts", icon: BookOpen },
  { title: "My Thumbnails", url: "/dashboard/thumbnails", icon: FolderOpen },
  { title: "Brand Kit", url: "/dashboard/brandkit", icon: Palette },
  { title: "A/B Tester", url: "/dashboard/abtester", icon: FlaskConical },
  { title: "Refer & Earn", url: "/dashboard/referrals", icon: Gift },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSubNav() {
  return (
    <div className="sticky top-[56px] sm:top-[60px] z-[30] w-full bg-card/85 backdrop-blur-md border-b border-border">
      <div className="max-w-7xl mx-auto relative px-3 sm:px-4">
        {/* Left Fade Indicator */}
        <div className="absolute left-0 top-0 bottom-0 w-4 bg-gradient-to-r from-card to-transparent pointer-events-none z-10 block sm:hidden" />
        
        {/* Scrollable Container */}
        <div className="flex items-center gap-1.5 py-2.5 overflow-x-auto scrollbar-none whitespace-nowrap scroll-smooth select-none">
          {navItems.map((item) => (
            <NavLink
              key={item.title}
              to={item.url}
              end={item.end}
              className={({ isActive }) =>
                `flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all ${
                  isActive
                    ? "bg-primary text-primary-foreground shadow-sm shadow-primary/25 font-semibold"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
                }`
              }
            >
              <item.icon className="h-3.5 w-3.5 shrink-0" />
              <span>{item.title}</span>
              {item.badge && (
                <span className="bg-amber-500 text-white text-[8px] font-black px-1 py-0.25 rounded-full leading-none animate-pulse">
                  {item.badge}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Right Fade Indicator */}
        <div className="absolute right-0 top-0 bottom-0 w-4 bg-gradient-to-l from-card to-transparent pointer-events-none z-10 block sm:hidden" />
      </div>
    </div>
  );
}
