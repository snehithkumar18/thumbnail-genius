import { useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect } from "react";
import { Search, Bell, Gem, ChevronDown, User, CreditCard, Gift, Users, LogOut, Sun, Moon, Zap } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useProfile } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useAuth } from "@/contexts/AuthContext";
import PaymentSuccessOverlay from "@/components/PaymentSuccessOverlay";
import { CreditsBadge } from "@/components/CreditsBadge";

const routeTitles: Record<string, string> = {
  "/dashboard": "Smart Edit",
  "/dashboard/smart-editor": "Smart Edit",
  "/dashboard/generate": "Generate",
  "/dashboard/shorts": "Shorts Cover",
  "/dashboard/recreate": "Recreate",
  "/dashboard/editor": "AI Editor",
  "/dashboard/faceswap": "Face Swap",
  "/dashboard/background-removal": "Background Removal",
  "/dashboard/titles": "Titles & Scripts",
  "/dashboard/scorer": "Thumbnail Scorer",
  "/dashboard/trending": "Trending Styles",
  "/dashboard/thumbnails": "My Thumbnails",
  "/dashboard/brandkit": "Brand Kit",
  "/dashboard/abtester": "A/B Tester",
  "/dashboard/settings": "Settings",
  "/dashboard/prompts": "Prompt Library",
  "/dashboard/referrals": "Refer & Earn",
};

export function DashboardTopBar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const { data: profile } = useProfile();
  const { totalCredits } = usePlanAccess();

  const [isDark, setIsDark] = useState(() => document.documentElement.classList.contains("dark"));

  useEffect(() => {
    // Sync state if theme changes elsewhere
    const checkDark = () => {
      setIsDark(document.documentElement.classList.contains("dark"));
    };
    window.addEventListener("storage", checkDark);
    return () => window.removeEventListener("storage", checkDark);
  }, []);

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("Thumbly-theme", next ? "dark" : "light");
    // Dispatch storage event to notify other components
    window.dispatchEvent(new Event("storage"));
  };

  const title = routeTitles[location.pathname] ?? "Dashboard";
  const isLowCredits = totalCredits < 5;

  return (
    <>
      <PaymentSuccessOverlay />
      <header className="h-[56px] sm:h-[60px] border-b border-border bg-card flex items-center justify-between px-3 sm:px-4 sticky top-0 z-[40]">
        <div className="flex items-center gap-2.5">
          <div className="flex items-center gap-1.5 cursor-pointer" onClick={() => navigate("/dashboard")}>
            <Zap className="h-5 w-5 text-primary fill-primary" />
            <span className="font-heading font-black text-lg text-foreground tracking-tight">
              Thumbly
            </span>
          </div>
          <span className="text-border text-sm">|</span>
          <span className="text-xs sm:text-sm font-semibold bg-muted text-muted-foreground px-2 py-0.5 rounded border border-border">
            {title}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3">
          {isLowCredits && (
            <Button
              size="sm"
              className="hidden md:flex text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/pricing')}
            >
              Upgrade from $10/mo
            </Button>
          )}

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground hidden sm:flex h-9 w-9">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative hidden sm:flex h-9 w-9">
            <Bell className="h-4 w-4" />
            <span className="absolute top-2 right-2 w-1.5 h-1.5 bg-primary rounded-full" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="text-muted-foreground hover:text-foreground h-9 w-9"
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          </Button>

          <CreditsBadge
            balance={totalCredits}
            onClick={() => navigate('/pricing')}
          />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-2 hover:bg-muted rounded-lg p-1.5 transition-colors">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url ?? undefined} />
                  <AvatarFallback className="bg-primary/20 text-primary text-xs">
                    {(profile?.username?.[0] ?? "U").toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="h-3 w-3 text-muted-foreground" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 bg-card border-border">
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="text-foreground">
                <User className="h-4 w-4 mr-2" /> Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/dashboard/settings")} className="text-foreground">
                <CreditCard className="h-4 w-4 mr-2" /> Billing
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate("/pricing")} className="text-foreground">
                <Gift className="h-4 w-4 mr-2" /> Buy Credits
              </DropdownMenuItem>
              <DropdownMenuItem className="text-foreground">
                <Users className="h-4 w-4 mr-2" /> Refer a Friend
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={signOut} className="text-destructive">
                <LogOut className="h-4 w-4 mr-2" /> Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>
    </>
  );
}
