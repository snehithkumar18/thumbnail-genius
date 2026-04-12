import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Lock, Check, Zap } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle } from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";

interface UpgradeModalProps {
  open: boolean;
  onClose: () => void;
  featureName: string;
  minimumPlan: string;
}

const planInfo: Record<string, { price: string; credits: string; features: string[] }> = {
  basic: { price: '$10', credits: '100', features: ['No watermark', 'FLUX.2 Pro + Ideogram 3.0', '1 Brand Kit'] },
  creator: { price: '$19', credits: '200', features: ['All models', 'A/B testing', 'Batch generate (5)'] },
  pro: { price: '$32', credits: '350', features: ['Priority queue', '5 Brand Kits', 'Multi-language'] },
  studio: { price: '$50', credits: '600', features: ['API access', 'Unlimited rollover', 'Dedicated support'] },
};

const UpgradeModal = ({ open, onClose, featureName, minimumPlan }: UpgradeModalProps) => {
  const navigate = useNavigate();
  const info = planInfo[minimumPlan] ?? planInfo.basic;
  const isMobile = useIsMobile();

  if (!open) return null;

  const ModalContent = () => (
    <div className="text-center p-1">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-4">
        <Lock className="h-8 w-8 text-primary" />
      </div>

      <h2 className="text-xl font-heading font-bold text-foreground mb-2">Unlock {featureName}</h2>
      <p className="text-muted-foreground text-sm mb-6 px-4 tab:px-0">
        This feature is available on <span className="text-primary font-semibold capitalize">{minimumPlan}</span> and above
      </p>

      <div className="glass-card rounded-xl p-4 mb-6 text-left">
        <div className="flex items-center justify-between mb-3">
          <span className="font-heading font-bold text-foreground capitalize">{minimumPlan}</span>
          <span className="text-foreground font-bold">{info.price}/mo</span>
        </div>
        <p className="text-xs text-muted-foreground mb-3">{info.credits} credits/month</p>
        <ul className="space-y-1.5">
          {info.features.map((f) => (
            <li key={f} className="flex items-center gap-2 text-xs text-muted-foreground">
              <Check className="h-3 w-3 text-primary shrink-0" />
              {f}
            </li>
          ))}
        </ul>
      </div>

      <p className="text-xs text-muted-foreground mb-4">Annual plans save 20%</p>

      <div className="space-y-3">
        <Button
          variant="hero"
          className="w-full h-12 font-bold"
          onClick={() => { onClose(); navigate('/pricing'); }}
        >
          <Zap className="h-4 w-4 mr-2" />
          Upgrade to {minimumPlan} — {info.price}/month
        </Button>
        <Button
          variant="heroGhost"
          className="w-full h-12 font-medium"
          onClick={() => { onClose(); navigate('/pricing'); }}
        >
          Buy Credits Instead — $2
        </Button>
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(val) => !val && onClose()}>
        <DrawerContent className="p-6 pb-12 focus-visible:outline-none">
          <DrawerTitle className="sr-only">Upgrade Account</DrawerTitle>
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

export default UpgradeModal;
