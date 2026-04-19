import { useState, useCallback, useEffect, lazy, Suspense } from "react";
import IntroSequence from "@/components/landing/IntroSequence";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import SocialProofTicker from "@/components/landing/SocialProofTicker";
import FeaturesSection from "@/components/landing/FeaturesSection";
import HowItWorks from "@/components/landing/HowItWorks";
import StatsCounter from "@/components/landing/StatsCounter";
import ExampleGallery from "@/components/landing/ExampleGallery";
import ComparisonTable from "@/components/landing/ComparisonTable";
import PricingSection from "@/components/landing/PricingSection";
import TestimonialsSection from "@/components/landing/TestimonialsSection";
import FAQSection from "@/components/landing/FAQSection";
import FinalCTA from "@/components/landing/FinalCTA";
import LandingFooter from "@/components/landing/LandingFooter";
import ScrollProgress from "@/components/landing/ScrollProgress";
import BackToTop from "@/components/landing/BackToTop";
import AuthModal from "@/components/AuthModal";
import SEOHead from "@/components/SEOHead";

const Index = () => {
  const [introComplete, setIntroComplete] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");

  const handleIntroComplete = useCallback(() => {
    setIntroComplete(true);
  }, []);

  const openAuth = useCallback((tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  // Skip intro in dev for faster iteration (optional)
  // useEffect(() => { setIntroComplete(true); }, []);

  return (
    <div className="min-h-screen-d bg-background overflow-x-hidden">
      <SEOHead
        title="ThumbAI — AI YouTube Thumbnail Generator | Free"
        description="Generate viral YouTube thumbnails in seconds with AI. Hindi, English & 8 languages. Free plan available. Trusted by 12,000+ creators."
        url="https://thumbai.app"
      />

      {/* Intro sequence */}
      {!introComplete && <IntroSequence onComplete={handleIntroComplete} />}

      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Main content */}
      <LandingNavbar onOpenAuth={openAuth} visible={introComplete} />
      <HeroSection onOpenAuth={() => openAuth("signup")} visible={introComplete} />
      <SocialProofTicker />
      <FeaturesSection />
      <HowItWorks />
      <StatsCounter />
      <ExampleGallery />
      <ComparisonTable />
      <PricingSection onOpenAuth={() => openAuth("signup")} />
      <TestimonialsSection />
      <FAQSection />
      <FinalCTA onOpenAuth={() => openAuth("signup")} />
      <LandingFooter />

      {/* Back to top */}
      <BackToTop />

      {/* Auth modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
};

export default Index;
