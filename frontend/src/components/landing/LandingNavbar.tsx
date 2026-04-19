import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerHeader } from "@/components/ui/drawer";
import { hapticFeedback } from "@/lib/utils";
import { Menu, X, Zap } from "lucide-react";

interface LandingNavbarProps {
  onOpenAuth: (tab?: "login" | "signup") => void;
  visible: boolean;
}

const LandingNavbar = ({ onOpenAuth, visible }: LandingNavbarProps) => {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [shakeButton, setShakeButton] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 80);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (visible) {
      const t = setTimeout(() => {
        setShakeButton(true);
        setTimeout(() => setShakeButton(false), 600);
      }, 3000);
      return () => clearTimeout(t);
    }
  }, [visible]);

  const scrollTo = (id: string) => {
    hapticFeedback("light");
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = ["features", "pricing", "examples", "blog"];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={visible ? { y: 0 } : { y: -100 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 safe-top ${
        scrolled
          ? "backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
      style={scrolled ? { background: "rgba(255,255,255,0.85)" } : {}}
    >
      <div className="container mx-auto flex items-center justify-between h-14 sm:h-16 px-3 sm:px-4">
        {/* Logo */}
        <div
          className="flex items-center gap-1 cursor-pointer group"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
        >
          <span className="text-2xl font-display font-bold text-foreground tracking-tight">
            THUMB
          </span>
          <span className="text-2xl font-display font-bold text-primary tracking-tight">
            AI
          </span>
          <span className="text-lg ml-0.5 transition-transform duration-400 group-hover:rotate-[360deg] inline-block">
            ⚡
          </span>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item)}
              className="relative text-sm text-muted-foreground hover:text-primary transition-colors capitalize group py-1"
            >
              {item}
              <span className="absolute bottom-0 left-0 w-full h-0.5 bg-primary scale-x-0 group-hover:scale-x-100 transition-transform origin-left duration-300" />
            </button>
          ))}
        </div>

        {/* CTA buttons */}
        <div className="hidden md:flex items-center gap-3">
          <button
            onClick={() => onOpenAuth("login")}
            className="text-sm text-muted-foreground hover:text-primary border border-border hover:border-primary rounded-full px-5 py-2 transition-all duration-300"
          >
            Login
          </button>
          <motion.button
            onClick={() => onOpenAuth("signup")}
            animate={shakeButton ? { x: [0, -3, 3, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-bold text-primary-foreground rounded-full px-6 py-2.5 transition-all duration-300 hover:-translate-y-0.5 glow-purple"
            style={{ background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" }}
          >
            Try for $2
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        {/* Mobile hamburger */}
        <button
          className="md:hidden p-2 text-foreground active:scale-90 transition-transform"
          onClick={() => { hapticFeedback("medium"); setMobileOpen(true); }}
        >
          <Menu className="h-6 w-6" />
        </button>
      </div>

      {/* Mobile menu Drawer */}
      <Drawer open={mobileOpen} onOpenChange={setMobileOpen}>
        <DrawerContent className="focus-visible:outline-none border-t-primary/20 bg-background/95 backdrop-blur-xl">
          <DrawerHeader className="border-b border-border/50 py-4 flex items-center justify-between">
            <div className="flex items-center gap-1">
              <span className="text-xl font-display font-bold text-foreground">THUMB</span>
              <span className="text-xl font-display font-bold text-primary">AI</span>
            </div>
          </DrawerHeader>
          <div className="p-6 space-y-6 pb-12">
            <div className="space-y-1">
              {navLinks.map((item) => (
                <button
                  key={item}
                  onClick={() => scrollTo(item)}
                  className="w-full text-left text-lg font-medium text-foreground py-3 border-b border-border/50 last:border-0 active:text-primary transition-colors flex items-center justify-between group"
                >
                  <span className="capitalize">{item}</span>
                  <Zap className="h-4 w-4 text-primary opacity-0 group-active:opacity-100 transition-opacity" />
                </button>
              ))}
            </div>
            <div className="flex flex-col gap-3 pt-2">
              <button
                onClick={() => { setMobileOpen(false); hapticFeedback("light"); onOpenAuth("login"); }}
                className="w-full h-14 text-center border-2 border-border rounded-2xl py-2.5 text-foreground font-semibold active:bg-muted transition-colors"
              >
                Login to Account
              </button>
              <button
                onClick={() => { setMobileOpen(false); hapticFeedback("heavy"); onOpenAuth("signup"); }}
                className="w-full h-14 text-center text-primary-foreground rounded-2xl py-2.5 font-bold shadow-xl shadow-primary/20 flex items-center justify-center gap-2"
                style={{ background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" }}
              >
                Get Started for $2 <Zap className="h-4 w-4 fill-current" />
              </button>
            </div>
          </div>
        </DrawerContent>
      </Drawer>
    </motion.nav>
);
};

export default LandingNavbar;
