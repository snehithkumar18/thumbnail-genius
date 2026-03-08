import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Sparkles, Zap, Check } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router-dom";

const planUnlocks: Record<string, string[]> = {
  basic: ['No watermark on downloads', 'FLUX.2 Pro + Ideogram models', '1 Brand Kit'],
  creator: ['All AI models unlocked', 'A/B thumbnail testing', 'Batch generation up to 5'],
  pro: ['Priority generation queue', '5 Brand Kits', 'Thumbnail scorer access'],
  studio: ['API access for automation', 'Unlimited credit rollover', 'Dedicated support'],
};

const PaymentSuccessOverlay = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const [show, setShow] = useState(false);

  const paymentStatus = searchParams.get('payment');
  const planType = searchParams.get('plan');

  useEffect(() => {
    if (paymentStatus === 'success') {
      setShow(true);
      const timer = setTimeout(() => {
        handleDismiss();
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [paymentStatus]);

  const handleDismiss = () => {
    setShow(false);
    searchParams.delete('payment');
    searchParams.delete('plan');
    setSearchParams(searchParams, { replace: true });
  };

  if (!show) return null;

  const isSubscription = planType && planType !== 'topup';
  const unlocks = planType ? planUnlocks[planType] : null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[200] flex items-center justify-center bg-background/90 backdrop-blur-md p-4"
        onClick={handleDismiss}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.8, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', duration: 0.6 }}
          className="glass-card rounded-2xl w-full max-w-md p-10 text-center relative"
          onClick={(e) => e.stopPropagation()}
        >
          <motion.div
            animate={{ rotate: [0, 15, -15, 0] }}
            transition={{ duration: 0.5, delay: 0.3 }}
          >
            <div className="w-20 h-20 rounded-full bg-primary/20 flex items-center justify-center mx-auto mb-6">
              {isSubscription ? (
                <Sparkles className="h-10 w-10 text-primary" />
              ) : (
                <Zap className="h-10 w-10 text-secondary" />
              )}
            </div>
          </motion.div>

          {isSubscription ? (
            <>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                🚀 Welcome to {planType?.charAt(0).toUpperCase()}{planType?.slice(1)}!
              </h2>
              <p className="text-muted-foreground text-sm mb-6">Your credits are ready to use</p>
              {unlocks && (
                <ul className="space-y-2 mb-8 text-left max-w-xs mx-auto">
                  {unlocks.map((u) => (
                    <li key={u} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Check className="h-4 w-4 text-primary shrink-0" />
                      {u}
                    </li>
                  ))}
                </ul>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-heading font-bold text-foreground mb-2">
                🎉 Credits Added!
              </h2>
              <p className="text-muted-foreground text-sm mb-6">
                Your credits are now in your account and ready to use
              </p>
            </>
          )}

          <Button variant="hero" size="lg" className="w-full" onClick={handleDismiss}>
            Start Creating →
          </Button>
          <p className="text-xs text-muted-foreground mt-4">Auto-redirecting in a few seconds...</p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default PaymentSuccessOverlay;
