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
    PostgrestVersion: "14.5"
  }
  graphql_public: {
    Tables: {
      [_ in never]: never
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      graphql: {
        Args: {
          extensions?: Json
          operationName?: string
          query?: string
          variables?: Json
        }
        Returns: Json
      }
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
  public: {
    Tables: {
      club_members: {
        Row: {
          club_id: string
          id: string
          jersey_number: number | null
          joined_at: string
          position: string | null
          preferred_foot: string | null
          role: Database["public"]["Enums"]["member_role"]
          status: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Insert: {
          club_id: string
          id?: string
          jersey_number?: number | null
          joined_at?: string
          position?: string | null
          preferred_foot?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id: string
        }
        Update: {
          club_id?: string
          id?: string
          jersey_number?: number | null
          joined_at?: string
          position?: string | null
          preferred_foot?: string | null
          role?: Database["public"]["Enums"]["member_role"]
          status?: Database["public"]["Enums"]["member_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "club_members_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "club_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      clubs: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          join_policy: string
          logo_url: string | null
          name: string
          region: string | null
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          join_policy?: string
          logo_url?: string | null
          name: string
          region?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          join_policy?: string
          logo_url?: string | null
          name?: string
          region?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "clubs_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comment_mentions: {
        Row: {
          comment_id: string
          user_id: string
        }
        Insert: {
          comment_id: string
          user_id: string
        }
        Update: {
          comment_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comment_mentions_comment_id_fkey"
            columns: ["comment_id"]
            isOneToOne: false
            referencedRelation: "comments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comment_mentions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      comments: {
        Row: {
          author_id: string
          content: string
          created_at: string
          id: string
          post_id: string
        }
        Insert: {
          author_id: string
          content: string
          created_at?: string
          id?: string
          post_id: string
        }
        Update: {
          author_id?: string
          content?: string
          created_at?: string
          id?: string
          post_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "comments_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "comments_post_id_fkey"
            columns: ["post_id"]
            isOneToOne: false
            referencedRelation: "posts"
            referencedColumns: ["id"]
          },
        ]
      }
      match_attendances: {
        Row: {
          id: string
          is_waitlist: boolean
          match_id: string
          responded_at: string
          status: Database["public"]["Enums"]["attend_status"]
          user_id: string
        }
        Insert: {
          id?: string
          is_waitlist?: boolean
          match_id: string
          responded_at?: string
          status: Database["public"]["Enums"]["attend_status"]
          user_id: string
        }
        Update: {
          id?: string
          is_waitlist?: boolean
          match_id?: string
          responded_at?: string
          status?: Database["public"]["Enums"]["attend_status"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_attendances_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_attendances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_quarter_scores: {
        Row: {
          match_id: string
          quarter: number
          score: number
          team: number
        }
        Insert: {
          match_id: string
          quarter: number
          score?: number
          team: number
        }
        Update: {
          match_id?: string
          quarter?: number
          score?: number
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_quarter_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_quarter_stats: {
        Row: {
          assists: number
          goals: number
          match_id: string
          quarter: number
          user_id: string
        }
        Insert: {
          assists?: number
          goals?: number
          match_id: string
          quarter: number
          user_id: string
        }
        Update: {
          assists?: number
          goals?: number
          match_id?: string
          quarter?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_quarter_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_quarter_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_results: {
        Row: {
          match_id: string
          note: string | null
          opponent_score: number
          our_score: number
        }
        Insert: {
          match_id: string
          note?: string | null
          opponent_score?: number
          our_score?: number
        }
        Update: {
          match_id?: string
          note?: string | null
          opponent_score?: number
          our_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_results_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: true
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_stats: {
        Row: {
          assists: number
          goals: number
          id: string
          match_id: string
          user_id: string
        }
        Insert: {
          assists?: number
          goals?: number
          id?: string
          match_id: string
          user_id: string
        }
        Update: {
          assists?: number
          goals?: number
          id?: string
          match_id?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_stats_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_stats_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      match_team_defs: {
        Row: {
          match_id: string
          name: string
          team: number
        }
        Insert: {
          match_id: string
          name: string
          team: number
        }
        Update: {
          match_id?: string
          name?: string
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_team_defs_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_team_scores: {
        Row: {
          match_id: string
          score: number
          team: number
        }
        Insert: {
          match_id: string
          score?: number
          team: number
        }
        Update: {
          match_id?: string
          score?: number
          team?: number
        }
        Relationships: [
          {
            foreignKeyName: "match_team_scores_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
        ]
      }
      match_teams: {
        Row: {
          match_id: string
          team: number
          user_id: string
        }
        Insert: {
          match_id: string
          team: number
          user_id: string
        }
        Update: {
          match_id?: string
          team?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "match_teams_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "match_teams_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      matches: {
        Row: {
          capacity: number | null
          club_id: string
          created_at: string
          created_by: string
          fee: number
          id: string
          location_lat: number | null
          location_lng: number | null
          location_name: string | null
          match_date: string
          opponent: string | null
          status: Database["public"]["Enums"]["match_status"]
          title: string
          type: Database["public"]["Enums"]["match_type"]
          vote_deadline: string | null
        }
        Insert: {
          capacity?: number | null
          club_id: string
          created_at?: string
          created_by: string
          fee?: number
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          match_date: string
          opponent?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          title: string
          type?: Database["public"]["Enums"]["match_type"]
          vote_deadline?: string | null
        }
        Update: {
          capacity?: number | null
          club_id?: string
          created_at?: string
          created_by?: string
          fee?: number
          id?: string
          location_lat?: number | null
          location_lng?: number | null
          location_name?: string | null
          match_date?: string
          opponent?: string | null
          status?: Database["public"]["Enums"]["match_status"]
          title?: string
          type?: Database["public"]["Enums"]["match_type"]
          vote_deadline?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "matches_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "matches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          body: string | null
          club_id: string | null
          created_at: string
          id: string
          link: string | null
          read_at: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          body?: string | null
          club_id?: string | null
          created_at?: string
          id?: string
          link?: string | null
          read_at?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          club_id: string
          created_at: string
          created_by: string
          id: string
          match_id: string | null
          paid_at: string | null
          period: string | null
          requested_at: string | null
          status: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          user_id: string
        }
        Insert: {
          amount: number
          club_id: string
          created_at?: string
          created_by: string
          id?: string
          match_id?: string | null
          paid_at?: string | null
          period?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type: Database["public"]["Enums"]["payment_type"]
          user_id: string
        }
        Update: {
          amount?: number
          club_id?: string
          created_at?: string
          created_by?: string
          id?: string
          match_id?: string | null
          paid_at?: string | null
          period?: string | null
          requested_at?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          type?: Database["public"]["Enums"]["payment_type"]
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_match_id_fkey"
            columns: ["match_id"]
            isOneToOne: false
            referencedRelation: "matches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      posts: {
        Row: {
          author_id: string
          category: Database["public"]["Enums"]["post_category"]
          club_id: string
          content: string | null
          created_at: string
          id: string
          title: string
        }
        Insert: {
          author_id: string
          category?: Database["public"]["Enums"]["post_category"]
          club_id: string
          content?: string | null
          created_at?: string
          id?: string
          title: string
        }
        Update: {
          author_id?: string
          category?: Database["public"]["Enums"]["post_category"]
          club_id?: string
          content?: string | null
          created_at?: string
          id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "posts_author_id_fkey"
            columns: ["author_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "posts_club_id_fkey"
            columns: ["club_id"]
            isOneToOne: false
            referencedRelation: "clubs"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          name: string
          phone: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          name: string
          phone?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          name?: string
          phone?: string | null
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          p256dh: string
          user_id: string
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          p256dh: string
          user_id: string
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          p256dh?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      can_manage_club: { Args: { _club_id: string }; Returns: boolean }
      can_manage_match: { Args: { _club_id: string }; Returns: boolean }
      is_club_member: { Args: { _club_id: string }; Returns: boolean }
      is_club_owner: { Args: { _club_id: string }; Returns: boolean }
      is_full_member: { Args: { _club_id: string }; Returns: boolean }
      notify_users: {
        Args: {
          _body: string
          _club_id: string
          _link: string
          _title: string
          _type: string
          _user_ids: string[]
        }
        Returns: undefined
      }
      request_payment: { Args: { _payment_id: string }; Returns: undefined }
      set_payment_status: {
        Args: { _paid: boolean; _payment_id: string }
        Returns: undefined
      }
      shares_club_with: { Args: { _user: string }; Returns: boolean }
      transfer_presidency: {
        Args: { _club_id: string; _to_user: string }
        Returns: undefined
      }
      vote_attendance: {
        Args: {
          _match_id: string
          _status: Database["public"]["Enums"]["attend_status"]
        }
        Returns: undefined
      }
      withdraw_payment_request: {
        Args: { _payment_id: string }
        Returns: undefined
      }
    }
    Enums: {
      attend_status: "attending" | "absent" | "maybe"
      match_status: "scheduled" | "closed" | "finished" | "canceled"
      match_type: "internal" | "friendly" | "league"
      member_role:
        | "president"
        | "treasurer"
        | "manager"
        | "coach"
        | "member"
        | "guest"
      member_status: "pending" | "active" | "inactive" | "rejected"
      payment_status: "unpaid" | "paid"
      payment_type: "monthly_due" | "match_fee" | "other"
      post_category: "notice" | "free" | "gallery"
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
  graphql_public: {
    Enums: {},
  },
  public: {
    Enums: {
      attend_status: ["attending", "absent", "maybe"],
      match_status: ["scheduled", "closed", "finished", "canceled"],
      match_type: ["internal", "friendly", "league"],
      member_role: [
        "president",
        "treasurer",
        "manager",
        "coach",
        "member",
        "guest",
      ],
      member_status: ["pending", "active", "inactive", "rejected"],
      payment_status: ["unpaid", "paid"],
      payment_type: ["monthly_due", "match_fee", "other"],
      post_category: ["notice", "free", "gallery"],
    },
  },
} as const
