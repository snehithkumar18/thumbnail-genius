import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Gem, Zap, Sparkles } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-mobile";

interface ZeroCreditsModalProps {
  open: boolean;
  onClose: () => void;
}

const ZeroCreditsModal = ({ open, onClose }: ZeroCreditsModalProps) => {
  const navigate = useNavigate();
  const isMobile = useMediaQuery("(max-width: 768px)");

  if (!open) return null;

  const ModalContent = () => (
    <div className="text-center p-1">
      <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto mb-4">
        <Gem className="h-8 w-8 text-destructive" />
      </div>

      <h2 className="text-xl font-heading font-bold text-foreground mb-2">You're out of credits!</h2>
      <p className="text-muted-foreground text-sm mb-6 px-4 tab:px-0">
        You need credits to continue generating. Choose an option below to get started again.
      </p>

      <div className="space-y-3">
        <Button
          variant="hero"
          className="w-full h-12 font-bold"
          onClick={() => { onClose(); navigate('/pricing'); }}
        >
          <Sparkles className="h-4 w-4 mr-2" />
          Starter Pack — $2 (30 credits)
        </Button>
        <Button
          variant="outline"
          className="w-full h-12 font-medium"
          onClick={() => { onClose(); navigate('/pricing'); }}
        >
          <Zap className="h-4 w-4 mr-2" />
          Boost Pack — $5 (80 credits)
        </Button>
        <Button
          variant="heroGhost"
          className="w-full h-12 font-medium"
          onClick={() => { onClose(); navigate('/pricing'); }}
        >
          Basic Plan — $10/mo (100 credits)
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(val) => !val && onClose()}>
        <DrawerContent className="p-6 pb-12 focus-visible:outline-none">
          <DrawerTitle className="sr-only">Insufficient Credits</DrawerTitle>
          <ModalContent />
        </DrawerContent>
      </Drawer>
    );
  }

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
          className="glass-card rounded-2xl w-full max-w-md p-8 relative"
          onClick={(e) => e.stopPropagation()}
        >
          <button onClick={onClose} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none">
            <X className="h-5 w-5" />
          </button>
          <ModalContent />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default ZeroCreditsModal;
