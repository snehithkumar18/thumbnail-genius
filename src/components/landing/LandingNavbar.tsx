import { useState, useEffect } from "react";
import { motion } from "framer-motion";

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
    setMobileOpen(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  const navLinks = ["features", "pricing", "examples", "blog"];

  return (
    <motion.nav
      initial={{ y: -100 }}
      animate={visible ? { y: 0 } : { y: -100 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-[100] transition-all duration-300 ${
        scrolled
          ? "bg-background/80 backdrop-blur-xl border-b border-border"
          : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
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
              className="relative text-sm text-muted-foreground hover:text-foreground transition-colors capitalize group py-1"
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
            className="text-sm text-muted-foreground hover:text-foreground border border-transparent hover:border-border rounded-full px-5 py-2 transition-all duration-300"
          >
            Login
          </button>
          <motion.button
            onClick={() => onOpenAuth("signup")}
            animate={shakeButton ? { x: [0, -3, 3, -3, 3, 0] } : {}}
            transition={{ duration: 0.4 }}
            className="text-sm font-bold text-primary-foreground bg-gradient-to-r from-primary to-[hsl(22,100%,52%)] rounded-full px-6 py-2.5 hover:shadow-[0_0_30px_hsl(16_100%_50%/0.4)] transition-all duration-300 hover:-translate-y-0.5"
          >
            Try for $2
          </motion.button>
        </div>

        {/* Mobile hamburger */}
        <button
          className="md:hidden flex flex-col gap-1.5 p-2"
          onClick={() => setMobileOpen(!mobileOpen)}
        >
          <motion.span
            animate={mobileOpen ? { rotate: 45, y: 6 } : { rotate: 0, y: 0 }}
            className="w-5 h-0.5 bg-foreground block"
          />
          <motion.span
            animate={mobileOpen ? { opacity: 0 } : { opacity: 1 }}
            className="w-5 h-0.5 bg-foreground block"
          />
          <motion.span
            animate={mobileOpen ? { rotate: -45, y: -6 } : { rotate: 0, y: 0 }}
            className="w-5 h-0.5 bg-foreground block"
          />
        </button>
      </div>

      {/* Mobile menu */}
      <motion.div
        initial={false}
        animate={mobileOpen ? { height: "auto", opacity: 1 } : { height: 0, opacity: 0 }}
        className="md:hidden overflow-hidden bg-background/95 backdrop-blur-xl border-b border-border"
      >
        <div className="px-4 py-4 space-y-3">
          {navLinks.map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item)}
              className="block w-full text-left text-foreground capitalize py-2"
            >
              {item}
            </button>
          ))}
          <div className="pt-3 space-y-2">
            <button
              onClick={() => { setMobileOpen(false); onOpenAuth("login"); }}
              className="w-full text-center border border-border rounded-full py-2.5 text-foreground"
            >
              Login
            </button>
            <button
              onClick={() => { setMobileOpen(false); onOpenAuth("signup"); }}
              className="w-full text-center bg-primary text-primary-foreground rounded-full py-2.5 font-bold"
            >
              Try for $2
            </button>
          </div>
        </div>
      </motion.div>
    </motion.nav>
  );
};

export default LandingNavbar;
