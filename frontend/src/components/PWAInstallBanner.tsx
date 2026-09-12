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
        className="fixed bottom-6 right-6 left-6 md:left-auto md:w-[380px] z-[9999] bg-white border border-[#EAE5F5] rounded-2xl p-5 shadow-[0_16px_48px_rgba(15,10,30,0.12)] flex flex-col gap-4 text-[#0F0A1E] overflow-hidden"
      >
        {/* Glow effect in background */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-[#8B47FF]/10 rounded-full blur-2xl pointer-events-none" />
        
        <div className="flex gap-3.5 items-start">
          <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-tr from-[#8B47FF] to-[#6366F1] rounded-xl flex items-center justify-center shadow-md shadow-[#8B47FF]/20">
            <svg viewBox="0 0 512 512" className="w-7 h-7 text-white fill-current">
              <path d="M190 160 C190 140, 205 130, 225 140 L345 230 C365 240, 365 260, 345 270 L225 360 C205 370, 190 360, 190 340 Z" />
              <path d="M370 120 C370 140 380 150 400 150 C380 150 370 160 370 180 C370 160 360 150 340 150 C360 150 370 140 370 120 Z" fill="#FFE97F" />
            </svg>
          </div>
          
          <div className="flex-1 min-w-0 pr-4">
            <h3 className="font-bold text-sm leading-tight flex items-center gap-1 text-[#0F0A1E]">
              Install ThumbAI <Sparkles className="w-3.5 h-3.5 text-amber-500 fill-current" />
            </h3>
            <p className="text-xs text-[#524B66] mt-1 leading-normal">
              Install ThumbAI on your device for standalone fullscreen creation and faster access.
            </p>
          </div>

          <button 
            onClick={handleDismiss} 
            className="flex-shrink-0 hover:bg-[#F0EDF8] p-1.5 rounded-lg transition-colors text-[#7B748E] hover:text-[#0F0A1E]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex gap-2.5 items-center justify-end pt-1">
          <button
            onClick={handleDismiss}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-[#524B66] hover:bg-[#F0EDF8] transition-colors"
          >
            Maybe Later
          </button>
          
          <Button
            onClick={handleInstallClick}
            size="sm"
            className="bg-[#8B47FF] hover:bg-[#7839EE] text-white font-bold rounded-xl text-xs px-4 py-2 flex items-center gap-1.5 shadow-md shadow-[#8B47FF]/25 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Install App
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
