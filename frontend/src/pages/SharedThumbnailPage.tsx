import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import SEOHead from "@/components/SEOHead";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Zap } from "lucide-react";

const SharedThumbnailPage = () => {
  const { shareId } = useParams<{ shareId: string }>();
  const navigate = useNavigate();

  const { data: thumbnail, isLoading } = useQuery({
    queryKey: ["shared-thumbnail", shareId],
    queryFn: async () => {
      if (!shareId) return null;
      const { data } = await supabase
        .from("thumbnails")
        .select("*")
        .eq("share_id", shareId)
        .eq("is_deleted", false)
        .single();
      return data;
    },
    enabled: !!shareId,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen-d bg-background flex items-center justify-center px-4">
        <Skeleton className="w-full max-w-2xl aspect-video rounded-xl" />
      </div>
    );
  }

  if (!thumbnail) {
    return (
      <div className="min-h-screen bg-background flex flex-col items-center justify-center gap-4">
        <p className="text-muted-foreground">Thumbnail not found</p>
        <Button onClick={() => navigate("/")}>Go Home</Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen-d bg-background">
      <SEOHead
        title={thumbnail.prompt ? `${thumbnail.prompt.slice(0, 50)}... — Thumbly` : "AI Thumbnail — Thumbly"}
        description={thumbnail.prompt || "AI-generated YouTube thumbnail created with Thumbly"}
        image={thumbnail.image_url || undefined}
      />
      <div className="container mx-auto px-4 sm:px-6 py-12 max-w-3xl">
        <div className="text-center mb-8">
          <div className="flex items-center justify-center gap-2 mb-6 cursor-pointer" onClick={() => navigate("/")}>
            <Zap className="h-6 w-6 text-primary fill-primary" />
            <span className="text-xl font-heading font-bold text-foreground">Thumbly</span>
          </div>
        </div>

        <div className="rounded-2xl overflow-hidden border border-border bg-card shadow-xl">
          {thumbnail.image_url && (
            <img src={thumbnail.image_url} alt={thumbnail.prompt || "Thumbnail"} className="w-full" />
          )}
        </div>

        {thumbnail.prompt && (
          <div className="mt-6 bg-card border border-border rounded-xl p-4">
            <p className="text-xs text-muted-foreground mb-1">Prompt</p>
            <p className="text-sm text-foreground">{thumbnail.prompt}</p>
          </div>
        )}

        <div className="flex items-center justify-between mt-6">
          <div className="flex gap-2">
            {thumbnail.model_used && (
              <span className="text-xs px-2 py-1 bg-primary/10 text-primary rounded-full">{thumbnail.model_used}</span>
            )}
            <span className="text-xs px-2 py-1 bg-muted text-muted-foreground rounded-full">{thumbnail.format_type}</span>
          </div>
          <span className="text-xs text-muted-foreground">
            {new Date(thumbnail.created_at).toLocaleDateString()}
          </span>
        </div>

        <div className="mt-12 text-center space-y-4">
          <p className="text-muted-foreground text-sm">Made with Thumbly</p>
          <Button onClick={() => navigate("/")} size="lg" variant="hero">
            Create yours — Start for $2 →
          </Button>
        </div>
      </div>
    </div>
  );
};

export default SharedThumbnailPage;
