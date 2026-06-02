import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Download, X, Sparkles } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

export default function PWAInstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    // Check if user already dismissed/installed it in this session
    const isDismissed = sessionStorage.getItem('pwa-prompt-dismissed');
    
    const handleBeforeInstallPrompt = (e: Event) => {
      // Prevent browser's default prompt
      e.preventDefault();
      // Save event for triggering later
      setDeferredPrompt(e);
      
      // Delay showing the banner for 3 seconds to let user experience the site first
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setIsVisible(true);
        }, 3000);
        return () => clearTimeout(timer);
      }
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    // If app is already installed, listen for appinstalled event
    window.addEventListener('appinstalled', () => {
      setIsVisible(false);
      setDeferredPrompt(null);
      console.log('PWA was installed successfully');
    });

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;
    
    // Show the native browser install prompt
    deferredPrompt.prompt();
    
    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User response to install prompt: ${outcome}`);
    
    // Reset prompt state
    setDeferredPrompt(null);
    setIsVisible(false);
  };

  const handleDismiss = () => {
    setIsVisible(false);
    // Keep it dismissed for current browser session so we don't nag the user
    sessionStorage.setItem('pwa-prompt-dismissed', 'true');
  };

  if (!isVisible) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 50, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        transition={{ duration: 0.4, ease: 'easeOut' }}
        className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[380px] z-[9999] bg-[#0b0314]/90 backdrop-blur-md border border-[#8B47FF]/30 rounded-2xl p-5 shadow-[0_8px_32px_rgba(139,71,255,0.25)] flex flex-col gap-4 text-white overflow-hidden"
      >
        {/* Glow effect in background */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#8B47FF]/20 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex gap-3.5 items-start">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-tr from-[#8B47FF] to-[#B180FF] rounded-xl flex items-center justify-center shadow-lg shadow-[#8B47FF]/20">
            <svg viewBox="0 0 512 512" className="w-7 h-7 text-white fill-current">
              <path d="M190 160 C190 140, 205 130, 225 140 L345 230 C365 240, 365 260, 345 270 L225 360 C205 370, 190 360, 190 340 Z" />
              <path d="M370 120 C370 140 380 150 400 150 C380 150 370 160 370 180 C370 160 360 150 340 150 C360 150 370 140 370 120 Z" fill="#FFE97F" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-semibold text-sm leading-tight flex items-center gap-1">
              Install ThumbAI <Sparkles className="w-3.5 h-3.5 text-[#FFE97F] fill-current" />
            </h3>
            <p className="text-xs text-zinc-300 mt-1 leading-normal">
              Install ThumbAI on your device for standalone fullscreen creation and faster access.
            </p>
          </div>

          <button 
            onClick={handleDismiss} 
            className="flex-shrink-0 hover:bg-white/10 p-1.5 rounded-lg transition-colors text-zinc-400 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={handleDismiss} 
            variant="ghost" 
            className="flex-1 text-xs text-zinc-300 hover:text-white hover:bg-white/5 border border-white/10 h-9 rounded-xl"
          >
            Maybe Later
          </Button>
          <Button 
            onClick={handleInstallClick}
            className="flex-1 text-xs bg-[#8B47FF] hover:bg-[#7236d6] text-white font-medium flex items-center justify-center gap-1.5 h-9 rounded-xl shadow-lg shadow-[#8B47FF]/20 hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
