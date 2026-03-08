export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.4"
  }
  public: {
    Tables: {
      ab_tests: {
        Row: {
          created_at: string
          id: string
          share_id: string | null
          thumb_a_url: string
          thumb_b_url: string
          title: string | null
          user_id: string
          votes_a: number
          votes_b: number
        }
        Insert: {
          created_at?: string
          id?: string
          share_id?: string | null
          thumb_a_url: string
          thumb_b_url: string
          title?: string | null
          user_id: string
          votes_a?: number
          votes_b?: number
        }
        Update: {
          created_at?: string
          id?: string
          share_id?: string | null
          thumb_a_url?: string
          thumb_b_url?: string
          title?: string | null
          user_id?: string
          votes_a?: number
          votes_b?: number
        }
        Relationships: []
      }
      ab_votes: {
        Row: {
          choice: string
          created_at: string
          id: string
          test_id: string
          voter_fingerprint: string
        }
        Insert: {
          choice: string
          created_at?: string
          id?: string
          test_id: string
          voter_fingerprint: string
        }
        Update: {
          choice?: string
          created_at?: string
          id?: string
          test_id?: string
          voter_fingerprint?: string
        }
        Relationships: [
          {
            foreignKeyName: "ab_votes_test_id_fkey"
            columns: ["test_id"]
            isOneToOne: false
            referencedRelation: "ab_tests"
            referencedColumns: ["id"]
          },
        ]
      }
      brand_kits: {
        Row: {
          created_at: string
          font_style: string | null
          frame_style: string | null
          id: string
          is_active: boolean
          kit_name: string
          logo_url: string | null
          primary_color: string | null
          secondary_color: string | null
          text_color: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          font_style?: string | null
          frame_style?: string | null
          id?: string
          is_active?: boolean
          kit_name: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          font_style?: string | null
          frame_style?: string | null
          id?: string
          is_active?: boolean
          kit_name?: string
          logo_url?: string | null
          primary_color?: string | null
          secondary_color?: string | null
          text_color?: string | null
          user_id?: string
        }
        Relationships: []
      }
      credit_transactions: {
        Row: {
          action_type: string
          created_at: string
          credits_deducted: number
          id: string
          model_used: string | null
          thumbnail_id: string | null
          user_id: string
        }
        Insert: {
          action_type: string
          created_at?: string
          credits_deducted: number
          id?: string
          model_used?: string | null
          thumbnail_id?: string | null
          user_id: string
        }
        Update: {
          action_type?: string
          created_at?: string
          credits_deducted?: number
          id?: string
          model_used?: string | null
          thumbnail_id?: string | null
          user_id?: string
        }
        Relationships: []
      }
      faces: {
        Row: {
          created_at: string
          face_url: string
          id: string
          label: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          face_url: string
          id?: string
          label?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          face_url?: string
          id?: string
          label?: string | null
          user_id?: string
        }
        Relationships: []
      }
      folders: {
        Row: {
          created_at: string
          emoji: string
          id: string
          name: string
          thumbnail_count: number
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          emoji?: string
          id?: string
          name: string
          thumbnail_count?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          emoji?: string
          id?: string
          name?: string
          thumbnail_count?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      payment_events: {
        Row: {
          amount: number
          created_at: string
          credits_added: number | null
          currency: string
          dodo_payment_id: string | null
          event_type: string
          id: string
          plan_type: Database["public"]["Enums"]["plan_type"] | null
          status: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          credits_added?: number | null
          currency?: string
          dodo_payment_id?: string | null
          event_type: string
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          status?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          credits_added?: number | null
          currency?: string
          dodo_payment_id?: string | null
          event_type?: string
          id?: string
          plan_type?: Database["public"]["Enums"]["plan_type"] | null
          status?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          niche_category: string | null
          onboarding_complete: boolean
          plan_type: Database["public"]["Enums"]["plan_type"]
          user_id: string
          username: string | null
          youtube_channel_name: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          niche_category?: string | null
          onboarding_complete?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"]
          user_id: string
          username?: string | null
          youtube_channel_name?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          niche_category?: string | null
          onboarding_complete?: boolean
          plan_type?: Database["public"]["Enums"]["plan_type"]
          user_id?: string
          username?: string | null
          youtube_channel_name?: string | null
        }
        Relationships: []
      }
      referrals: {
        Row: {
          created_at: string
          credits_awarded: number
          id: string
          referee_id: string | null
          referrer_id: string
          status: string
        }
        Insert: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referee_id?: string | null
          referrer_id: string
          status?: string
        }
        Update: {
          created_at?: string
          credits_awarded?: number
          id?: string
          referee_id?: string | null
          referrer_id?: string
          status?: string
        }
        Relationships: []
      }
      thumbnails: {
        Row: {
          created_at: string
          deleted_at: string | null
          enhanced_prompt: string | null
          folder_id: string | null
          format_type: string
          generation_time_ms: number | null
          id: string
          image_url: string | null
          is_deleted: boolean
          is_favorite: boolean
          model_used: string | null
          prompt: string | null
          share_id: string | null
          style: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          enhanced_prompt?: string | null
          folder_id?: string | null
          format_type?: string
          generation_time_ms?: number | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_favorite?: boolean
          model_used?: string | null
          prompt?: string | null
          share_id?: string | null
          style?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          enhanced_prompt?: string | null
          folder_id?: string | null
          format_type?: string
          generation_time_ms?: number | null
          id?: string
          image_url?: string | null
          is_deleted?: boolean
          is_favorite?: boolean
          model_used?: string | null
          prompt?: string | null
          share_id?: string | null
          style?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "thumbnails_folder_id_fkey"
            columns: ["folder_id"]
            isOneToOne: false
            referencedRelation: "folders"
            referencedColumns: ["id"]
          },
        ]
      }
      trending_cache: {
        Row: {
          content: Json
          id: string
          niche: string
          updated_at: string
        }
        Insert: {
          content?: Json
          id?: string
          niche?: string
          updated_at?: string
        }
        Update: {
          content?: Json
          id?: string
          niche?: string
          updated_at?: string
        }
        Relationships: []
      }
      user_credits: {
        Row: {
          credits_remaining: number
          credits_used_this_month: number
          credits_used_total: number
          id: string
          lifetime_credits_purchased: number
          monthly_reset_date: string
          plan_type: Database["public"]["Enums"]["plan_type"]
          rollover_credits: number
          user_id: string
        }
        Insert: {
          credits_remaining?: number
          credits_used_this_month?: number
          credits_used_total?: number
          id?: string
          lifetime_credits_purchased?: number
          monthly_reset_date?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          rollover_credits?: number
          user_id: string
        }
        Update: {
          credits_remaining?: number
          credits_used_this_month?: number
          credits_used_total?: number
          id?: string
          lifetime_credits_purchased?: number
          monthly_reset_date?: string
          plan_type?: Database["public"]["Enums"]["plan_type"]
          rollover_credits?: number
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      plan_type: "free" | "creator" | "pro" | "studio"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      plan_type: ["free", "creator", "pro", "studio"],
    },
  },
} as const
