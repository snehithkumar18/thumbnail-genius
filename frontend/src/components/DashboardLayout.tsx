import { useState, useEffect, useCallback, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { BottomNav } from "@/components/BottomNav";
import OnboardingModal from "@/components/OnboardingModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { useProfile } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardLayout = () => {
  const { user } = useAuth();
  const { data: profile, isLoading } = useProfile();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showShortcuts, setShowShortcuts] = useState(false);

  useEffect(() => {
    if (!isLoading && profile && !profile.onboarding_complete) {
      setShowOnboarding(true);
    }
  }, [profile, isLoading]);

  // Global keyboard shortcut for "?"
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "?" && !e.metaKey && !e.ctrlKey && !(e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement)) {
        e.preventDefault();
        setShowShortcuts(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  return (
    <SidebarProvider>
      <div className="min-h-screen-d flex w-full bg-background overflow-hidden">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0 transition-all duration-300">
          <DashboardTopBar />
          <main className="flex-1 overflow-auto p-4 md:p-6 pb-[calc(56px+env(safe-area-inset-bottom)+1rem)] tab:pb-6">
            <ErrorBoundary>
              <Suspense fallback={
                <div className="space-y-6">
                  <Skeleton className="h-[200px] w-full rounded-2xl" />
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <Skeleton className="h-[120px] rounded-xl" />
                    <Skeleton className="h-[120px] rounded-xl" />
                  </div>
                  <Skeleton className="h-[300px] w-full rounded-2xl" />
                </div>
              }>
                <Outlet />
              </Suspense>
            </ErrorBoundary>
          </main>
        </div>
        <BottomNav />
      </div>
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
