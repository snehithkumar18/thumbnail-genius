import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";

const CHANGELOG = [
  {
    version: "1.2.0",
    date: "2026-03-08",
    features: [
      { title: "Batch Generation", description: "Generate up to 20 thumbnails at once", badge: "NEW" },
      { title: "Prompt Library", description: "54 battle-tested prompts across 9 niches", badge: "NEW" },
      { title: "Referral System", description: "Earn 50 credits for every friend who upgrades", badge: "NEW" },
    ],
  },
  {
    version: "1.1.0",
    date: "2026-03-01",
    features: [
      { title: "A/B Testing", description: "Get real votes on which thumbnail performs better", badge: null },
      { title: "Face Swap", description: "Swap faces in your thumbnails with AI", badge: null },
      { title: "Multi-language", description: "Generate text thumbnails in Hindi, Telugu & more", badge: null },
    ],
  },
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export default function WhatsNewModal({ open, onClose }: Props) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-lg bg-card border-border max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-foreground">🆕 What's New</DialogTitle>
        </DialogHeader>
        <div className="space-y-6 mt-2">
          {CHANGELOG.map((release) => (
            <div key={release.version}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-sm font-heading font-semibold text-foreground">v{release.version}</span>
                <span className="text-xs text-muted-foreground">{release.date}</span>
              </div>
              <div className="space-y-2">
                {release.features.map((f) => (
                  <div key={f.title} className="flex items-start gap-3 p-3 bg-muted/50 rounded-lg">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground">{f.title}</span>
                        {f.badge && (
                          <Badge className="bg-primary/20 text-primary border-primary/30 text-[10px]">
                            {f.badge}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{f.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
