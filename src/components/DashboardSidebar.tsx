import { Zap, Smartphone, RefreshCw, Pencil, User, Type, BarChart3, TrendingUp, FolderOpen, Palette, FlaskConical, Settings, Gem, CreditCard, BookOpen, Gift } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile, useCredits } from "@/hooks/useSupabaseData";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
  useSidebar,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Generate", url: "/dashboard", icon: Zap },
  { title: "Shorts Cover", url: "/dashboard/shorts", icon: Smartphone },
  { title: "Recreate", url: "/dashboard/recreate", icon: RefreshCw },
  { title: "AI Editor", url: "/dashboard/editor", icon: Pencil },
  { title: "Face Swap", url: "/dashboard/faceswap", icon: User },
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

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const navigate = useNavigate();
  const { data: profile } = useProfile();
  const { totalCredits, plan, hasSubscription, subscriptionCredits, topupCredits } = usePlanAccess();

  const isLowCredits = totalCredits < 5;

  return (
    <Sidebar collapsible="icon" className="border-r border-border bg-card">
      <SidebarContent className="py-4">
        {/* Logo */}
        <div className="px-4 mb-6 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary fill-primary shrink-0" />
          {!collapsed && <span className="font-heading font-bold text-foreground text-lg">ThumbAI</span>}
        </div>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider px-4">
            {!collapsed && "Tools"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.slice(0, 8).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === "/dashboard"}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        <SidebarGroup>
          <SidebarGroupLabel className="text-muted-foreground text-xs uppercase tracking-wider px-4">
            {!collapsed && "Library"}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.slice(8).map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                      activeClassName="bg-primary/10 text-primary font-medium"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-3 border-t border-border">
        {/* Credits */}
        {!collapsed && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Credits</span>
              <span className={`font-medium ${isLowCredits ? 'text-destructive animate-pulse' : 'text-foreground'}`}>
                {totalCredits}
              </span>
            </div>
            {hasSubscription && (
              <div className="text-[10px] text-muted-foreground space-y-0.5">
                <div className="flex justify-between">
                  <span>Subscription</span>
                  <span>{subscriptionCredits}</span>
                </div>
                <div className="flex justify-between">
                  <span>Top-up</span>
                  <span>{topupCredits}</span>
                </div>
              </div>
            )}

            {isLowCredits && totalCredits > 0 && (
              <p className="text-[10px] text-destructive">⚠️ Low credits!</p>
            )}

            <Button
              variant="pill"
              size="sm"
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-sm"
              onClick={() => navigate('/pricing')}
            >
              <CreditCard className="h-3 w-3 mr-1.5" />
              {hasSubscription ? 'Buy Credits' : 'Get Credits'}
            </Button>
          </div>
        )}

        {/* User */}
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8">
            <AvatarImage src={profile?.avatar_url ?? undefined} />
            <AvatarFallback className="bg-primary/20 text-primary text-xs">
              {(profile?.username?.[0] ?? "U").toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!collapsed && (
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-foreground truncate">{profile?.username ?? "User"}</p>
              <p className="text-xs text-muted-foreground capitalize">
                {plan === 'none' ? 'Pay-as-you-go' : `${plan} plan`}
              </p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
