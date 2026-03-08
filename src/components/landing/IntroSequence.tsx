import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import confetti from "canvas-confetti";

interface IntroSequenceProps {
  onComplete: () => void;
}

const IntroSequence = ({ onComplete }: IntroSequenceProps) => {
  const [phase, setPhase] = useState<"loading" | "exploding" | "done">("loading");
  const [progress, setProgress] = useState(0);
  const hasExploded = useRef(false);

  useEffect(() => {
    // Loading bar fills in 600ms
    const start = Date.now();
    const fill = () => {
      const elapsed = Date.now() - start;
      const p = Math.min(elapsed / 600, 1);
      setProgress(p);
      if (p < 1) requestAnimationFrame(fill);
      else {
        // Start explosion phase
        setPhase("exploding");
        if (!hasExploded.current) {
          hasExploded.current = true;
          confetti({
            particleCount: 80,
            spread: 100,
            origin: { x: 0.5, y: 0.5 },
            colors: ["#FF4500", "#FFD700", "#FFFFFF"],
            startVelocity: 35,
            gravity: 0.8,
            ticks: 60,
          });
        }
        setTimeout(() => {
          setPhase("done");
          onComplete();
        }, 600);
      }
    };
    requestAnimationFrame(fill);
  }, [onComplete]);

  return (
    <AnimatePresence>
      {phase !== "done" && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.4 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-background"
        >
          <motion.div
            animate={
              phase === "exploding"
                ? { scale: 3, opacity: 0 }
                : { scale: 1, opacity: 1 }
            }
            initial={{ scale: 0.8, opacity: 0 }}
            transition={
              phase === "exploding"
                ? { duration: 0.5, ease: "easeOut" }
                : { duration: 0.4, ease: "easeOut" }
            }
            className="flex flex-col items-center"
          >
            <div className="flex items-center gap-1 mb-6">
              <span className="text-5xl md:text-7xl font-display font-bold text-foreground tracking-tight">
                THUMB
              </span>
              <span className="text-5xl md:text-7xl font-display font-bold text-primary tracking-tight">
                AI
              </span>
            </div>
            <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
              <motion.div
                className="h-full bg-primary rounded-full"
                style={{ width: `${progress * 100}%` }}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default IntroSequence;
