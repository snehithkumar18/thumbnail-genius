import { useState, useEffect, useCallback } from "react";
import { Outlet } from "react-router-dom";
import { SidebarProvider } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import { DashboardTopBar } from "@/components/DashboardTopBar";
import OnboardingModal from "@/components/OnboardingModal";
import ErrorBoundary from "@/components/ErrorBoundary";
import KeyboardShortcutsModal from "@/components/KeyboardShortcutsModal";
import { useProfile } from "@/hooks/useSupabaseData";
import { useAuth } from "@/contexts/AuthContext";

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
      <div className="min-h-screen flex w-full bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <DashboardTopBar />
          <main className="flex-1 overflow-auto p-6">
            <ErrorBoundary>
              <Outlet />
            </ErrorBoundary>
          </main>
        </div>
      </div>
      {showOnboarding && <OnboardingModal onComplete={() => setShowOnboarding(false)} />}
      <KeyboardShortcutsModal open={showShortcuts} onClose={() => setShowShortcuts(false)} />
    </SidebarProvider>
  );
};

export default DashboardLayout;
