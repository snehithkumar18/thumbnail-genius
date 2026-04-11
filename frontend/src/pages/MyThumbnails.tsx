import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, SortAsc, Grid3X3, List, FolderOpen, Star, Trash2, Plus, Heart, Pencil, MoreVertical, Download, FolderInput, X, Check, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useThumbnails, useFolders, useThumbnailStats } from "@/hooks/useSupabaseData";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { usePlanAccess } from "@/hooks/usePlanAccess";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { hapticFeedback } from "@/lib/utils";

type ViewFilter = "all" | "favorites" | "deleted" | string;

const MyThumbnails = () => {
  const { user } = useAuth();
  const { plan } = usePlanAccess();
  const isFreePlan = ['none'].includes(plan?.toLowerCase() || '');
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const [activeFilter, setActiveFilter] = useState<ViewFilter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [creatingFolder, setCreatingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");

  const isFolderId = activeFilter !== "all" && activeFilter !== "favorites" && activeFilter !== "deleted";
  const { data: thumbnails = [], isLoading } = useThumbnails(
    isFolderId ? activeFilter : null,
    activeFilter === "deleted",
    activeFilter === "favorites"
  );
  const { data: folders = [] } = useFolders();
  const { data: stats } = useThumbnailStats();

  const filtered = thumbnails.filter((t) =>
    searchQuery ? t.prompt?.toLowerCase().includes(searchQuery.toLowerCase()) : true
  );

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const toggleFavorite = async (id: string, current: boolean) => {
    await supabase.from("thumbnails").update({ is_favorite: !current }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    queryClient.invalidateQueries({ queryKey: ["thumbnail-stats"] });
    toast.success(current ? "Removed from favorites" : "Added to favorites");
  };

  const softDelete = async (ids: string[]) => {
    await supabase.from("thumbnails").update({ is_deleted: true, deleted_at: new Date().toISOString() }).in("id", ids);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    queryClient.invalidateQueries({ queryKey: ["thumbnail-stats"] });
    setSelectedIds(new Set());
    toast.success(`${ids.length} thumbnail(s) moved to trash`);
  };

  const restoreThumb = async (id: string) => {
    await supabase.from("thumbnails").update({ is_deleted: false, deleted_at: null }).eq("id", id);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    toast.success("Thumbnail restored");
  };

  const createFolder = async () => {
    if (!newFolderName.trim() || !user) return;
    await supabase.from("folders").insert({ user_id: user.id, name: newFolderName.trim(), emoji: "📁" });
    queryClient.invalidateQueries({ queryKey: ["folders"] });
    setNewFolderName("");
    setCreatingFolder(false);
    toast.success("Folder created");
  };

  const moveToFolder = async (thumbIds: string[], folderId: string) => {
    await supabase.from("thumbnails").update({ folder_id: folderId }).in("id", thumbIds);
    queryClient.invalidateQueries({ queryKey: ["thumbnails"] });
    setSelectedIds(new Set());
    toast.success("Moved to folder");
  };

  return (
  return (
    <div className="flex flex-col tab:flex-row gap-6 h-full lg:h-[calc(100vh-60px-48px)] overflow-hidden px-4 tab:px-0">
      {/* Folder navigation (Desktop: Sidebar, Mobile: Horizontal Scroll) */}
      <div className="flex tab:flex-col tab:w-[220px] shrink-0 gap-1.5 overflow-x-auto tab:overflow-y-auto scrollbar-hide -mx-4 px-4 tab:mx-0 tab:px-0 pb-1 tab:pb-0">
        <button
          onClick={() => setActiveFilter("all")}
          className={`shrink-0 tab:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs tab:text-sm transition-colors whitespace-nowrap ${
            activeFilter === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>All</span>
          <span className="hidden tab:inline-block ml-auto text-xs">{stats?.total ?? 0}</span>
        </button>
        <button
          onClick={() => setActiveFilter("favorites")}
          className={`shrink-0 tab:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs tab:text-sm transition-colors whitespace-nowrap ${
            activeFilter === "favorites" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Star className="h-4 w-4" />
          <span>Favorites</span>
          <span className="hidden tab:inline-block ml-auto text-xs">{stats?.favorites ?? 0}</span>
        </button>
        
        {folders.map((folder) => (
          <button
            key={folder.id}
            onClick={() => setActiveFilter(folder.id)}
            className={`shrink-0 tab:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs tab:text-sm transition-colors whitespace-nowrap ${
              activeFilter === folder.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
            }`}
          >
            <span>{folder.emoji}</span>
            <span className="truncate">{folder.name}</span>
          </button>
        ))}

        <button
          onClick={() => setActiveFilter("deleted")}
          className={`shrink-0 tab:w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs tab:text-sm transition-colors whitespace-nowrap ${
            activeFilter === "deleted" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          <span>Trash</span>
        </button>
      </div>

      <div className="tab:hidden h-4 w-px bg-border mx-1" />

      {/* Right - Thumbnail grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex flex-col tab:flex-row items-stretch tab:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt..."
              className="pl-9 h-10 tab:h-9 bg-background border-border text-sm"
            />
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="flex-1 tab:flex-none text-muted-foreground border-border h-10 tab:h-9">
              <Filter className="h-3.5 w-3.5 mr-1" /> Filter
            </Button>
            <div className="flex border border-border rounded-lg overflow-hidden h-10 tab:h-9 shrink-0">
              <button
                onClick={() => setViewMode("grid")}
                className={`flex-1 tab:px-3 flex items-center justify-center ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <Grid3X3 className="h-4 w-4" />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`flex-1 tab:px-3 flex items-center justify-center ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
              >
                <List className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Bulk actions */}
        <AnimatePresence>
          {selectedIds.size > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="glass-card rounded-lg px-4 py-2 mb-4 flex items-center gap-3"
            >
              <span className="text-sm text-foreground font-medium">{selectedIds.size} selected</span>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" className="border-border">
                    <FolderInput className="h-3.5 w-3.5 mr-1" /> Move to Folder
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="bg-card border-border">
                  {folders.map((f) => (
                    <DropdownMenuItem key={f.id} onClick={() => moveToFolder([...selectedIds], f.id)} className="text-foreground">
                      {f.emoji} {f.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button variant="outline" size="sm" className="border-border text-destructive" onClick={() => softDelete([...selectedIds])}>
                <Trash2 className="h-3.5 w-3.5 mr-1" /> Delete
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setSelectedIds(new Set())}>
                Clear
              </Button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Grid */}
        <div className="flex-1 overflow-y-auto pb-20 tab:pb-0">
          {isLoading ? (
            <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 4k:grid-cols-5 gap-3 tab:gap-4">
              {Array.from({ length: 12 }).map((_, i) => (
                <div key={i} className="glass-card rounded-xl overflow-hidden animate-pulse">
                  <div className="aspect-video bg-muted" />
                  <div className="p-3 space-y-2">
                    <div className="h-3 bg-muted rounded w-3/4" />
                    <div className="h-2 bg-muted rounded w-1/2" />
                  </div>
                </div>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-64 text-center">
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4 opacity-20" />
              <p className="text-muted-foreground text-sm font-medium">No thumbnails here yet</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-1 xs:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 4k:grid-cols-5 gap-3 tab:gap-4" : "space-y-2"}>
              {filtered.map((thumb) => (
                <motion.div
                  key={thumb.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className={`glass-card rounded-xl overflow-hidden group relative cursor-pointer ${
                    selectedIds.has(thumb.id) ? "ring-2 ring-primary" : ""
                  }`}
                  onClick={() => toggleSelect(thumb.id)}
                >
                  <div className="aspect-video bg-muted relative">
                    {thumb.image_url ? (
                      <img src={thumb.image_url} alt={thumb.prompt ?? ""} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs shimmer">
                        Generated thumbnail
                      </div>
                    )}

                    <div className="absolute inset-0 bg-background/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        onClick={(e) => { e.stopPropagation(); hapticFeedback(5); toggleFavorite(thumb.id, thumb.is_favorite); }}
                        className="p-2 rounded-full bg-card/80 hover:bg-card transition-colors"
                      >
                        <Heart className={`h-4 w-4 ${thumb.is_favorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
                      </button>
                      <button 
                        className="flex items-center justify-center bg-gradient-to-br from-[#8B47FF] to-[#6366F1] text-white font-sans text-[13px] font-semibold px-[14px] py-[7px] rounded-lg border-none cursor-pointer transition-all duration-200 hover:-translate-y-[2px] hover:shadow-[0_8px_20px_rgba(139,71,255,0.35)] active:translate-y-0 disabled:opacity-80 disabled:cursor-not-allowed"
                        onClick={(e) => { 
                          e.stopPropagation(); 
                          hapticFeedback(15);
                          if (isFreePlan) { navigate('/pricing'); return; }
                          navigate(`/dashboard/smart-editor?thumbnail_id=${thumb.id}&image_url=${encodeURIComponent(thumb.image_url || '')}`); 
                        }}
                      >
                        {isFreePlan ? <><Lock className="h-3.5 w-3.5 mr-1.5" /> Smart Edit</> : <><Sparkles className="h-3.5 w-3.5 mr-1.5" /> ✨ Smart Edit</>}
                      </button>
                      <button className="p-2 rounded-full bg-card/80 hover:bg-card transition-colors">
                        <Pencil className="h-4 w-4 text-foreground" />
                      </button>
                      {activeFilter === "deleted" ? (
                        <button
                          onClick={(e) => { e.stopPropagation(); restoreThumb(thumb.id); }}
                          className="p-2 rounded-full bg-card/80 hover:bg-card transition-colors"
                        >
                          <RefreshCw className="h-4 w-4 text-foreground" />
                        </button>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="p-2 rounded-full bg-card/80 hover:bg-card transition-colors" onClick={(e) => e.stopPropagation()}>
                              <MoreVertical className="h-4 w-4 text-foreground" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent className="bg-card border-border">
                            <DropdownMenuItem className="text-foreground"><Download className="h-3.5 w-3.5 mr-2" /> Download</DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground" onClick={(e) => { e.stopPropagation(); navigate(`/dashboard/smart-editor?thumbnail_id=${thumb.id}&image_url=${encodeURIComponent(thumb.image_url || '')}`); }}>
                               <Sparkles className="h-3.5 w-3.5 mr-2" /> ✨ Smart Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-foreground"><Pencil className="h-3.5 w-3.5 mr-2" /> Edit with AI</DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive" onClick={() => softDelete([thumb.id])}>
                              <Trash2 className="h-3.5 w-3.5 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>

                    <div className="absolute top-2 left-2 flex gap-1">
                      <span className="px-1.5 py-0.5 text-[10px] rounded bg-muted/80 text-foreground font-medium">
                        {thumb.format_type === "9:16" ? "📱 9:16" : "📺 16:9"}
                      </span>
                      {thumb.model_used && (
                        <span className="px-1.5 py-0.5 text-[10px] rounded bg-primary/80 text-primary-foreground font-medium">
                          {thumb.model_used}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="p-3">
                    <p className="text-xs text-muted-foreground truncate">{thumb.prompt ?? "No prompt"}</p>
                    <p className="text-[10px] text-muted-foreground/60 mt-1">
                      {new Date(thumb.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MyThumbnails;
