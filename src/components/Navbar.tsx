import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Zap } from "lucide-react";
import { motion } from "framer-motion";

interface NavbarProps {
  onOpenAuth: (tab?: "login" | "signup") => void;
}

const Navbar = ({ onOpenAuth }: NavbarProps) => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <motion.nav
      initial={{ y: -80 }}
      animate={{ y: 0 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled ? "bg-background/80 backdrop-blur-xl border-b border-border" : "bg-transparent"
      }`}
    >
      <div className="container mx-auto flex items-center justify-between h-16 px-4">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          <Zap className="h-6 w-6 text-primary fill-primary" />
          <span className="text-xl font-heading font-bold text-foreground">ThumbAI</span>
        </div>

        <div className="hidden md:flex items-center gap-8">
          {["features", "pricing", "examples"].map((item) => (
            <button
              key={item}
              onClick={() => scrollTo(item)}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors capitalize"
            >
              {item}
            </button>
          ))}
          <button className="text-sm text-muted-foreground hover:text-foreground transition-colors">Blog</button>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghostNav" size="sm" onClick={() => onOpenAuth("login")}>
            Login
          </Button>
          <Button variant="pill" size="sm" onClick={() => onOpenAuth("signup")}>
            Start Free
          </Button>
        </div>
      </div>
    </motion.nav>
  );
};

export default Navbar;
