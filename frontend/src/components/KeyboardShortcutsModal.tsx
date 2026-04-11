import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from "@/components/ui/drawer";
import { useMediaQuery } from "@/hooks/use-mobile";

const SHORTCUTS = [
  { keys: ["⌘", "Enter"], desc: "Generate thumbnail" },
  { keys: ["⌘", "D"], desc: "Download selected thumbnail" },
  { keys: ["⌘", "F"], desc: "Focus search" },
  { keys: ["F"], desc: "Toggle favorite" },
  { keys: ["?"], desc: "Show keyboard shortcuts" },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function KeyboardShortcutsModal({ open, onClose }: Props) {
  const isMobile = useMediaQuery("(max-width: 768px)");

  const Content = () => (
    <div className="space-y-4 mt-2">
      <p className="text-xs text-muted-foreground mb-4 block tab:hidden">
        Note: Keyboard shortcuts are available when using a physical keyboard.
      </p>
      {SHORTCUTS.map((s) => (
        <div key={s.desc} className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{s.desc}</span>
          <div className="flex gap-1">
            {s.keys.map((k) => (
              <kbd
                key={k}
                className="px-2 py-1 text-xs font-mono bg-muted border border-border rounded text-foreground min-w-[24px] text-center"
              >
                {k}
              </kbd>
            ))}
          </div>
        </div>
      ))}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={(v) => !v && onClose()}>
        <DrawerContent className="p-6 pb-12 focus-visible:outline-none">
          <DrawerHeader className="px-0">
            <DrawerTitle className="text-foreground text-left">⌨️ Keyboard Shortcuts</DrawerTitle>
          </DrawerHeader>
          <Content />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-foreground">⌨️ Keyboard Shortcuts</DialogTitle>
        </DialogHeader>
        <Content />
      </DialogContent>
    </Dialog>
  );
}
