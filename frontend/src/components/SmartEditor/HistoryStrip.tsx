import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription
} from '@/components/ui/dialog';

interface HistoryStripProps {
  history: string[];
  currentIndex: number;
  onRestore: (index: number) => void;
}

export function HistoryStrip({ history, currentIndex, onRestore }: HistoryStripProps) {
  const [confirmIndex, setConfirmIndex] = useState<number | null>(null);

  const handleThumbnailClick = (index: number) => {
    if (index === currentIndex) return;
    setConfirmIndex(index);
  };

  const confirmRestore = () => {
    if (confirmIndex !== null) {
      onRestore(confirmIndex);
      setConfirmIndex(null);
    }
  };

  return (
    <>
      <div className="flex flex-col h-full justify-center">
        <div className="flex px-4 gap-3 overflow-x-auto pb-1 items-end custom-scrollbar">
          <AnimatePresence initial={false}>
            {history.map((url, idx) => {
              const isSelected = idx === currentIndex;
              
              return (
                <motion.div
                  key={url + idx}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: 'spring', damping: 20, stiffness: 200 }}
                  className="flex flex-col items-center gap-1 shrink-0"
                >
                  <div
                    onClick={() => handleThumbnailClick(idx)}
                    className={`relative shrink-0 h-[34px] w-[60px] rounded-[6px] overflow-hidden cursor-pointer transition-all hover:scale-105 hover:shadow-md ${
                      isSelected
                        ? 'border-2 border-[#8B47FF] ring-2 ring-[#8B47FF]/20 shadow-[0_0_10px_rgba(139,71,255,0.4)]'
                        : 'border border-[#E8E2FF] opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={url} className="w-full h-full object-cover" alt={`Version ${idx}`} />
                    {idx === 0 && (
                      <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
                        <Lock className="h-3 w-3 text-white drop-shadow-md" />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] text-muted-foreground font-medium">
                    {idx === 0 ? "Original" : `${history.length - idx} step${history.length - idx > 1 ? 's' : ''} ago`}
                  </span>
                </motion.div>
              );
            })}
          </AnimatePresence>
        </div>
      </div>

      <Dialog open={confirmIndex !== null} onOpenChange={(open) => !open && setConfirmIndex(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Restore to this version?</DialogTitle>
            <DialogDescription>
              This will undo any edits made after this point. You cannot redo undone edits easily without reusing credits.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setConfirmIndex(null)}>
              Cancel
            </Button>
            <Button className="bg-[#8B47FF] hover:bg-[#7236d6]" onClick={confirmRestore}>
              Restore
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
