import { useEffect, useRef } from "react";
import { motion } from "framer-motion";
import { useInView } from "react-intersection-observer";
import confetti from "canvas-confetti";

interface FinalCTAProps {
  onOpenAuth: () => void;
}

const FinalCTA = ({ onOpenAuth }: FinalCTAProps) => {
  const { ref, inView } = useInView({ triggerOnce: true, threshold: 0.3 });
  const hasFired = useRef(false);

  useEffect(() => {
    if (inView && !hasFired.current) {
      hasFired.current = true;
      confetti({
        particleCount: 50,
        spread: 80,
        origin: { x: 0.5, y: 0.6 },
        colors: ["#8B47FF", "#C4A8FF", "#6366F1", "#F59E0B", "#EDE9FE"],
        startVelocity: 25,
        gravity: 1,
        ticks: 50,
      });
    }
  }, [inView]);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    const btn = e.currentTarget;
    const rect = btn.getBoundingClientRect();
    const ripple = document.createElement("span");
    const size = Math.max(rect.width, rect.height);
    ripple.style.width = ripple.style.height = `${size}px`;
    ripple.style.left = `${e.clientX - rect.left - size / 2}px`;
    ripple.style.top = `${e.clientY - rect.top - size / 2}px`;
    ripple.style.position = "absolute";
    ripple.style.borderRadius = "50%";
    ripple.style.background = "rgba(255,255,255,0.3)";
    ripple.style.transform = "scale(0)";
    ripple.style.animation = "ripple 0.6s ease-out";
    btn.style.position = "relative";
    btn.style.overflow = "hidden";
    btn.appendChild(ripple);
    setTimeout(() => ripple.remove(), 600);
    onOpenAuth();
  };

  return (
    <section
      ref={ref}
      className="min-h-[80vh] flex items-center justify-center relative overflow-hidden"
      style={{ background: "#F8F7FF" }}
    >
      {/* Glowing orb */}
      <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_center,rgba(139,71,255,0.10),rgba(99,102,241,0.05)_50%,transparent)]" />

      <div className="container mx-auto px-4 relative z-10 text-center">
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.8 }}
        >
          <h2 className="text-6xl md:text-8xl lg:text-[120px] font-display font-bold text-foreground leading-none mb-2">
            READY TO GO
          </h2>
          <h2 className="text-6xl md:text-8xl lg:text-[120px] font-display font-bold gradient-text leading-none mb-8">
            VIRAL?
          </h2>

          <p className="text-lg text-muted-foreground mb-10">
            Join 12,000+ creators. Start for $2.
          </p>

          <motion.button
            onClick={handleClick}
            whileHover={{ y: -3, scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            className="relative text-primary-foreground font-bold px-12 py-5 rounded-full text-xl transition-shadow duration-300 glow-purple hover:shadow-[0_20px_60px_rgba(139,71,255,0.4)]"
            style={{ background: "linear-gradient(135deg, #8B47FF, #6366F1, #4F46E5)" }}
          >
            Try Thumbly for $2 →
          </motion.button>

          <p className="text-sm text-muted-foreground mt-6">
            No subscription needed • Credits never expire • Cancel anytime
          </p>
        </motion.div>
      </div>

      <style>{`
        @keyframes ripple {
          to { transform: scale(4); opacity: 0; }
        }
      `}</style>
    </section>
  );
};

export default FinalCTA;
