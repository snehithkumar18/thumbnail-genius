import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const TOUR_STEPS = [
  { target: 'tour-upload', text: "Start by uploading any thumbnail — even your competitor's", pos: 'bottom' },
  { target: 'tour-layers', text: "AI automatically finds every element for you", pos: 'right' },
  { target: 'tour-canvas', text: "Click any highlighted area to select that element", pos: 'bottom' },
  { target: 'tour-controls', text: "Replace it with your own image, text, or AI description", pos: 'left' }
];

export function FeatureTour() {
  const [step, setStep] = useState(0);
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState<{ x: number, y: number, w: number, h: number } | null>(null);

  useEffect(() => {
    const isToured = localStorage.getItem('Thumbly_smart_editor_toured');
    if (!isToured) {
      // Small delay to let UI mount
      setTimeout(() => setShow(true), 1500);
    }
  }, []);

  useEffect(() => {
    if (!show) return;
    const targetEl = document.getElementById(TOUR_STEPS[step].target);
    if (targetEl) {
       const rect = targetEl.getBoundingClientRect();
       setCoords({ x: rect.left, y: rect.top, w: rect.width, h: rect.height });
    } else {
       // if element missing, skip step
       if (step < TOUR_STEPS.length - 1) setStep(step + 1);
       else finishTour();
    }
    
    // update on resize
    const fn = () => setStep(s => s); // forces re-render which triggers above logic conceptually 
    window.addEventListener('resize', fn);
    return () => window.removeEventListener('resize', fn);
  }, [step, show]);

  const finishTour = () => {
    setShow(false);
    localStorage.setItem('Thumbly_smart_editor_toured', 'true');
  };

  if (!show || !coords) return null;

  const currentStep = TOUR_STEPS[step];
  
  return (
    <div className="fixed inset-0 z-[100] pointer-events-auto">
      {/* Box shadow trick for cutout mask */}
      <div 
         className="absolute transition-all duration-500 ease-in-out z-[100] border-2 border-[#8B47FF]"
         style={{
            left: coords.x - 8,
            top: coords.y - 8,
            width: coords.w + 16,
            height: coords.h + 16,
            borderRadius: '12px',
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.7)'
         }}
      />
      
      {/* Tooltip */}
      <div 
         className="absolute z-[101] transition-all duration-500 max-w-[250px]"
         style={{
             ...(currentStep.pos === 'bottom' && { top: coords.y + coords.h + 24, left: coords.x }),
             ...(currentStep.pos === 'right' && { top: coords.y, left: coords.x + coords.w + 24 }),
             ...(currentStep.pos === 'left' && { top: coords.y, right: window.innerWidth - coords.x + 24 }),
         }}
      >
          <motion.div 
             key={step}
             initial={{ opacity: 0, y: 10 }}
             animate={{ opacity: 1, y: 0 }}
             className="bg-white rounded-lg shadow-xl border border-[#8B47FF] p-4 text-center relative"
          >
              <button
                onClick={finishTour}
                aria-label="Close tour"
                className="absolute right-2 top-2 text-[#8B47FF]/70 hover:text-[#8B47FF] text-xs"
              >
               x
              </button>
              <p className="text-sm font-semibold text-[#0F0A1E] mb-4">
                 {currentStep.text}
              </p>
              
              <button 
                 onClick={() => step < TOUR_STEPS.length - 1 ? setStep(step + 1) : finishTour()}
                 className="bg-[#8B47FF] hover:bg-[#7236d6] text-white text-xs font-semibold px-4 py-2 rounded-md w-full transition"
              >
                  {step < TOUR_STEPS.length - 1 ? 'Next →' : 'Got it! Let me try →'}
              </button>
              <button
                onClick={finishTour}
                className="mt-2 text-[11px] text-muted-foreground hover:text-foreground underline"
              >
                Skip tour
              </button>
          </motion.div>
      </div>
    </div>
  );
}
