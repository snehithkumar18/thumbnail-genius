import { motion } from "framer-motion";
import { Sparkles, Zap, History, Library, LayoutGrid } from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const NAV_ITEMS = [
  { label: "Generate", icon: Sparkles, path: "/dashboard", color: "#8B47FF" },
  { label: "Shorts", icon: Zap, path: "/dashboard/shorts", color: "#6366F1" },
  { label: "Recreate", icon: History, path: "/dashboard/recreate", color: "#8B47FF" },
  { label: "Gallery", icon: Library, path: "/dashboard/my-thumbnails", color: "#6366F1" },
  { label: "More", icon: LayoutGrid, path: "#", color: "#8B47FF" },
];

export function BottomNav() {
  const location = useLocation();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#E8E2FF] h-[calc(56px+env(safe-area-inset-bottom))] px-2 z-50 tab:hidden safe-bottom">
      <div className="flex items-center justify-around h-14 max-w-md mx-auto">
        {NAV_ITEMS.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.label}
              to={item.path}
              className={`flex flex-col items-center justify-center flex-1 h-full min-w-0 transition-colors ${
                isActive ? "text-[#8B47FF]" : "text-muted-foreground"
              }`}
            >
              <item.icon className={`h-5 w-5 mb-0.5 ${isActive ? "text-[#8B47FF]" : "text-muted-foreground"}`} />
              <span className="text-[10px] font-medium truncate w-full text-center">{item.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-dot"
                  className="w-1 h-1 bg-[#8B47FF] rounded-full mt-0.5"
                />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
