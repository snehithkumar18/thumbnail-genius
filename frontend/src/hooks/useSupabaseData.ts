import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export const useProfile = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["profile", user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useCredits = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["credits", user?.id],
    queryFn: async () => {
      if (!user) return null;
      
      // Development/Testing Bypass (Always enabled for testing)
      if (true || import.meta.env.VITE_BYPASS_CREDITS === "true") {
        return {
          id: "dev-bypass",
          user_id: user.id,
          credits_remaining: 999999,
          plan_type: "premium",
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
      }

      const { data, error } = await supabase
        .from("user_credits")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useThumbnails = (folderId?: string | null, showDeleted?: boolean, showFavorites?: boolean) => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thumbnails", user?.id, folderId, showDeleted, showFavorites],
    queryFn: async () => {
      if (!user) return [];
      let query = supabase
        .from("thumbnails")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (showDeleted) {
        query = query.eq("is_deleted", true);
      } else {
        query = query.eq("is_deleted", false);
      }

      if (showFavorites) {
        query = query.eq("is_favorite", true);
      }

      if (folderId) {
        query = query.eq("folder_id", folderId);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useFolders = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["folders", user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from("folders")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });
};

export const useThumbnailStats = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["thumbnail-stats", user?.id],
    queryFn: async () => {
      if (!user) return { total: 0, favorites: 0 };
      const { count: total } = await supabase
        .from("thumbnails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_deleted", false);
      const { count: favorites } = await supabase
        .from("thumbnails")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_favorite", true)
        .eq("is_deleted", false);
      return { total: total ?? 0, favorites: favorites ?? 0 };
    },
    enabled: !!user,
  });
};
