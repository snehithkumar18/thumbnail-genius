import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Gem, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface ZeroCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

const ZeroCreditsModal = ({ open, onClose }: ZeroCreditsModalProps) => {
  const navigate = useNavigate();

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="glass-card rounded-2xl w-full max-w-md p-8 relative text-center"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
            <Gem className="h-8 w-8 text-destructive" />
          </div>

          <h2 className="text-xl font-heading font-bold text-foreground mb-2">You're out of credits!</h2>
          <p className="text-muted-foreground text-sm mb-6">
            You need credits to continue generating. Choose an option below to get started again.
          </p>

          <div className="space-y-3">
            <Button
              variant="hero"
              className="w-full"
              size="lg"
              onClick={() => { onClose(); navigate('/pricing'); }}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Starter Pack — $2 (30 credits)
            </Button>
            <Button
              variant="outline"
              className="w-full"
              size="lg"
              onClick={() => { onClose(); navigate('/pricing'); }}
            >
              <Zap className="h-4 w-4 mr-2" />
              Boost Pack — $5 (80 credits)
            </Button>
            <Button
              variant="heroGhost"
              className="w-full"
              size="lg"
              onClick={() => { onClose(); navigate('/pricing'); }}
            >
              View All Plans
            </Button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZeroCreditsModal;
