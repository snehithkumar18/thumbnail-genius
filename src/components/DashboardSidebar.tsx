import { Zap, Smartphone, RefreshCw, Pencil, User, Type, BarChart3, TrendingUp, FolderOpen, Palette, FlaskConical, Settings, Gem } from "lucide-react";
import { NavLink } from "@/components/NavLink";
import { useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useProfile, useCredits } from "@/hooks/useSupabaseData";
import { PLAN_LIMITS } from "@/lib/credits";
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
  { title: "My Thumbnails", url: "/dashboard/thumbnails", icon: FolderOpen },
  { title: "Brand Kit", url: "/dashboard/brandkit", icon: Palette },
  { title: "A/B Tester", url: "/dashboard/abtester", icon: FlaskConical },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function DashboardSidebar() {
  const { state } = useSidebar();
  const collapsed = state === "collapsed";
  const location = useLocation();
  const { data: profile } = useProfile();
  const { data: credits } = useCredits();

  const planType = (credits?.plan_type ?? "free") as keyof typeof PLAN_LIMITS;
  const maxCredits = PLAN_LIMITS[planType]?.credits ?? 20;
  const remaining = credits?.credits_remaining ?? 0;
  const usedPercent = Math.min(100, ((maxCredits - remaining) / maxCredits) * 100);

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
              <span className="text-foreground font-medium">{remaining}/{maxCredits}</span>
            </div>
            <Progress value={100 - usedPercent} className="h-1.5" />
            <Button
              variant="pill"
              size="sm"
              className="w-full bg-gradient-to-r from-primary to-primary/80 text-sm"
              onClick={() => {}}
            >
              Upgrade Plan
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
              <p className="text-xs text-muted-foreground capitalize">{planType} plan</p>
            </div>
          )}
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
