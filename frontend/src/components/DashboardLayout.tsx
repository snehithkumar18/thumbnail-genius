import { useState, useEffect, Suspense } from "react";
import { Outlet } from "react-router-dom";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import { DashboardSubNav } from "@/components/DashboardSubNav";
import OnboardingModal from "@/components/OnboardingModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { useProfile } from "@/hooks/useSupabaseData";
import { Skeleton } from "@/components/ui/skeleton";

const DashboardLayout = () => {
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
    <div className="min-h-screen-d flex flex-col w-full bg-background overflow-x-hidden">
      <DashboardTopBar />
      <DashboardSubNav />
      <main className="flex-1 overflow-auto p-3 sm:p-4 lg:p-6 pb-12">
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
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </div>
  );
};

export default DashboardLayout;
