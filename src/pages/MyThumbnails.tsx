import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, SortAsc, Grid3X3, List, FolderOpen, Star, Trash2, Plus, Heart, Pencil, MoreVertical, Download, FolderInput, X, Check, RefreshCw } from "lucide-react";
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
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

type ViewFilter = "all" | "favorites" | "deleted" | string;

const MyThumbnails = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
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
      next.has(id) ? next.delete(id) : next.add(id);
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
    <div className="flex gap-6 h-[calc(100vh-60px-48px)]">
      {/* Left - Folder navigation */}
      <div className="w-[220px] shrink-0 space-y-1 overflow-y-auto hidden md:block">
        <button
          onClick={() => setActiveFilter("all")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeFilter === "all" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <FolderOpen className="h-4 w-4" />
          <span>All Thumbnails</span>
          <span className="ml-auto text-xs">{stats?.total ?? 0}</span>
        </button>
        <button
          onClick={() => setActiveFilter("favorites")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeFilter === "favorites" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Star className="h-4 w-4" />
          <span>Favorites</span>
          <span className="ml-auto text-xs">{stats?.favorites ?? 0}</span>
        </button>
        <button
          onClick={() => setActiveFilter("deleted")}
          className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
            activeFilter === "deleted" ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
          }`}
        >
          <Trash2 className="h-4 w-4" />
          <span>Recently Deleted</span>
        </button>

        <div className="pt-4">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground px-3 mb-2">My Folders</p>
          {folders.map((folder) => (
            <button
              key={folder.id}
              onClick={() => setActiveFilter(folder.id)}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors ${
                activeFilter === folder.id ? "bg-primary/10 text-primary font-medium" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
            >
              <span>{folder.emoji}</span>
              <span className="truncate">{folder.name}</span>
              <span className="ml-auto text-xs">{folder.thumbnail_count}</span>
            </button>
          ))}

          {creatingFolder ? (
            <div className="flex items-center gap-1 px-2 mt-1">
              <Input
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder="Folder name"
                className="h-8 text-sm bg-background border-border"
                autoFocus
                onKeyDown={(e) => e.key === "Enter" && createFolder()}
              />
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={createFolder}>
                <Check className="h-3 w-3" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => setCreatingFolder(false)}>
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <button
              onClick={() => setCreatingFolder(true)}
              className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-primary hover:bg-primary/5 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>New Folder</span>
            </button>
          )}
        </div>
      </div>

      {/* Right - Thumbnail grid */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Toolbar */}
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by prompt..."
              className="pl-9 h-9 bg-background border-border text-sm"
            />
          </div>
          <Button variant="outline" size="sm" className="text-muted-foreground border-border">
            <Filter className="h-3.5 w-3.5 mr-1" /> Filter
          </Button>
          <Button variant="outline" size="sm" className="text-muted-foreground border-border">
            <SortAsc className="h-3.5 w-3.5 mr-1" /> Sort
          </Button>
          <div className="flex border border-border rounded-lg overflow-hidden">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 ${viewMode === "grid" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              <Grid3X3 className="h-4 w-4" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-1.5 ${viewMode === "list" ? "bg-muted text-foreground" : "text-muted-foreground"}`}
            >
              <List className="h-4 w-4" />
            </button>
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
        <div className="flex-1 overflow-y-auto">
          {isLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
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
              <FolderOpen className="h-12 w-12 text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No thumbnails here yet</p>
            </div>
          ) : (
            <div className={viewMode === "grid" ? "grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4" : "space-y-2"}>
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
                        onClick={(e) => { e.stopPropagation(); toggleFavorite(thumb.id, thumb.is_favorite); }}
                        className="p-2 rounded-full bg-card/80 hover:bg-card transition-colors"
                      >
                        <Heart className={`h-4 w-4 ${thumb.is_favorite ? "fill-destructive text-destructive" : "text-foreground"}`} />
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
