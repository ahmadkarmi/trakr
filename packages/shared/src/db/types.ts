export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          org_id: string
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id: string
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "activity_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audit_photos: {
        Row: {
          audit_id: string
          filename: string
          id: string
          section_id: string | null
          uploaded_at: string
          uploaded_by: string
          url: string
        }
        Insert: {
          audit_id: string
          filename: string
          id?: string
          section_id?: string | null
          uploaded_at?: string
          uploaded_by: string
          url: string
        }
        Update: {
          audit_id?: string
          filename?: string
          id?: string
          section_id?: string | null
          uploaded_at?: string
          uploaded_by?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "audit_photos_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audit_photos_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      auditor_branch_assignments: {
        Row: {
          branch_id: string
          created_at: string
          created_by: string
          id: string
          org_id: string
          period_end: string
          period_start: string
          user_id: string
        }
        Insert: {
          branch_id: string
          created_at?: string
          created_by: string
          id?: string
          org_id: string
          period_end: string
          period_start: string
          user_id: string
        }
        Update: {
          branch_id?: string
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string
          period_end?: string
          period_start?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "auditor_branch_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_branch_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_branch_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_branch_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          approval_name: string | null
          approval_note: string | null
          approval_signature_type: string | null
          approval_signature_url: string | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          assigned_to: string | null
          branch_id: string
          created_at: string
          due_at: string
          id: string
          is_archived: boolean
          na_reasons: Json
          org_id: string
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_note: string | null
          responses: Json
          section_comments: Json
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          submitted_by: string | null
          survey_id: string
          survey_version: number
          updated_at: string
        }
        Insert: {
          approval_name?: string | null
          approval_note?: string | null
          approval_signature_type?: string | null
          approval_signature_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          branch_id: string
          created_at?: string
          due_at: string
          id?: string
          is_archived?: boolean
          na_reasons?: Json
          org_id: string
          period_end: string
          period_start: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_note?: string | null
          responses?: Json
          section_comments?: Json
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          survey_id: string
          survey_version?: number
          updated_at?: string
        }
        Update: {
          approval_name?: string | null
          approval_note?: string | null
          approval_signature_type?: string | null
          approval_signature_url?: string | null
          approved_at?: string | null
          approved_by?: string | null
          archived_at?: string | null
          assigned_to?: string | null
          branch_id?: string
          created_at?: string
          due_at?: string
          id?: string
          is_archived?: boolean
          na_reasons?: Json
          org_id?: string
          period_end?: string
          period_start?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_note?: string | null
          responses?: Json
          section_comments?: Json
          status?: Database["public"]["Enums"]["audit_status"]
          submitted_at?: string | null
          submitted_by?: string | null
          survey_id?: string
          survey_version?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "audits_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_rejected_by_fkey"
            columns: ["rejected_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          manager_id: string | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          manager_id?: string | null
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "branches_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branches_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          id: string
          name: string
          time_zone: string
          updated_at: string
          week_starts_on: number
          gating_policy: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          time_zone?: string
          updated_at?: string
          week_starts_on?: number
          gating_policy?: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          time_zone?: string
          updated_at?: string
          week_starts_on?: number
          gating_policy?: string
        }
        Relationships: []
      }
      surveys: {
        Row: {
          created_at: string
          description: string | null
          frequency: Database["public"]["Enums"]["audit_frequency"]
          id: string
          is_active: boolean
          org_id: string
          title: string
          updated_at: string
          version: number
        }
        Insert: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["audit_frequency"]
          id?: string
          is_active?: boolean
          org_id: string
          title: string
          updated_at?: string
          version?: number
        }
        Update: {
          created_at?: string
          description?: string | null
          frequency?: Database["public"]["Enums"]["audit_frequency"]
          id?: string
          is_active?: boolean
          org_id?: string
          title?: string
          updated_at?: string
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_questions: {
        Row: {
          id: string
          is_weighted: boolean
          no_weight: number | null
          order_num: number
          question_text: string
          question_type: string
          required: boolean
          section_id: string
          survey_id: string
          yes_weight: number | null
        }
        Insert: {
          id?: string
          is_weighted?: boolean
          no_weight?: number | null
          order_num?: number
          question_text: string
          question_type?: string
          required?: boolean
          section_id: string
          survey_id: string
          yes_weight?: number | null
        }
        Update: {
          id?: string
          is_weighted?: boolean
          no_weight?: number | null
          order_num?: number
          question_text?: string
          question_type?: string
          required?: boolean
          section_id?: string
          survey_id?: string
          yes_weight?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "survey_questions_section_id_fkey"
            columns: ["section_id"]
            isOneToOne: false
            referencedRelation: "survey_sections"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "survey_questions_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      survey_sections: {
        Row: {
          description: string | null
          id: string
          order_num: number
          survey_id: string
          title: string
        }
        Insert: {
          description?: string | null
          id?: string
          order_num?: number
          survey_id: string
          title: string
        }
        Update: {
          description?: string | null
          id?: string
          order_num?: number
          survey_id?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "survey_sections_survey_id_fkey"
            columns: ["survey_id"]
            isOneToOne: false
            referencedRelation: "surveys"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          branch_id: string | null
          created_at: string
          email: string
          full_name: string | null
          avatar_url: string | null
          signature_url: string | null
          id: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          avatar_url?: string | null
          signature_url?: string | null
          id?: string
          org_id: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          avatar_url?: string | null
          signature_url?: string | null
          id?: string
          org_id?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "users_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_assignments: {
        Row: {
          created_at: string
          created_by: string
          id: string
          org_id: string
          user_id: string
          zone_id: string
        }
        Insert: {
          created_at?: string
          created_by: string
          id?: string
          org_id: string
          user_id: string
          zone_id: string
        }
        Update: {
          created_at?: string
          created_by?: string
          id?: string
          org_id?: string
          user_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_assignments_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_assignments_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zone_branches: {
        Row: {
          branch_id: string
          zone_id: string
        }
        Insert: {
          branch_id: string
          zone_id: string
        }
        Update: {
          branch_id?: string
          zone_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "zone_branches_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "zone_branches_zone_id_fkey"
            columns: ["zone_id"]
            isOneToOne: false
            referencedRelation: "zones"
            referencedColumns: ["id"]
          },
        ]
      }
      zones: {
        Row: {
          created_at: string
          description: string | null
          id: string
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          id?: string
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          org_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "zones_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      ensure_current_period_scheduling: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
    }
    Enums: {
      audit_frequency: "DAILY" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "UNLIMITED"
      audit_status:
        | "DRAFT"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
      user_role: "ADMIN" | "BRANCH_MANAGER" | "AUDITOR"
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
      audit_frequency: ["DAILY", "WEEKLY", "MONTHLY", "QUARTERLY", "UNLIMITED"],
      audit_status: [
        "DRAFT",
        "IN_PROGRESS",
        "COMPLETED",
        "SUBMITTED",
        "APPROVED",
        "REJECTED",
      ],
      user_role: ["ADMIN", "BRANCH_MANAGER", "AUDITOR"],
    },
  },
} as const
