import { useLocation, useNavigate } from "react-router-dom";
import { Search, Bell, Gem, ChevronDown, User, CreditCard, Gift, Users, LogOut } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { SidebarTrigger } from "@/components/ui/sidebar";
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
  "/dashboard": "Generate",
  "/dashboard/shorts": "Shorts Cover",
  "/dashboard/recreate": "Recreate",
  "/dashboard/editor": "AI Editor",
  "/dashboard/faceswap": "Face Swap",
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
  const { totalCredits, plan, hasSubscription } = usePlanAccess();

  const title = routeTitles[location.pathname] ?? "Dashboard";
  const isLowCredits = totalCredits < 5;

  return (
    <>
      <PaymentSuccessOverlay />
              size="sm"
              className="hidden md:flex text-xs text-muted-foreground hover:text-foreground"
              onClick={() => navigate('/pricing')}
            >
              ⚡ Upgrade from $10/mo
            </Button>
          )}

          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground">
            <Search className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-foreground relative">
            <Bell className="h-4 w-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-primary rounded-full" />
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
