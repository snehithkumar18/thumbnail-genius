import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Menu, X, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface LandingNavbarProps {
  onOpenAuth: (tab?: "login" | "signup") => void;
  visible?: boolean;
}

const NAV_LINKS = [
  { label: "Features", id: "features" },
  { label: "Smart Editor", id: "features" },
  { label: "Pricing", id: "pricing" },
  { label: "Reviews", id: "testimonials" },
  { label: "FAQ", id: "faq" },
];

export const LandingNavbar: React.FC<LandingNavbarProps> = ({ onOpenAuth, visible = true }) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    setMobileMenuOpen(false);
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-[#070310]/85 backdrop-blur-xl border-b border-border/60 shadow-lg shadow-black/20 py-3"
          : "bg-transparent py-5"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between px-4 sm:px-6 max-w-6xl">
        {/* Brand Logo */}
        <div
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          className="flex items-center gap-2 cursor-pointer group"
        >
          <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-primary to-[#00E5FF] flex items-center justify-center text-white font-bold shadow-[0_0_15px_rgba(139,71,255,0.4)] group-hover:scale-105 transition-transform">
            <Sparkles className="h-5 w-5" />
          </div>
          <span className="text-xl font-bold tracking-tight text-foreground font-heading">
            Thumb<span className="text-primary">ly</span>
          </span>
          <span className="hidden sm:inline-block text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 ml-1">
            AI 2.0
          </span>
        </div>

        {/* Desktop Nav Links */}
        <nav className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.id)}
              className="text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors tracking-wide"
            >
              {link.label}
            </button>
          ))}
        </nav>

        {/* CTA Buttons */}
        <div className="hidden md:flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenAuth("login")}
            className="text-xs font-semibold text-muted-foreground hover:text-foreground h-9 px-4 rounded-full"
          >
            Log In
          </Button>

          <Button
            size="sm"
            variant="hero"
            onClick={() => onOpenAuth("signup")}
            className="rounded-full h-9 px-5 text-xs font-bold shadow-[0_0_20px_rgba(139,71,255,0.35)] hover:shadow-[0_0_30px_rgba(139,71,255,0.55)] gap-1.5"
          >
            <span>Start Free</span>
            <ArrowRight className="h-3 w-3" />
          </Button>
        </div>

        {/* Mobile Hamburger Toggle */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-muted-foreground hover:text-foreground"
            aria-label="Toggle Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-[#0F081D]/95 backdrop-blur-2xl border-b border-border/80 px-4 py-5 space-y-3">
          {NAV_LINKS.map((link) => (
            <button
              key={link.label}
              onClick={() => scrollTo(link.id)}
              className="block w-full text-left text-sm font-semibold text-foreground/80 hover:text-primary py-2"
            >
              {link.label}
            </button>
          ))}
          <div className="pt-3 border-t border-border/40 flex flex-col gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth("login");
              }}
              className="w-full rounded-full"
            >
              Log In
            </Button>
            <Button
              variant="hero"
              size="sm"
              onClick={() => {
                setMobileMenuOpen(false);
                onOpenAuth("signup");
              }}
              className="w-full rounded-full font-bold"
            >
              Start Free — No Card Needed
            </Button>
          </div>
        </div>
      )}
    </header>
  );
};

export default LandingNavbar;
