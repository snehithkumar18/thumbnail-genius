import React from 'react';
import { motion } from 'framer-motion';
import { Sparkles } from 'lucide-react';

const PageLoader = () => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-xl"
    >
      <div className="relative flex flex-col items-center">
        {/* Animated Glow behind logo */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.3, 0.6, 0.3],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="absolute inset-0 bg-primary/20 blur-[60px] rounded-full"
        />

        <motion.div
          animate={{
            y: [0, -12, 0],
            rotate: [0, 5, -5, 0],
          }}
          transition={{
            duration: 3,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="relative mb-6"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-secondary p-1 shadow-2xl shadow-primary/30">
            <div className="flex h-full w-full items-center justify-center rounded-[14px] bg-background">
              <Sparkles className="h-8 w-8 text-primary" />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center"
        >
          <h2 className="text-xl font-heading font-bold text-foreground tracking-tight">ThumbAI</h2>
          <div className="mt-4 flex items-center gap-1">
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                animate={{
                  scale: [1, 1.5, 1],
                  opacity: [0.3, 1, 0.3],
                }}
                transition={{
                  duration: 1,
                  repeat: Infinity,
                  delay: i * 0.2,
                }}
                className="h-1.5 w-1.5 rounded-full bg-primary"
              />
            ))}
          </div>
        </motion.div>
      </div>

      {/* Subtle branding hint */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 0.4 }}
        transition={{ delay: 1 }}
        className="absolute bottom-12 text-[10px] uppercase tracking-[0.2em] font-bold text-muted-foreground"
      >
        Your AI Thumbnail Studio
      </motion.p>
    </motion.div>
  );
};

export default PageLoader;
