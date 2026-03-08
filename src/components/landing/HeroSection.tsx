import { useEffect, useRef, useState, useCallback, lazy, Suspense } from "react";
import { motion, Variants } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { Star, ChevronDown } from "lucide-react";

const ParticleBackground = lazy(() => import("./ParticleBackground"));
const ThreeDCards = lazy(() => import("./ThreeDCards"));

interface HeroSectionProps {
  onOpenAuth: () => void;
  visible: boolean;
}

const styles = ["REALISTIC", "CINEMATIC", "BOLD", "DARK"];

const HeroSection = ({ onOpenAuth, visible }: HeroSectionProps) => {
  const [activeStyle, setActiveStyle] = useState(0);
  const [scrollOpacity, setScrollOpacity] = useState(1);
  const heroRef = useRef<HTMLDivElement>(null);
  const magnetRef = useRef<HTMLButtonElement>(null);

  // Parallax grid
  const [gridOffset, setGridOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleScroll = () => {
      const sy = window.scrollY;
      setScrollOpacity(Math.max(0, 1 - sy / 300));
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (window.innerWidth < 768) return;
    const handleMouse = (e: MouseEvent) => {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      setGridOffset({
        x: ((e.clientX - cx) / cx) * 5,
        y: ((e.clientY - cy) / cy) * 5,
      });
    };
    window.addEventListener("mousemove", handleMouse);
    return () => window.removeEventListener("mousemove", handleMouse);
  }, []);

  // Magnetic button
  const handleMagnet = useCallback((e: React.MouseEvent) => {
    if (!magnetRef.current || window.innerWidth < 768) return;
    const rect = magnetRef.current.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = e.clientX - cx;
    const dy = e.clientY - cy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < 80) {
      magnetRef.current.style.transform = `translate(${dx * 0.2}px, ${dy * 0.2}px) translateY(-3px)`;
    } else {
      magnetRef.current.style.transform = "";
    }
  }, []);

  const handleMagnetLeave = useCallback(() => {
    if (magnetRef.current) magnetRef.current.style.transform = "";
  }, []);

  // Cycle styles
  useEffect(() => {
    const t = setInterval(() => setActiveStyle((s) => (s + 1) % styles.length), 3000);
    return () => clearInterval(t);
  }, []);

  const wordVariants: Variants = {
    hidden: { opacity: 0, y: 40 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const containerVariants: Variants = {
    hidden: {},
    visible: {
      transition: { staggerChildren: 0.12 },
    },
  };

  return (
    <section
      ref={heroRef}
      className="relative min-h-screen flex items-center justify-center pt-16 overflow-hidden"
    >
      {/* Dot grid parallax */}
      <div
        className="absolute inset-0 dot-grid-bg"
        style={{ transform: `translate(${gridOffset.x}px, ${gridOffset.y}px)` }}
      />

      {/* Radial gradient */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(16_100%_50%/0.08),transparent_70%)]" />

      {/* Particles */}
      <Suspense fallback={null}>
        <ParticleBackground />
      </Suspense>

      <div className="container mx-auto px-4 py-20 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center max-w-7xl mx-auto">
          {/* LEFT COLUMN */}
          <div className="text-center lg:text-left">
            {/* Floating badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.4, duration: 0.5 }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 mb-8 animate-float-gentle"
            >
              <span className="w-2 h-2 rounded-full bg-primary blink-dot" />
              <span className="text-xs text-muted-foreground font-medium">
                🔥 47 thumbnails generated in last hour
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              className="mb-6"
              variants={containerVariants}
              initial="hidden"
              animate={visible ? "visible" : "hidden"}
            >
              {["GENERATE", "VIRAL", "THUMBNAILS", "IN SECONDS"].map(
                (word, i) => (
                  <motion.div key={word} variants={wordVariants}>
                    {word === "VIRAL" ? (
                      <span className="relative inline-block text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-none gradient-text shimmer-text">
                        {word}
                      </span>
                    ) : word === "IN SECONDS" ? (
                      <span className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-display font-bold leading-none text-foreground">
                        {word}
                      </span>
                    ) : (
                      <span className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl font-display font-bold leading-none text-foreground">
                        {word}
                      </span>
                    )}
                  </motion.div>
                )
              )}
            </motion.div>

            {/* Subheadline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.0, duration: 0.6 }}
              className="mb-6"
            >
              <p className="text-lg md:text-xl text-muted-foreground leading-relaxed">
                AI thumbnails that get clicks.
                <br />
                No design skills. No Photoshop. No guessing.
              </p>
            </motion.div>

            {/* Typewriter prompt preview */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.2, duration: 0.5 }}
              className="glass-card rounded-xl p-4 mb-6 max-w-lg mx-auto lg:mx-0"
            >
              <span className="text-xs text-muted-foreground mb-2 block">✨ Try it</span>
              <div className="text-sm text-foreground min-h-[40px] font-mono">
                <TypeAnimation
                  sequence={[
                    "Shocked man holding ₹1 lakh cash, bold text 'I MADE THIS'",
                    2000,
                    "",
                    200,
                    "Gamer with explosion behind them, neon purple lighting",
                    2000,
                    "",
                    200,
                    "Fitness influencer, dramatic gym background, motivational",
                    2000,
                    "",
                    200,
                    "Tech guy pointing at holographic AI screen, blue glow",
                    2000,
                    "",
                    200,
                  ]}
                  speed={60}
                  repeat={Infinity}
                  cursor={true}
                />
              </div>
              <div className="flex gap-2 mt-3">
                {styles.map((s, i) => (
                  <span
                    key={s}
                    className={`text-[10px] px-2 py-0.5 rounded-full border font-mono transition-all duration-300 ${
                      i === activeStyle
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-border text-muted-foreground"
                    }`}
                  >
                    {s}
                  </span>
                ))}
              </div>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{
                delay: 1.3,
                type: "spring",
                stiffness: 400,
                damping: 25,
              }}
              className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 mb-6"
              onMouseMove={handleMagnet}
              onMouseLeave={handleMagnetLeave}
            >
              <button
                ref={magnetRef}
                onClick={onOpenAuth}
                className="group relative bg-gradient-to-r from-primary to-[hsl(22,100%,52%)] text-primary-foreground font-bold px-8 py-4 rounded-full text-base hover:shadow-[0_20px_40px_hsl(16_100%_50%/0.4)] transition-all duration-300 active:scale-[0.97] animate-breathing-glow"
              >
                Try for $2 — 30 Credits
                <span className="inline-block ml-2 transition-transform group-hover:translate-x-1">
                  →
                </span>
              </button>
              <button
                onClick={() =>
                  document
                    .getElementById("examples")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
                className="border border-muted-foreground/30 text-foreground hover:border-primary hover:text-primary rounded-full px-8 py-4 text-base font-medium transition-all duration-300"
              >
                See Examples ↓
              </button>
            </motion.div>

            {/* Trust row */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={visible ? { opacity: 1, y: 0 } : {}}
              transition={{ delay: 1.5, duration: 0.5 }}
              className="flex items-center justify-center lg:justify-start gap-4 flex-wrap"
            >
              <div className="flex -space-x-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full border-2 border-background bg-gradient-to-br from-primary/40 to-gold/40"
                    style={{ zIndex: 5 - i }}
                  />
                ))}
              </div>
              <span className="text-sm text-muted-foreground">
                <span className="text-foreground font-semibold">12,000+</span>{" "}
                creators
              </span>
              <span className="text-border">|</span>
              <div className="flex items-center gap-0.5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Star
                    key={i}
                    className="h-3.5 w-3.5 fill-secondary text-secondary"
                  />
                ))}
                <span className="text-sm text-foreground font-semibold ml-1">
                  4.9/5
                </span>
              </div>
            </motion.div>
          </div>

          {/* RIGHT COLUMN — 3D Cards */}
          <motion.div
            initial={{ opacity: 0, x: 60 }}
            animate={visible ? { opacity: 1, x: 0 } : {}}
            transition={{ delay: 1.4, duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="hidden lg:block relative"
          >
            <Suspense
              fallback={
                <div className="w-full aspect-[4/3] rounded-2xl bg-card animate-pulse" />
              }
            >
              <ThreeDCards />
            </Suspense>

            {/* Floating labels */}
            <motion.div
              className="absolute -top-4 right-8 glass-card rounded-full px-3 py-1.5 text-xs font-medium text-foreground animate-float-gentle"
              style={{ animationDelay: "0s" }}
            >
              FLUX.2 Pro ✨
            </motion.div>
            <motion.div
              className="absolute bottom-8 -left-4 glass-card rounded-full px-3 py-1.5 text-xs font-medium text-foreground animate-float-gentle"
              style={{ animationDelay: "0.5s" }}
            >
              Ideogram 3.0 📝
            </motion.div>
          </motion.div>
        </div>

        {/* Scroll indicator */}
        <motion.div
          className="absolute bottom-8 left-1/2 -translate-x-1/2 text-center"
          style={{ opacity: scrollOpacity }}
        >
          <p className="text-xs text-muted-foreground/50 mb-2">Scroll to explore</p>
          <ChevronDown className="h-5 w-5 text-muted-foreground/50 mx-auto animate-bounce-down" />
        </motion.div>
      </div>
    </section>
  );
};

export default HeroSection;
