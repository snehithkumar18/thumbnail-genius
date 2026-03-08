import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider } from "@/contexts/AuthContext";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import DashboardLayout from "./components/DashboardLayout";
import GeneratePage from "./pages/GeneratePage";
import ShortsPage from "./pages/ShortsPage";
import RecreatePage from "./pages/RecreatePage";
import EditorPage from "./pages/EditorPage";
import FaceSwapPage from "./pages/FaceSwapPage";
import BrandKitPage from "./pages/BrandKitPage";
import MyThumbnails from "./pages/MyThumbnails";
import PlaceholderPage from "./pages/PlaceholderPage";
import TitleGeneratorPage from "./pages/TitleGeneratorPage";
import ThumbnailScorerPage from "./pages/ThumbnailScorerPage";
import TrendingStylesPage from "./pages/TrendingStylesPage";
import ABTesterPage from "./pages/ABTesterPage";
import VotePage from "./pages/VotePage";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/vote/:shareId" element={<VotePage />} />
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<GeneratePage />} />
              <Route path="shorts" element={<ShortsPage />} />
              <Route path="recreate" element={<RecreatePage />} />
              <Route path="editor" element={<EditorPage />} />
              <Route path="faceswap" element={<FaceSwapPage />} />
              <Route path="titles" element={<TitleGeneratorPage />} />
              <Route path="scorer" element={<ThumbnailScorerPage />} />
              <Route path="trending" element={<TrendingStylesPage />} />
              <Route path="thumbnails" element={<MyThumbnails />} />
              <Route path="brandkit" element={<BrandKitPage />} />
              <Route path="abtester" element={<ABTesterPage />} />
              <Route path="settings" element={<PlaceholderPage title="Settings" emoji="⚙️" />} />
            </Route>
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
