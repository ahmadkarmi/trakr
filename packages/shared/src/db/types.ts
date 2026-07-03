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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      activity_logs: {
        Row: {
          action: string
          branch_id: string | null
          created_at: string
          details: string | null
          entity_id: string | null
          entity_type: string | null
          id: string
          org_id: string
          survey_id: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          branch_id?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id: string
          survey_id?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          branch_id?: string | null
          created_at?: string
          details?: string | null
          entity_id?: string | null
          entity_type?: string | null
          id?: string
          org_id?: string
          survey_id?: string | null
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
      app_config: {
        Row: {
          key: string
          value: string
        }
        Insert: {
          key: string
          value: string
        }
        Update: {
          key?: string
          value?: string
        }
        Relationships: []
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
      auditor_assignments: {
        Row: {
          branch_ids: string[] | null
          created_at: string | null
          id: string
          org_id: string | null
          updated_at: string | null
          user_id: string
          zone_ids: string[] | null
        }
        Insert: {
          branch_ids?: string[] | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          updated_at?: string | null
          user_id: string
          zone_ids?: string[] | null
        }
        Update: {
          branch_ids?: string[] | null
          created_at?: string | null
          id?: string
          org_id?: string | null
          updated_at?: string | null
          user_id?: string
          zone_ids?: string[] | null
        }
        Relationships: [
          {
            foreignKeyName: "auditor_assignments_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "auditor_assignments_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
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
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          created_origin: string | null
          due_at: string
          id: string
          is_archived: boolean
          na_reasons: Json
          org_id: string
          override_notes: Json
          override_scores: Json
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_note: string | null
          responses: Json
          section_comments: Json
          started_at: string | null
          started_by: string | null
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
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_origin?: string | null
          due_at: string
          id?: string
          is_archived?: boolean
          na_reasons?: Json
          org_id: string
          override_notes?: Json
          override_scores?: Json
          period_end: string
          period_start: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_note?: string | null
          responses?: Json
          section_comments?: Json
          started_at?: string | null
          started_by?: string | null
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
          completed_at?: string | null
          completed_by?: string | null
          created_at?: string
          created_by?: string | null
          created_origin?: string | null
          due_at?: string
          id?: string
          is_archived?: boolean
          na_reasons?: Json
          org_id?: string
          override_notes?: Json
          override_scores?: Json
          period_end?: string
          period_start?: string
          rejected_at?: string | null
          rejected_by?: string | null
          rejection_note?: string | null
          responses?: Json
          section_comments?: Json
          started_at?: string | null
          started_by?: string | null
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
      branch_manager_assignments: {
        Row: {
          assigned_at: string | null
          assigned_by: string | null
          branch_id: string
          created_at: string | null
          id: string
          manager_id: string
          updated_at: string | null
        }
        Insert: {
          assigned_at?: string | null
          assigned_by?: string | null
          branch_id: string
          created_at?: string | null
          id?: string
          manager_id: string
          updated_at?: string | null
        }
        Update: {
          assigned_at?: string | null
          assigned_by?: string | null
          branch_id?: string
          created_at?: string | null
          id?: string
          manager_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "branch_manager_assignments_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_manager_assignments_branch_id_fkey"
            columns: ["branch_id"]
            isOneToOne: false
            referencedRelation: "branches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "branch_manager_assignments_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      branches: {
        Row: {
          address: string | null
          created_at: string
          id: string
          is_active: boolean
          manager_id: string | null
          name: string
          org_id: string
          updated_at: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
          manager_id?: string | null
          name: string
          org_id: string
          updated_at?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          id?: string
          is_active?: boolean
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
      data_access_audit: {
        Row: {
          action: string
          created_at: string
          export_scope: Json | null
          id: string
          org_id: string
          reason: string | null
          user_id: string | null
        }
        Insert: {
          action?: string
          created_at?: string
          export_scope?: Json | null
          id?: string
          org_id: string
          reason?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string
          export_scope?: Json | null
          id?: string
          org_id?: string
          reason?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_access_audit_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_access_audit_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          action_completed_at: string | null
          action_type: string | null
          created_at: string
          id: string
          is_read: boolean
          link: string | null
          message: string
          read_at: string | null
          related_id: string | null
          requires_action: boolean | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          action_completed_at?: string | null
          action_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message: string
          read_at?: string | null
          related_id?: string | null
          requires_action?: boolean | null
          title: string
          type: string
          user_id: string
        }
        Update: {
          action_completed_at?: string | null
          action_type?: string | null
          created_at?: string
          id?: string
          is_read?: boolean
          link?: string | null
          message?: string
          read_at?: string | null
          related_id?: string | null
          requires_action?: boolean | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          created_at: string
          gating_policy: string | null
          id: string
          name: string
          time_zone: string
          updated_at: string
          week_starts_on: number
        }
        Insert: {
          created_at?: string
          gating_policy?: string | null
          id?: string
          name: string
          time_zone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Update: {
          created_at?: string
          gating_policy?: string | null
          id?: string
          name?: string
          time_zone?: string
          updated_at?: string
          week_starts_on?: number
        }
        Relationships: []
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
          version: number
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
          version?: number
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
          version?: number
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
          version: number
        }
        Insert: {
          description?: string | null
          id?: string
          order_num?: number
          survey_id: string
          title: string
          version?: number
        }
        Update: {
          description?: string | null
          id?: string
          order_num?: number
          survey_id?: string
          title?: string
          version?: number
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
      surveys: {
        Row: {
          applicable_branch_ids: string[] | null
          created_at: string
          created_by: string | null
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
          applicable_branch_ids?: string[] | null
          created_at?: string
          created_by?: string | null
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
          applicable_branch_ids?: string[] | null
          created_at?: string
          created_by?: string | null
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
            foreignKeyName: "surveys_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "surveys_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      user_invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          id: string
          invitation_token: string
          invited_by: string | null
          org_id: string
          role: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at?: string
          id?: string
          invitation_token: string
          invited_by?: string | null
          org_id: string
          role: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          id?: string
          invitation_token?: string
          invited_by?: string | null
          org_id?: string
          role?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_invitations_org_id_fkey"
            columns: ["org_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          auth_user_id: string | null
          avatar_url: string | null
          branch_id: string | null
          created_at: string
          email: string
          email_verified: boolean
          full_name: string | null
          id: string
          is_active: boolean
          last_seen_at: string | null
          org_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          signature_url: string | null
          updated_at: string
        }
        Insert: {
          auth_user_id?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          org_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          signature_url?: string | null
          updated_at?: string
        }
        Update: {
          auth_user_id?: string | null
          avatar_url?: string | null
          branch_id?: string | null
          created_at?: string
          email?: string
          email_verified?: boolean
          full_name?: string | null
          id?: string
          is_active?: boolean
          last_seen_at?: string | null
          org_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          signature_url?: string | null
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
      _actor_user_id: { Args: never; Returns: string }
      _user_is_admin_for_org: { Args: { p_org_id: string }; Returns: boolean }
      _user_org_match: { Args: { p_org_id: string }; Returns: boolean }
      branch_has_auditor_coverage: {
        Args: { p_branch_id: string }
        Returns: boolean
      }
      can_manage_auditor_assignment: {
        Args: { target_user_id: string }
        Returns: boolean
      }
      create_audit_with_cycle_guard: {
        Args: {
          p_assigned_to: string
          p_branch_id: string
          p_org_id: string
          p_survey_id: string
        }
        Returns: {
          approval_name: string | null
          approval_note: string | null
          approval_signature_type: string | null
          approval_signature_url: string | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          assigned_to: string | null
          branch_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          created_origin: string | null
          due_at: string
          id: string
          is_archived: boolean
          na_reasons: Json
          org_id: string
          override_notes: Json
          override_scores: Json
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_note: string | null
          responses: Json
          section_comments: Json
          started_at: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          submitted_by: string | null
          survey_id: string
          survey_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "audits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      current_app_user_id: { Args: never; Returns: string }
      current_user_id: { Args: never; Returns: string }
      current_user_org_id: { Args: never; Returns: string }
      current_user_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      ensure_current_period_scheduling: { Args: never; Returns: undefined }
      fn_branch_covered_after_change: {
        Args: {
          p_branch_id: string
          p_new_branch_ids: string[]
          p_new_zone_ids: string[]
          p_user_id: string
        }
        Returns: boolean
      }
      generate_invitation_token: { Args: never; Returns: string }
      get_org_config: { Args: { p_org_id: string }; Returns: Json }
      get_org_period_bounds: {
        Args: {
          p_frequency: Database["public"]["Enums"]["audit_frequency"]
          p_org_id: string
        }
        Returns: {
          end_at: string
          start_at: string
        }[]
      }
      is_admin: { Args: never; Returns: boolean }
      is_admin_or_super: { Args: never; Returns: boolean }
      is_current_user_super_admin: { Args: never; Returns: boolean }
      is_dev_mode: { Args: never; Returns: boolean }
      is_super_admin: { Args: never; Returns: boolean }
      log_data_access: {
        Args: {
          p_action: string
          p_export_scope: Json
          p_org_id: string
          p_reason: string
        }
        Returns: undefined
      }
      my_org_id: { Args: never; Returns: string }
      publish_survey_version: {
        Args: {
          p_applicable_branch_ids?: Json
          p_description?: string
          p_frequency?: string
          p_is_active?: boolean
          p_sections: Json
          p_survey_id: string
          p_title?: string
        }
        Returns: number
      }
      reassign_open_audits_for_branch: {
        Args: { p_branch_id: string; p_to_user: string }
        Returns: number
      }
      reassign_unstarted_audits_for_branch: {
        Args: { p_branch_id: string; p_to_user: string }
        Returns: number
      }
      reassign_unstarted_audits_for_branches: {
        Args: { p_branch_ids: string[]; p_to_user: string }
        Returns: number
      }
      set_audit_approval: {
        Args: {
          p_approval_name?: string
          p_audit_id: string
          p_note?: string
          p_signature_type?: string
          p_signature_url?: string
          p_status: string
          p_user_id: string
        }
        Returns: {
          approval_name: string | null
          approval_note: string | null
          approval_signature_type: string | null
          approval_signature_url: string | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          assigned_to: string | null
          branch_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          created_origin: string | null
          due_at: string
          id: string
          is_archived: boolean
          na_reasons: Json
          org_id: string
          override_notes: Json
          override_scores: Json
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_note: string | null
          responses: Json
          section_comments: Json
          started_at: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          submitted_by: string | null
          survey_id: string
          survey_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "audits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      set_audit_assigned_to: {
        Args: { p_audit_id: string; p_to_user: string }
        Returns: undefined
      }
      set_auditor_assignment: {
        Args: {
          p_branch_ids: string[]
          p_user_id: string
          p_zone_ids: string[]
        }
        Returns: undefined
      }
      set_org_config: {
        Args: { p_org_id: string; p_payload: Json; p_reason?: string }
        Returns: Json
      }
      submit_audit: {
        Args: { p_audit_id: string; p_submitted_by: string }
        Returns: {
          approval_name: string | null
          approval_note: string | null
          approval_signature_type: string | null
          approval_signature_url: string | null
          approved_at: string | null
          approved_by: string | null
          archived_at: string | null
          assigned_to: string | null
          branch_id: string
          completed_at: string | null
          completed_by: string | null
          created_at: string
          created_by: string | null
          created_origin: string | null
          due_at: string
          id: string
          is_archived: boolean
          na_reasons: Json
          org_id: string
          override_notes: Json
          override_scores: Json
          period_end: string
          period_start: string
          rejected_at: string | null
          rejected_by: string | null
          rejection_note: string | null
          responses: Json
          section_comments: Json
          started_at: string | null
          started_by: string | null
          status: Database["public"]["Enums"]["audit_status"]
          submitted_at: string | null
          submitted_by: string | null
          survey_id: string
          survey_version: number
          updated_at: string
        }
        SetofOptions: {
          from: "*"
          to: "audits"
          isOneToOne: true
          isSetofReturn: false
        }
      }
      user_assigned_branch_ids: { Args: never; Returns: string[] }
      user_managed_branch_ids: { Args: never; Returns: string[] }
      validate_rls_for_current_user: {
        Args: never
        Returns: {
          check_name: string
          details: string
          status: string
        }[]
      }
    }
    Enums: {
      audit_frequency:
        | "DAILY"
        | "WEEKLY"
        | "MONTHLY"
        | "QUARTERLY"
        | "UNLIMITED"
      audit_status:
        | "DRAFT"
        | "IN_PROGRESS"
        | "COMPLETED"
        | "SUBMITTED"
        | "APPROVED"
        | "REJECTED"
      user_role: "SUPER_ADMIN" | "ADMIN" | "AUDITOR" | "BRANCH_MANAGER"
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
      user_role: ["SUPER_ADMIN", "ADMIN", "AUDITOR", "BRANCH_MANAGER"],
    },
  },
} as const
