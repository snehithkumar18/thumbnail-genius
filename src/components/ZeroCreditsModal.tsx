import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Gem, Zap } from "lucide-react";

interface ZeroCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

const ZeroCreditsModal = ({ open, onClose }: ZeroCreditsModalProps) => {
  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card rounded-2xl w-full max-w-md p-8 relative text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground">
            <X className="h-5 w-5" />
          </button>

          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Gem className="h-8 w-8 text-destructive" />
          </div>

          <h2 className="text-xl font-heading font-bold text-foreground mb-2">You're out of credits!</h2>
          <p className="text-muted-foreground text-sm mb-2">
            Your balance: <span className="text-foreground font-bold">0 credits</span>
          </p>
          <p className="text-muted-foreground text-sm mb-6">
            With <span className="text-primary font-semibold">Pro</span> you'd have 400 credits/month, priority generation, and all AI models.
          </p>

          <div className="space-y-3">
            <Button variant="hero" className="w-full" size="lg">
              <Zap className="h-4 w-4 mr-2" />
              Upgrade to Pro — ₹799/mo
            </Button>
            <Button variant="heroGhost" className="w-full" size="lg">
              Buy 150 credits for ₹349
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZeroCreditsModal;
