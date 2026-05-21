import { lazy, Suspense } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { HelmetProvider } from "react-helmet-async";
import { AuthProvider } from "@/contexts/AuthContext";
import PageLoader from "./components/PageLoader";

// Lazy-loaded pages
const Index = lazy(() => import("./pages/Index"));
const NotFound = lazy(() => import("./pages/NotFound"));
const DashboardLayout = lazy(() => import("./components/DashboardLayout"));
const GeneratePage = lazy(() => import("./pages/GeneratePage"));
const ShortsPage = lazy(() => import("./pages/ShortsPage"));
const RecreatePage = lazy(() => import("./pages/RecreatePage"));
const FaceSwapPage = lazy(() => import("./pages/FaceSwapPage"));
const BrandKitPage = lazy(() => import("./pages/BrandKitPage"));
const BackgroundRemovalPage = lazy(() => import("./pages/BackgroundRemovalPage"));
const MyThumbnails = lazy(() => import("./pages/MyThumbnails"));
const TitleGeneratorPage = lazy(() => import("./pages/TitleGeneratorPage"));
const ThumbnailScorerPage = lazy(() => import("./pages/ThumbnailScorerPage"));
const TrendingStylesPage = lazy(() => import("./pages/TrendingStylesPage"));
const ABTesterPage = lazy(() => import("./pages/ABTesterPage"));
const VotePage = lazy(() => import("./pages/VotePage"));
const PricingPage = lazy(() => import("./pages/PricingPage"));
const SettingsPage = lazy(() => import("./pages/SettingsPage"));
const PromptLibraryPage = lazy(() => import("./pages/PromptLibraryPage"));
const ReferralPage = lazy(() => import("./pages/ReferralPage"));
const GalleryPage = lazy(() => import("./pages/GalleryPage"));
const SharedThumbnailPage = lazy(() => import("./pages/SharedThumbnailPage"));
const SmartEditorPage = lazy(() => import("./pages/SmartEditorPage"));
const WaitlistPage = lazy(() => import("./pages/WaitlistPage"));

const queryClient = new QueryClient();

const App = () => (
  <HelmetProvider>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <Suspense fallback={<PageLoader />}>
              <Routes>
                <Route path="/" element={<Index />} />
                <Route path="/waitlist" element={<WaitlistPage />} />
                <Route path="/pricing" element={<PricingPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/t/:shareId" element={<SharedThumbnailPage />} />
                <Route path="/vote/:shareId" element={<VotePage />} />
                <Route path="/dashboard" element={<DashboardLayout />}>
                  <Route index element={<SmartEditorPage />} />
                  <Route path="generate" element={<GeneratePage />} />
                  <Route path="shorts" element={<ShortsPage />} />
                  <Route path="recreate" element={<RecreatePage />} />
                  <Route path="smart-editor" element={<SmartEditorPage />} />
                  <Route path="faceswap" element={<FaceSwapPage />} />
                  <Route path="background-removal" element={<BackgroundRemovalPage />} />
                  <Route path="titles" element={<TitleGeneratorPage />} />
                  <Route path="scorer" element={<ThumbnailScorerPage />} />
                  <Route path="trending" element={<TrendingStylesPage />} />
                  <Route path="thumbnails" element={<MyThumbnails />} />
                  <Route path="brandkit" element={<BrandKitPage />} />
                  <Route path="abtester" element={<ABTesterPage />} />
                  <Route path="settings" element={<SettingsPage />} />
                  <Route path="prompts" element={<PromptLibraryPage />} />
                  <Route path="referrals" element={<ReferralPage />} />
                </Route>
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </BrowserRouter>
        </TooltipProvider>
      </AuthProvider>
    </QueryClientProvider>
  </HelmetProvider>
);

export default App;
