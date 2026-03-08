import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Pencil, Download, Heart, Send, Clock, ChevronDown, ChevronUp, ImageIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useCredits, useThumbnails } from "@/hooks/useSupabaseData";
import { useQueryClient } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import ZeroCreditsModal from "@/components/ZeroCreditsModal";

const QUICK_SUGGESTIONS = [
  "Darker background",
  "More dramatic lighting",
  "Shocked expression",
  "Add lightning effect",
  "Change text to red",
  "Remove background",
  "More contrast",
  "Neon glow effect",
];

type EditEntry = {
  instruction: string;
  result_url: string;
  thumbnail_id: string;
  timestamp: Date;
};

const EditorPage = () => {
  const { user } = useAuth();
  const { data: credits } = useCredits();
  const { data: allThumbnails } = useThumbnails(null, false, false);
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const initialThumbId = searchParams.get("thumbnail");
  const initialThumbUrl = searchParams.get("url");

  // State
  const [currentImageUrl, setCurrentImageUrl] = useState(initialThumbUrl || "");
  const [currentThumbId, setCurrentThumbId] = useState(initialThumbId || "");
  const [versions, setVersions] = useState<Array<{ url: string; id: string; time: Date }>>([]);
  const [activeVersion, setActiveVersion] = useState(0);
  const [showCompare, setShowCompare] = useState(false);
  const [editInput, setEditInput] = useState("");
  const [editing, setEditing] = useState(false);
  const [editHistory, setEditHistory] = useState<EditEntry[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [availableSuggestions, setAvailableSuggestions] = useState(QUICK_SUGGESTIONS);
  const [showZeroCredits, setShowZeroCredits] = useState(false);
  const [selectingThumbnail, setSelectingThumbnail] = useState(!initialThumbUrl);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const remaining = credits?.credits_remaining ?? 0;

  // Init versions from current image
  useEffect(() => {
    if (currentImageUrl && versions.length === 0) {
      setVersions([{ url: currentImageUrl, id: currentThumbId, time: new Date() }]);
    }
  }, [currentImageUrl, currentThumbId, versions.length]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [editHistory]);

  const handleSelectThumbnail = (thumb: { image_url: string | null; id: string }) => {
    if (!thumb.image_url) return;
    setCurrentImageUrl(thumb.image_url);
    setCurrentThumbId(thumb.id);
    setVersions([{ url: thumb.image_url, id: thumb.id, time: new Date() }]);
    setActiveVersion(0);
    setEditHistory([]);
    setSelectingThumbnail(false);
  };

  const handleEdit = useCallback(async (instruction: string) => {
    if (!user || !currentImageUrl || !instruction.trim()) return;
    if (remaining < 1) { setShowZeroCredits(true); return; }

    setEditing(true);
    try {
      const { data, error } = await supabase.functions.invoke("edit-thumbnail", {
        body: {
          current_image_url: currentImageUrl,
          edit_instruction: instruction.trim(),
          thumbnail_id: currentThumbId,
        },
      });

      if (error) throw new Error(error.message || "Edit failed");
      if (data?.error) {
        if (data.error === "Insufficient credits") { setShowZeroCredits(true); return; }
        throw new Error(data.error);
      }

      const newVersion = { url: data.image_url, id: data.thumbnail_id, time: new Date() };
      setVersions((prev) => [...prev, newVersion]);
      setActiveVersion(versions.length);
      setCurrentImageUrl(data.image_url);
      setCurrentThumbId(data.thumbnail_id);

      setEditHistory((prev) => [
        ...prev,
        { instruction, result_url: data.image_url, thumbnail_id: data.thumbnail_id, timestamp: new Date() },
      ]);

      queryClient.invalidateQueries({ queryKey: ["credits"] });
      queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
      toast.success("Edit applied!");
    } catch (err: any) {
      toast.error(err.message || "Edit failed");
    } finally {
      setEditing(false);
      setEditInput("");
    }
  }, [user, currentImageUrl, currentThumbId, remaining, versions.length, queryClient]);

  const handleSuggestionClick = (suggestion: string) => {
    setAvailableSuggestions((prev) => prev.filter((s) => s !== suggestion));
    handleEdit(suggestion);
  };

  const handleSend = () => {
    if (editInput.trim()) handleEdit(editInput.trim());
  };

  const handleDownload = async (imageUrl: string) => {
    try {
      const resp = await fetch(imageUrl);
      const blob = await resp.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `thumbai-edit-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(a.href);
    } catch { toast.error("Download failed"); }
  };

  const handleFavorite = async (thumbnailId: string) => {
    await supabase.from("thumbnails").update({ is_favorite: true }).eq("id", thumbnailId);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    toast.success("Added to favorites");
  };

  // Thumbnail selector
  if (selectingThumbnail) {
    return (
      <div className="h-[calc(100vh-60px-48px)] flex flex-col">
        <div className="mb-6">
          <h1 className="text-xl font-heading font-bold text-foreground flex items-center gap-2">
            ✏️ AI Editor
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Select a thumbnail to edit</p>
        </div>
        <ScrollArea className="flex-1">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {allThumbnails?.filter((t) => t.image_url).map((thumb) => (
              <button
                key={thumb.id}
                onClick={() => handleSelectThumbnail(thumb)}
                className="group relative aspect-video rounded-xl overflow-hidden border border-border hover:border-primary/40 transition-all"
              >
                <img src={thumb.image_url!} alt="" className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <span className="text-sm font-medium text-foreground">Edit this</span>
                </div>
              </button>
            ))}
            {(!allThumbnails || allThumbnails.length === 0) && (
              <div className="col-span-full text-center py-20">
                <ImageIcon className="h-12 w-12 text-muted-foreground/30 mx-auto mb-3" />
                <p className="text-muted-foreground">No thumbnails yet. Generate some first!</p>
              </div>
            )}
          </div>
        </ScrollArea>
      </div>
    );
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-60px-48px)]">
      {/* LEFT — Image + Versions */}
      <div className="lg:w-[50%] shrink-0 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h1 className="text-lg font-heading font-bold text-foreground flex items-center gap-2">
            ✏️ AI Editor
          </h1>
          <Button variant="ghostNav" size="sm" onClick={() => setSelectingThumbnail(true)}>
            Change thumbnail
          </Button>
        </div>

        {/* Current image */}
        <div className="flex-1 flex items-center justify-center min-h-0 mb-3">
          <div className="relative w-full max-w-xl">
            {showCompare && versions.length > 1 ? (
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <span className="text-[10px] text-muted-foreground">v1 (Original)</span>
                  <div className="aspect-video rounded-xl overflow-hidden border border-border">
                    <img src={versions[0].url} alt="v1" className="w-full h-full object-cover" />
                  </div>
                </div>
                <div className="space-y-1">
                  <span className="text-[10px] text-primary">v{activeVersion + 1} (Current)</span>
                  <div className="aspect-video rounded-xl overflow-hidden border border-primary/40">
                    <img src={versions[activeVersion].url} alt="current" className="w-full h-full object-cover" />
                  </div>
                </div>
              </div>
            ) : (
              <motion.div
                key={activeVersion}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="aspect-video rounded-2xl overflow-hidden border border-border"
              >
                <img src={versions[activeVersion]?.url || currentImageUrl} alt="Current version" className="w-full h-full object-cover" />
              </motion.div>
            )}
          </div>
        </div>

        {/* Version strip */}
        {versions.length > 1 && (
          <div className="space-y-2 mb-3">
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground">Versions</Label>
              <div className="flex items-center gap-1">
                <Switch checked={showCompare} onCheckedChange={setShowCompare} className="scale-75" />
                <span className="text-[10px] text-muted-foreground">Before / After</span>
              </div>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {versions.map((v, i) => (
                <button
                  key={i}
                  onClick={() => {
                    setActiveVersion(i);
                    setCurrentImageUrl(v.url);
                    setCurrentThumbId(v.id);
                  }}
                  className={`shrink-0 w-20 aspect-video rounded-lg overflow-hidden border-2 transition-all ${
                    i === activeVersion ? "border-primary shadow-lg shadow-primary/20" : "border-border hover:border-muted-foreground/40"
                  }`}
                >
                  <img src={v.url} alt={`v${i + 1}`} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          <Button variant="outline" size="sm" className="border-border" onClick={() => handleDownload(versions[activeVersion]?.url || currentImageUrl)}>
            <Download className="h-3.5 w-3.5 mr-1.5" /> Download
          </Button>
          <Button variant="outline" size="sm" className="border-border" onClick={() => handleFavorite(versions[activeVersion]?.id || currentThumbId)}>
            <Heart className="h-3.5 w-3.5 mr-1.5" /> Favorite
          </Button>
        </div>
      </div>

      {/* RIGHT — Chat interface */}
      <div className="flex-1 min-w-0 flex flex-col border-l border-border pl-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-heading font-semibold text-foreground">✏️ Edit Instructions</h2>
          <span className="text-[10px] text-muted-foreground">1 credit per edit</span>
        </div>

        {/* Quick suggestions */}
        {availableSuggestions.length > 0 && !editing && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {availableSuggestions.map((s) => (
              <button
                key={s}
                onClick={() => handleSuggestionClick(s)}
                className="px-2.5 py-1 rounded-full text-[11px] bg-muted border border-border text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Chat history */}
        <ScrollArea className="flex-1 mb-3">
          <div className="space-y-3 pr-2">
            {editHistory.length === 0 && !editing && (
              <div className="text-center py-10">
                <Pencil className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">Describe what to change</p>
                <p className="text-[10px] text-muted-foreground mt-1">Or click a quick suggestion above</p>
              </div>
            )}

            {editHistory.map((entry, i) => (
              <div key={i} className="space-y-2">
                {/* User bubble */}
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-2 max-w-[85%]">
                    <p className="text-sm text-foreground">{entry.instruction}</p>
                  </div>
                </div>
                {/* AI bubble */}
                <div className="flex justify-start">
                  <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-3 py-2 max-w-[85%] space-y-2">
                    <div className="w-24 aspect-video rounded-lg overflow-hidden border border-border">
                      <img src={entry.result_url} alt="Edit result" className="w-full h-full object-cover" />
                    </div>
                    <p className="text-[11px] text-primary font-medium">Applied ✓</p>
                  </div>
                </div>
              </div>
            ))}

            {editing && (
              <div className="space-y-2">
                <div className="flex justify-end">
                  <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-3 py-2">
                    <p className="text-sm text-foreground">{editInput || "Applying edit..."}</p>
                  </div>
                </div>
                <div className="flex justify-start">
                  <div className="bg-muted border border-border rounded-2xl rounded-tl-sm px-3 py-2">
                    <div className="w-24 aspect-video rounded-lg shimmer bg-muted-foreground/10" />
                    <p className="text-[11px] text-muted-foreground mt-1">Editing...</p>
                  </div>
                </div>
              </div>
            )}

            <div ref={chatEndRef} />
          </div>
        </ScrollArea>

        {/* Edit history toggle */}
        {editHistory.length > 0 && (
          <button
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground mb-2"
          >
            <Clock className="h-3 w-3" />
            Edit history ({editHistory.length})
            {showHistory ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
          </button>
        )}

        <AnimatePresence>
          {showHistory && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden mb-2"
            >
              <div className="space-y-1 bg-muted/50 rounded-lg p-2">
                {editHistory.map((entry, i) => (
                  <div key={i} className="flex items-center gap-2 text-[10px] text-muted-foreground">
                    <span className="text-foreground font-medium">v{i + 2}</span>
                    <span className="truncate flex-1">{entry.instruction}</span>
                    <span>{entry.timestamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Chat input */}
        <div className="flex gap-2">
          <Input
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            placeholder="Describe what to change..."
            className="bg-background border-border text-foreground text-sm"
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            disabled={editing}
          />
          <Button
            variant="default"
            size="icon"
            onClick={handleSend}
            disabled={editing || !editInput.trim()}
            className="shrink-0"
          >
            {editing ? (
              <span className="animate-spin h-4 w-4 border-2 border-primary-foreground border-t-transparent rounded-full" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-1 text-center">
          {remaining} credits remaining
        </p>
      </div>

      <ZeroCreditsModal open={showZeroCredits} onClose={() => setShowZeroCredits(false)} />
    </div>
  );
};

export default EditorPage;
