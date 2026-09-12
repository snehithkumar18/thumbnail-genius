import { useState, useCallback } from "react";
import LandingNavbar from "@/components/landing/LandingNavbar";
import HeroSection from "@/components/landing/HeroSection";
import PackagingProblemSection from "@/components/landing/PackagingProblemSection";
import FeaturesSection from "@/components/landing/FeaturesSection";
import StatsCounter from "@/components/landing/StatsCounter";
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
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");

  const openAuth = useCallback((tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  }, []);

  return (
    <div className="min-h-screen bg-[#070310] text-foreground overflow-x-hidden selection:bg-[#8B47FF] selection:text-white">
      <SEOHead
        title="Thumbly — AI YouTube Packaging & Thumbnail Generator"
        description="Stop losing 70% of potential viewers. Turn raw video scripts and reference styles into viral, high-CTR YouTube thumbnails with consistent creator face personas."
        url="https://thumbly.app"
      />

      {/* Scroll progress bar */}
      <ScrollProgress />

      {/* Modern Fixed Navbar */}
      <LandingNavbar onOpenAuth={openAuth} visible={true} />

      {/* 1. Hero with dual-row infinite viral thumbnail marquee */}
      <HeroSection onOpenAuth={() => openAuth("signup")} visible={true} />

      {/* 2. The Packaging Problem (Amateur 2.4% vs Thumbly 11.8% CTR) */}
      <PackagingProblemSection onOpenAuth={() => openAuth("signup")} />

      {/* 3. 5 Core Capabilities showcase (Script-to-Thumbnail, Face Vault, Recreate, Score™, Titles) */}
      <FeaturesSection />

      {/* 4. Algorithm CTR & Impresssion Stats */}
      <StatsCounter />

      {/* 5. Uncompromising Head-to-Head Comparison */}
      <ComparisonTable />

      {/* 6. Transparent Creator Pricing */}
      <PricingSection onOpenAuth={() => openAuth("signup")} />

      {/* 7. Verified Creator Testimonials & Marquee */}
      <TestimonialsSection />

      {/* 8. Frequently Asked Questions */}
      <FAQSection />

      {/* 9. Final High-Impact CTA */}
      <FinalCTA onOpenAuth={() => openAuth("signup")} />

      {/* 10. Clean Obsidian Footer */}
      <LandingFooter />

      {/* Back to top button */}
      <BackToTop />

      {/* Authentication Modal */}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
};

export default Index;
