import { useState } from "react";
import Navbar from "@/components/Navbar";
import HeroSection from "@/components/HeroSection";
import SocialProof from "@/components/SocialProof";
import FeaturesSection from "@/components/FeaturesSection";
import HowItWorks from "@/components/HowItWorks";
import ExampleGallery from "@/components/ExampleGallery";
import PricingSection from "@/components/PricingSection";
import FAQSection from "@/components/FAQSection";
import Footer from "@/components/Footer";
import AuthModal from "@/components/AuthModal";

const Index = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [authTab, setAuthTab] = useState<"login" | "signup">("signup");

  const openAuth = (tab: "login" | "signup" = "signup") => {
    setAuthTab(tab);
    setAuthOpen(true);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar onOpenAuth={openAuth} />
      <HeroSection onOpenAuth={() => openAuth("signup")} />
      <SocialProof />
      <FeaturesSection />
      <HowItWorks />
      <ExampleGallery />
      <PricingSection onOpenAuth={() => openAuth("signup")} />
      <FAQSection />
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab={authTab} />
    </div>
  );
};

export default Index;
