import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { Search, BookOpen, Copy, Eye, Zap, Smartphone, X, Check, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { NICHE_TEMPLATES, PROMPT_LIBRARY, type PromptLibraryItem } from "@/lib/generate-constants";

const categories = [
  { id: "all", label: "All" },
  ...Object.entries(NICHE_TEMPLATES).map(([key, val]) => ({
    id: key,
    label: val.label,
  })),
];

const PromptLibraryPage = () => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [previewPrompt, setPreviewPrompt] = useState<PromptLibraryItem | null>(null);

  const filtered = useMemo(() => {
    let items = PROMPT_LIBRARY;
    if (activeCategory !== "all") {
      items = items.filter((p) => p.category === activeCategory);
    }
    if (search.trim()) {
      const q = search.toLowerCase();
      items = items.filter((p) => p.prompt.toLowerCase().includes(q) || p.category.toLowerCase().includes(q));
    }
    return items;
  }, [activeCategory, search]);

  const handleUse = (prompt: string, target: "generate" | "shorts") => {
    navigate(target === "shorts" ? "/dashboard/shorts" : "/dashboard", {
      state: { prefillPrompt: prompt },
    });
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard!");
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-heading font-bold text-foreground">📚 Prompt Library</h1>
        <p className="text-muted-foreground text-sm">Battle-tested prompts by top creators</p>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search prompts..."
          className="pl-10 bg-background border-border text-foreground"
        />
      </div>

      {/* Category tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${
              activeCategory === cat.id
                ? "bg-primary/10 border-primary/40 text-primary"
                : "bg-muted border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filtered.map((item, i) => (
          <motion.div
            key={item.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="glass-card rounded-xl p-4 flex flex-col"
          >
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm">{item.categoryIcon}</span>
              <span className="text-xs text-muted-foreground capitalize">{item.category}</span>
            </div>

            <p className="text-sm text-foreground leading-relaxed mb-3 line-clamp-2 flex-1">
              {item.prompt}
            </p>

            <div className="flex items-center gap-2 mb-3 flex-wrap">
              <Badge variant="outline" className="text-[10px] border-border">
                {item.style}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-border">
                {item.format}
              </Badge>
              <div className="flex items-center gap-0.5 ml-auto">
                {Array.from({ length: 5 }).map((_, si) => (
                  <Star
                    key={si}
                    className={`h-3 w-3 ${si < item.quality ? "text-secondary fill-secondary" : "text-muted-foreground/30"}`}
                  />
                ))}
              </div>
            </div>

            <div className="flex gap-1.5">
              <Button
                variant="hero"
                size="sm"
                className="flex-1 text-xs"
                onClick={() => handleUse(item.prompt, "generate")}
              >
                <Zap className="h-3 w-3 mr-1" /> Use Prompt
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border"
                onClick={() => handleUse(item.prompt, "shorts")}
              >
                <Smartphone className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border"
                onClick={() => setPreviewPrompt(item)}
              >
                <Eye className="h-3 w-3" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs border-border"
                onClick={() => handleCopy(item.prompt)}
              >
                <Copy className="h-3 w-3" />
              </Button>
            </div>
          </motion.div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16">
          <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
          <p className="text-muted-foreground">No prompts found</p>
        </div>
      )}

      {/* Preview dialog */}
      <Dialog open={!!previewPrompt} onOpenChange={() => setPreviewPrompt(null)}>
        <DialogContent className="bg-card border-border max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-foreground flex items-center gap-2">
              {previewPrompt?.categoryIcon} Full Prompt
            </DialogTitle>
            <DialogDescription className="sr-only">Preview the full prompt text.</DialogDescription>
          </DialogHeader>
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {previewPrompt?.prompt}
          </p>
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="outline" className="border-border text-xs">{previewPrompt?.style}</Badge>
            <Badge variant="outline" className="border-border text-xs">{previewPrompt?.format}</Badge>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="hero" className="flex-1" onClick={() => { if (previewPrompt) handleUse(previewPrompt.prompt, "generate"); }}>
              <Zap className="h-4 w-4 mr-2" /> Use for Thumbnail
            </Button>
            <Button variant="outline" className="border-border" onClick={() => { if (previewPrompt) handleCopy(previewPrompt.prompt); }}>
              <Copy className="h-4 w-4 mr-2" /> Copy
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default PromptLibraryPage;
