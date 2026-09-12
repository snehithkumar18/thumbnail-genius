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
      className="min-h-[70vh] flex items-center justify-center relative overflow-hidden bg-[#070310] border-t border-white/10"
    >
      {/* Glowing orbs */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[radial-gradient(circle_at_center,rgba(139,71,255,0.18),rgba(0,229,255,0.06)_50%,transparent_70%)] pointer-events-none" />

      <div className="container mx-auto px-4 relative z-10 text-center py-20">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7 }}
        >
          <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold bg-[#8B47FF]/15 border border-[#8B47FF]/30 text-[#C4A8FF] mb-6">
            ⚡ GET STARTED IN SECONDS
          </span>

          <h2 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black text-white leading-none tracking-tight mb-2">
            READY TO GO
          </h2>
          <h2 className="text-5xl sm:text-7xl lg:text-9xl font-display font-black bg-gradient-to-r from-[#C4A8FF] via-[#8B47FF] to-[#00E5FF] bg-clip-text text-transparent leading-none tracking-tight mb-8">
            VIRAL?
          </h2>

          <p className="text-base sm:text-xl text-white/60 mb-10 max-w-lg mx-auto leading-relaxed">
            Stop losing 70% of potential viewers before they even click. Fix your YouTube packaging today.
          </p>

          <motion.button
            onClick={handleClick}
            whileHover={{ y: -3, scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            className="relative text-white font-bold px-12 py-5 rounded-full text-lg sm:text-xl transition-all duration-300 shadow-[0_0_50px_rgba(139,71,255,0.4)] hover:shadow-[0_0_80px_rgba(139,71,255,0.6)] cursor-pointer"
            style={{ background: "linear-gradient(135deg, #8B47FF 0%, #6366F1 50%, #00E5FF 100%)" }}
          >
            Start Creating Free →
          </motion.button>

          <p className="text-xs sm:text-sm text-white/40 mt-6 font-medium">
            30 free generation credits included • No credit card required • Top-ups never expire
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
