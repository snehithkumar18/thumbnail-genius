import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Gem } from 'lucide-react';

interface CreditsBadgeProps {
  balance: number;
  onClick?: () => void;
}

export function CreditsBadge({ balance, onClick }: CreditsBadgeProps) {
  const [prevBalance, setPrevBalance] = useState(balance);
  const [diff, setDiff] = useState<number | null>(null);

  useEffect(() => {
    if (balance !== prevBalance) {
      const difference = balance - prevBalance;
      setDiff(difference);
      setTimeout(() => setDiff(null), 2000);
      setPrevBalance(balance);
    }
  }, [balance]);

  const isLow = balance < 10;

  return (
    <div className="relative flex items-center gap-2">
      <motion.div 
        animate={isLow ? { scale: [1, 1.05, 1] } : {}}
        transition={isLow ? { repeat: Infinity, duration: 1.5 } : {}}
        onClick={onClick}
        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full border shadow-sm transition-all duration-500 ${
          isLow ? 'bg-red-50 border-red-200 text-red-600' : 'bg-primary/5 border-primary/20 text-primary font-semibold'
        } ${onClick ? 'cursor-pointer hover:bg-primary/10' : ''}`}
        title={isLow ? "Running low! Top up or upgrade" : (onClick ? "Click to top up credits" : "Credits remaining")}
      >
        <Gem className="h-3.5 w-3.5" />
        <div className="relative h-4 overflow-hidden min-w-[30px] flex items-center justify-center">
            <AnimatePresence mode="wait">
                <motion.span
                    key={balance}
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: -20, opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="absolute text-xs"
                >
                    {balance}
                </motion.span>
            </AnimatePresence>
        </div>
        <span className="text-[10px] opacity-70">credits</span>
      </motion.div>

      <AnimatePresence>
        {diff !== null && (
          <motion.div
            initial={{ opacity: 0, y: 0, scale: 0.5 }}
            animate={{ opacity: 1, y: -25, scale: 1 }}
            exit={{ opacity: 0, scale: 0.5 }}
            className={`absolute right-0 text-[10px] font-bold px-1.5 py-0.5 rounded-full text-white ${diff < 0 ? 'bg-red-500' : 'bg-green-500'}`}
          >
            {diff > 0 ? '+' : ''}{diff} credits
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
