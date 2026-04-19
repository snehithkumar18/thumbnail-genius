import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SEOHead from "@/components/SEOHead";
import AuthModal from "@/components/AuthModal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

const NICHES = ["All", "Finance", "Gaming", "Fitness", "Tech", "Travel", "Food", "Motivation", "Education"];

const GalleryPage = () => {
  const [authOpen, setAuthOpen] = useState(false);
  const [filter, setFilter] = useState("All");

  const { data: thumbnails = [], isLoading } = useQuery({
    queryKey: ["gallery", filter],
    queryFn: async () => {
      const query = supabase
        .from("thumbnails")
        .select("id, image_url, prompt, style, model_used, format_type, share_id, created_at")
        .eq("is_deleted", false)
        .not("image_url", "is", null)
        .not("share_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(50);
      const { data } = await query;
      return data || [];
    },
  });

  return (
    <div className="min-h-screen-d bg-background overflow-x-hidden">
      <SEOHead
        title="AI Thumbnail Gallery — Community Creations"
        description="Browse viral YouTube thumbnails created by the ThumbAI community. Get inspired and recreate similar styles."
      />
      <Navbar onOpenAuth={(tab) => { setAuthOpen(true); }} />
      <main className="container mx-auto px-4 sm:px-6 pt-24 pb-16">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-heading font-bold text-foreground mb-3">Community Gallery</h1>
          <p className="text-muted-foreground max-w-lg mx-auto">
            Thumbnails created by creators like you. Get inspired and recreate similar styles.
          </p>
        </div>

        <div className="flex gap-2 justify-center mb-8 flex-wrap">
          {NICHES.map((n) => (
            <button
              key={n}
              onClick={() => setFilter(n)}
              className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-all ${
                filter === n
                  ? "bg-primary/10 border-primary/40 text-primary"
                  : "bg-muted border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        {isLoading ? (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="w-full aspect-video rounded-xl" />
            ))}
          </div>
        ) : thumbnails.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground">No public thumbnails yet. Be the first!</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {thumbnails.map((t) => (
              <div key={t.id} className="break-inside-avoid group">
                <div className="rounded-xl overflow-hidden border border-border bg-card hover:border-primary/30 transition-all">
                  <img
                    src={t.image_url!}
                    alt={t.prompt || "AI thumbnail"}
                    className="w-full object-cover"
                    loading="lazy"
                  />
                  <div className="p-3">
                    <p className="text-xs text-muted-foreground line-clamp-2">{t.prompt}</p>
                    <div className="flex items-center gap-2 mt-2">
                      {t.model_used && (
                        <span className="text-[10px] px-1.5 py-0.5 bg-primary/10 text-primary rounded">{t.model_used}</span>
                      )}
                      <span className="text-[10px] text-muted-foreground">{t.format_type}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
      <Footer />
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} defaultTab="signup" />
    </div>
  );
};

export default GalleryPage;
