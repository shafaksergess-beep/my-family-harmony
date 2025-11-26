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
          action_type: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          family_id: string | null
          id: string
          ip_address: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action_type: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string
          ip_address?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_logs: {
        Row: {
          action_type: string
          admin_user_id: string
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string
          id: string
          ip_address: string | null
        }
        Insert: {
          action_type: string
          admin_user_id: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type: string
          id?: string
          ip_address?: string | null
        }
        Update: {
          action_type?: string
          admin_user_id?: string
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string
          id?: string
          ip_address?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "admin_logs_admin_user_id_fkey"
            columns: ["admin_user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      agenda_item_votes: {
        Row: {
          agenda_item_id: string
          created_at: string | null
          id: string
          member_id: string
          updated_at: string | null
          vote: string
        }
        Insert: {
          agenda_item_id: string
          created_at?: string | null
          id?: string
          member_id: string
          updated_at?: string | null
          vote: string
        }
        Update: {
          agenda_item_id?: string
          created_at?: string | null
          id?: string
          member_id?: string
          updated_at?: string | null
          vote?: string
        }
        Relationships: [
          {
            foreignKeyName: "agenda_item_votes_agenda_item_id_fkey"
            columns: ["agenda_item_id"]
            isOneToOne: false
            referencedRelation: "meeting_agenda_items"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "agenda_item_votes_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      assistance_events: {
        Row: {
          amount: number
          beneficiary_name: string | null
          contribution_per_member: number | null
          created_at: string | null
          event_date: string
          event_type: string
          family_id: string
          hospitalization_days: number | null
          id: string
          is_paid: boolean | null
          member_id: string
          notes: string | null
          payment_date: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          beneficiary_name?: string | null
          contribution_per_member?: number | null
          created_at?: string | null
          event_date: string
          event_type: string
          family_id: string
          hospitalization_days?: number | null
          id?: string
          is_paid?: boolean | null
          member_id: string
          notes?: string | null
          payment_date?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          beneficiary_name?: string | null
          contribution_per_member?: number | null
          created_at?: string | null
          event_date?: string
          event_type?: string
          family_id?: string
          hospitalization_days?: number | null
          id?: string
          is_paid?: boolean | null
          member_id?: string
          notes?: string | null
          payment_date?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "assistance_events_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assistance_events_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          check_in_time: string | null
          created_at: string | null
          excuse_reason: string | null
          fine_amount: number | null
          id: string
          lateness_minutes: number | null
          meeting_id: string
          member_id: string
          notes: string | null
          status: string
          updated_at: string | null
        }
        Insert: {
          check_in_time?: string | null
          created_at?: string | null
          excuse_reason?: string | null
          fine_amount?: number | null
          id?: string
          lateness_minutes?: number | null
          meeting_id: string
          member_id: string
          notes?: string | null
          status: string
          updated_at?: string | null
        }
        Update: {
          check_in_time?: string | null
          created_at?: string | null
          excuse_reason?: string | null
          fine_amount?: number | null
          id?: string
          lateness_minutes?: number | null
          meeting_id?: string
          member_id?: string
          notes?: string | null
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "attendance_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      balloting_assignments: {
        Row: {
          assignment_type: string
          assignments: Json
          balloted_at: string | null
          balloted_by: string | null
          created_at: string | null
          family_id: string
          id: string
          year: number
        }
        Insert: {
          assignment_type: string
          assignments: Json
          balloted_at?: string | null
          balloted_by?: string | null
          created_at?: string | null
          family_id: string
          id?: string
          year: number
        }
        Update: {
          assignment_type?: string
          assignments?: Json
          balloted_at?: string | null
          balloted_by?: string | null
          created_at?: string | null
          family_id?: string
          id?: string
          year?: number
        }
        Relationships: [
          {
            foreignKeyName: "balloting_assignments_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      budget_categories: {
        Row: {
          color: string | null
          created_at: string
          description: string | null
          family_id: string
          id: string
          monthly_limit: number
          name: string
          updated_at: string
        }
        Insert: {
          color?: string | null
          created_at?: string
          description?: string | null
          family_id: string
          id?: string
          monthly_limit?: number
          name: string
          updated_at?: string
        }
        Update: {
          color?: string | null
          created_at?: string
          description?: string | null
          family_id?: string
          id?: string
          monthly_limit?: number
          name?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "budget_categories_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      contributions: {
        Row: {
          amount: number
          contribution_date: string
          created_at: string | null
          family_id: string
          house_id: string | null
          id: string
          late_fine: number | null
          member_id: string
          notes: string | null
          payment_date: string | null
          status: string
          type: string
          updated_at: string | null
        }
        Insert: {
          amount: number
          contribution_date: string
          created_at?: string | null
          family_id: string
          house_id?: string | null
          id?: string
          late_fine?: number | null
          member_id: string
          notes?: string | null
          payment_date?: string | null
          status?: string
          type: string
          updated_at?: string | null
        }
        Update: {
          amount?: number
          contribution_date?: string
          created_at?: string | null
          family_id?: string
          house_id?: string | null
          id?: string
          late_fine?: number | null
          member_id?: string
          notes?: string | null
          payment_date?: string | null
          status?: string
          type?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "contributions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "contributions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dividend_payments: {
        Row: {
          amount: number
          created_at: string | null
          dividend_id: string
          id: string
          is_paid: boolean | null
          member_id: string
          notes: string | null
          payment_date: string | null
          shares_owned: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          dividend_id: string
          id?: string
          is_paid?: boolean | null
          member_id: string
          notes?: string | null
          payment_date?: string | null
          shares_owned: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          dividend_id?: string
          id?: string
          is_paid?: boolean | null
          member_id?: string
          notes?: string | null
          payment_date?: string | null
          shares_owned?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dividend_payments_dividend_id_fkey"
            columns: ["dividend_id"]
            isOneToOne: false
            referencedRelation: "dividends"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dividend_payments_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      dividends: {
        Row: {
          amount_per_share: number
          created_at: string | null
          family_id: string
          id: string
          is_paid: boolean | null
          notes: string | null
          payment_date: string | null
          period_quarter: number | null
          period_year: number
          source_description: string | null
          total_amount: number
          total_shares: number
          updated_at: string | null
        }
        Insert: {
          amount_per_share?: number
          created_at?: string | null
          family_id: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          payment_date?: string | null
          period_quarter?: number | null
          period_year: number
          source_description?: string | null
          total_amount?: number
          total_shares: number
          updated_at?: string | null
        }
        Update: {
          amount_per_share?: number
          created_at?: string | null
          family_id?: string
          id?: string
          is_paid?: boolean | null
          notes?: string | null
          payment_date?: string | null
          period_quarter?: number | null
          period_year?: number
          source_description?: string | null
          total_amount?: number
          total_shares?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "dividends_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          created_by: string | null
          description: string
          expense_date: string
          family_id: string
          id: string
          notes: string | null
          receipt_url: string | null
          updated_at: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description: string
          expense_date?: string
          family_id: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description?: string
          expense_date?: string
          family_id?: string
          id?: string
          notes?: string | null
          receipt_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "budget_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      export_schedules: {
        Row: {
          created_at: string
          created_by: string
          family_id: string
          format: string
          frequency: string
          id: string
          is_active: boolean
          last_sent_at: string | null
          name: string
          next_send_at: string | null
          recipients: string[]
          report_type: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          family_id: string
          format?: string
          frequency: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name: string
          next_send_at?: string | null
          recipients: string[]
          report_type: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          family_id?: string
          format?: string
          frequency?: string
          id?: string
          is_active?: boolean
          last_sent_at?: string | null
          name?: string
          next_send_at?: string | null
          recipients?: string[]
          report_type?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "export_schedules_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      families: {
        Row: {
          contribution_scope: string | null
          created_at: string | null
          description: string | null
          fine_after_30min: number | null
          fine_after_60min: number | null
          heritage_info: string | null
          id: string
          is_active: boolean | null
          lateness_tolerance_minutes: number | null
          loan_interest_rate: number | null
          logo_url: string | null
          mandatory_contribution: number | null
          meeting_day: string | null
          meeting_frequency: string | null
          meeting_time: string | null
          name: string
          njangi_amount: number | null
          primary_language: string | null
          share_value: number | null
          slug: string
          updated_at: string | null
        }
        Insert: {
          contribution_scope?: string | null
          created_at?: string | null
          description?: string | null
          fine_after_30min?: number | null
          fine_after_60min?: number | null
          heritage_info?: string | null
          id?: string
          is_active?: boolean | null
          lateness_tolerance_minutes?: number | null
          loan_interest_rate?: number | null
          logo_url?: string | null
          mandatory_contribution?: number | null
          meeting_day?: string | null
          meeting_frequency?: string | null
          meeting_time?: string | null
          name: string
          njangi_amount?: number | null
          primary_language?: string | null
          share_value?: number | null
          slug: string
          updated_at?: string | null
        }
        Update: {
          contribution_scope?: string | null
          created_at?: string | null
          description?: string | null
          fine_after_30min?: number | null
          fine_after_60min?: number | null
          heritage_info?: string | null
          id?: string
          is_active?: boolean | null
          lateness_tolerance_minutes?: number | null
          loan_interest_rate?: number | null
          logo_url?: string | null
          mandatory_contribution?: number | null
          meeting_day?: string | null
          meeting_frequency?: string | null
          meeting_time?: string | null
          name?: string
          njangi_amount?: number | null
          primary_language?: string | null
          share_value?: number | null
          slug?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      family_members: {
        Row: {
          created_at: string | null
          family_id: string
          house_name: string | null
          id: string
          is_house_representative: boolean | null
          joined_at: string | null
          role: Database["public"]["Enums"]["user_role"] | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          created_at?: string | null
          family_id: string
          house_name?: string | null
          id?: string
          is_house_representative?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          created_at?: string | null
          family_id?: string
          house_name?: string | null
          id?: string
          is_house_representative?: boolean | null
          joined_at?: string | null
          role?: Database["public"]["Enums"]["user_role"] | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "family_members_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "family_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      invitations: {
        Row: {
          accepted_at: string | null
          created_at: string
          email: string
          expires_at: string
          family_id: string
          id: string
          invited_by: string
          role: Database["public"]["Enums"]["user_role"]
          status: string
          token: string
          updated_at: string
        }
        Insert: {
          accepted_at?: string | null
          created_at?: string
          email: string
          expires_at: string
          family_id: string
          id?: string
          invited_by: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token: string
          updated_at?: string
        }
        Update: {
          accepted_at?: string | null
          created_at?: string
          email?: string
          expires_at?: string
          family_id?: string
          id?: string
          invited_by?: string
          role?: Database["public"]["Enums"]["user_role"]
          status?: string
          token?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "invitations_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "invitations_invited_by_fkey"
            columns: ["invited_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      loans: {
        Row: {
          amount: number
          amount_paid: number | null
          approved_at: string | null
          approved_by: string | null
          created_at: string | null
          disbursed_at: string | null
          due_date: string | null
          family_id: string
          id: string
          interest_paid: number | null
          interest_rate: number
          member_id: string
          notes: string | null
          purpose: string
          status: string
          term_months: number
          updated_at: string | null
        }
        Insert: {
          amount: number
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          family_id: string
          id?: string
          interest_paid?: number | null
          interest_rate?: number
          member_id: string
          notes?: string | null
          purpose: string
          status?: string
          term_months?: number
          updated_at?: string | null
        }
        Update: {
          amount?: number
          amount_paid?: number | null
          approved_at?: string | null
          approved_by?: string | null
          created_at?: string | null
          disbursed_at?: string | null
          due_date?: string | null
          family_id?: string
          id?: string
          interest_paid?: number | null
          interest_rate?: number
          member_id?: string
          notes?: string | null
          purpose?: string
          status?: string
          term_months?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "loans_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "loans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_agenda_items: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          meeting_id: string
          order_index: number
          requires_vote: boolean | null
          time_allocation: number | null
          title: string
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          meeting_id: string
          order_index?: number
          requires_vote?: boolean | null
          time_allocation?: number | null
          title: string
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          meeting_id?: string
          order_index?: number
          requires_vote?: boolean | null
          time_allocation?: number | null
          title?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_agenda_items_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_minutes: {
        Row: {
          action_items: Json | null
          content: string
          created_at: string | null
          decisions_made: Json | null
          id: string
          meeting_id: string
          recorded_by: string | null
          updated_at: string | null
        }
        Insert: {
          action_items?: Json | null
          content: string
          created_at?: string | null
          decisions_made?: Json | null
          id?: string
          meeting_id: string
          recorded_by?: string | null
          updated_at?: string | null
        }
        Update: {
          action_items?: Json | null
          content?: string
          created_at?: string | null
          decisions_made?: Json | null
          id?: string
          meeting_id?: string
          recorded_by?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_minutes_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_reminders: {
        Row: {
          created_at: string
          days_before: number
          family_id: string
          id: string
          meeting_id: string
          reminder_type: string
          sent_at: string | null
        }
        Insert: {
          created_at?: string
          days_before: number
          family_id: string
          id?: string
          meeting_id: string
          reminder_type: string
          sent_at?: string | null
        }
        Update: {
          created_at?: string
          days_before?: number
          family_id?: string
          id?: string
          meeting_id?: string
          reminder_type?: string
          sent_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_reminders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "meeting_reminders_meeting_id_fkey"
            columns: ["meeting_id"]
            isOneToOne: false
            referencedRelation: "meetings"
            referencedColumns: ["id"]
          },
        ]
      }
      meeting_templates: {
        Row: {
          agenda_items: Json
          created_at: string | null
          created_by: string | null
          description: string | null
          family_id: string
          id: string
          name: string
          updated_at: string | null
        }
        Insert: {
          agenda_items?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          family_id: string
          id?: string
          name: string
          updated_at?: string | null
        }
        Update: {
          agenda_items?: Json
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          family_id?: string
          id?: string
          name?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meeting_templates_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      meetings: {
        Row: {
          agenda: string | null
          created_at: string | null
          family_id: string
          host_house: string | null
          id: string
          is_completed: boolean | null
          location: string | null
          meeting_date: string
          meeting_time: string
          meeting_type: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          agenda?: string | null
          created_at?: string | null
          family_id: string
          host_house?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          meeting_date: string
          meeting_time?: string
          meeting_type?: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          agenda?: string | null
          created_at?: string | null
          family_id?: string
          host_house?: string | null
          id?: string
          is_completed?: boolean | null
          location?: string | null
          meeting_date?: string
          meeting_time?: string
          meeting_type?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "meetings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      member_wallets: {
        Row: {
          balance: number
          created_at: string | null
          family_id: string
          id: string
          member_id: string
          updated_at: string | null
        }
        Insert: {
          balance?: number
          created_at?: string | null
          family_id: string
          id?: string
          member_id: string
          updated_at?: string | null
        }
        Update: {
          balance?: number
          created_at?: string | null
          family_id?: string
          id?: string
          member_id?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "member_wallets_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "member_wallets_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      njangi_cycles: {
        Row: {
          amount_per_person: number
          created_at: string | null
          end_date: string | null
          family_id: string
          id: string
          name: string
          notes: string | null
          start_date: string
          status: string
          updated_at: string | null
        }
        Insert: {
          amount_per_person?: number
          created_at?: string | null
          end_date?: string | null
          family_id: string
          id?: string
          name: string
          notes?: string | null
          start_date: string
          status?: string
          updated_at?: string | null
        }
        Update: {
          amount_per_person?: number
          created_at?: string | null
          end_date?: string | null
          family_id?: string
          id?: string
          name?: string
          notes?: string | null
          start_date?: string
          status?: string
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "njangi_cycles_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      njangi_participants: {
        Row: {
          amount_received: number | null
          created_at: string | null
          cycle_id: string
          id: string
          is_paid: boolean | null
          member_id: string
          notes: string | null
          payout_date: string | null
          payout_order: number
          updated_at: string | null
        }
        Insert: {
          amount_received?: number | null
          created_at?: string | null
          cycle_id: string
          id?: string
          is_paid?: boolean | null
          member_id: string
          notes?: string | null
          payout_date?: string | null
          payout_order: number
          updated_at?: string | null
        }
        Update: {
          amount_received?: number | null
          created_at?: string | null
          cycle_id?: string
          id?: string
          is_paid?: boolean | null
          member_id?: string
          notes?: string | null
          payout_date?: string | null
          payout_order?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "njangi_participants_cycle_id_fkey"
            columns: ["cycle_id"]
            isOneToOne: false
            referencedRelation: "njangi_cycles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "njangi_participants_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_plans: {
        Row: {
          amount_paid: number
          contribution_id: string | null
          created_at: string
          end_date: string | null
          family_id: string
          frequency: string
          id: string
          installment_amount: number
          member_id: string
          notes: string | null
          start_date: string
          status: string
          total_amount: number
          updated_at: string
        }
        Insert: {
          amount_paid?: number
          contribution_id?: string | null
          created_at?: string
          end_date?: string | null
          family_id: string
          frequency?: string
          id?: string
          installment_amount: number
          member_id: string
          notes?: string | null
          start_date: string
          status?: string
          total_amount: number
          updated_at?: string
        }
        Update: {
          amount_paid?: number
          contribution_id?: string | null
          created_at?: string
          end_date?: string | null
          family_id?: string
          frequency?: string
          id?: string
          installment_amount?: number
          member_id?: string
          notes?: string | null
          start_date?: string
          status?: string
          total_amount?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_plans_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_plans_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_reminders: {
        Row: {
          contribution_id: string
          created_at: string
          days_late: number
          family_id: string
          id: string
          reminder_type: string
          sent_at: string
        }
        Insert: {
          contribution_id: string
          created_at?: string
          days_late: number
          family_id: string
          id?: string
          reminder_type: string
          sent_at?: string
        }
        Update: {
          contribution_id?: string
          created_at?: string
          days_late?: number
          family_id?: string
          id?: string
          reminder_type?: string
          sent_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_reminders_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_reminders_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_transactions: {
        Row: {
          amount: number
          contribution_id: string | null
          created_at: string
          family_id: string
          id: string
          member_id: string
          notes: string | null
          payment_method: string
          payment_reference: string | null
          status: string
          transaction_date: string
          updated_at: string
          verified_at: string | null
          verified_by: string | null
        }
        Insert: {
          amount: number
          contribution_id?: string | null
          created_at?: string
          family_id: string
          id?: string
          member_id: string
          notes?: string | null
          payment_method: string
          payment_reference?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Update: {
          amount?: number
          contribution_id?: string | null
          created_at?: string
          family_id?: string
          id?: string
          member_id?: string
          notes?: string | null
          payment_method?: string
          payment_reference?: string | null
          status?: string
          transaction_date?: string
          updated_at?: string
          verified_at?: string | null
          verified_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payment_transactions_contribution_id_fkey"
            columns: ["contribution_id"]
            isOneToOne: false
            referencedRelation: "contributions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payment_transactions_verified_by_fkey"
            columns: ["verified_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      permissions: {
        Row: {
          action: string
          created_at: string | null
          description: string | null
          id: string
          module: string
        }
        Insert: {
          action: string
          created_at?: string | null
          description?: string | null
          id?: string
          module: string
        }
        Update: {
          action?: string
          created_at?: string | null
          description?: string | null
          id?: string
          module?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          email: string | null
          full_name: string
          id: string
          is_working: boolean | null
          phone: string | null
          preferred_language: string | null
          updated_at: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name: string
          id: string
          is_working?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          email?: string | null
          full_name?: string
          id?: string
          is_working?: boolean | null
          phone?: string | null
          preferred_language?: string | null
          updated_at?: string | null
        }
        Relationships: []
      }
      role_permissions: {
        Row: {
          created_at: string | null
          family_id: string | null
          id: string
          permission_id: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          permission_id?: string | null
          role: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          family_id?: string | null
          id?: string
          permission_id?: string | null
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_permissions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["id"]
          },
        ]
      }
      savings: {
        Row: {
          amount: number
          created_at: string | null
          family_id: string
          id: string
          member_id: string
          month: string
          notes: string | null
          updated_at: string | null
        }
        Insert: {
          amount?: number
          created_at?: string | null
          family_id: string
          id?: string
          member_id: string
          month: string
          notes?: string | null
          updated_at?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          family_id?: string
          id?: string
          member_id?: string
          month?: string
          notes?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "savings_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "savings_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      shares: {
        Row: {
          created_at: string | null
          family_id: string
          id: string
          is_active: boolean | null
          member_id: string
          notes: string | null
          purchase_date: string
          share_number: string
          share_value: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          family_id: string
          id?: string
          is_active?: boolean | null
          member_id: string
          notes?: string | null
          purchase_date: string
          share_number: string
          share_value?: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          family_id?: string
          id?: string
          is_active?: boolean | null
          member_id?: string
          notes?: string | null
          purchase_date?: string
          share_number?: string
          share_value?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "shares_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "shares_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      super_admins: {
        Row: {
          created_at: string | null
          id: string
          user_id: string
        }
        Insert: {
          created_at?: string | null
          id?: string
          user_id: string
        }
        Update: {
          created_at?: string | null
          id?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          balance_after: number | null
          category: string
          created_at: string | null
          created_by: string | null
          description: string | null
          family_id: string
          id: string
          member_id: string | null
          notes: string | null
          reference_id: string | null
          reference_type: string | null
          transaction_date: string
          type: string
        }
        Insert: {
          amount: number
          balance_after?: number | null
          category: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          family_id: string
          id?: string
          member_id?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          type: string
        }
        Update: {
          amount?: number
          balance_after?: number | null
          category?: string
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          family_id?: string
          id?: string
          member_id?: string | null
          notes?: string | null
          reference_id?: string | null
          reference_type?: string | null
          transaction_date?: string
          type?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_member_id_fkey"
            columns: ["member_id"]
            isOneToOne: false
            referencedRelation: "family_members"
            referencedColumns: ["id"]
          },
        ]
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string | null
          description: string | null
          id: string
          reference_id: string | null
          reference_type: string | null
          transaction_type: string
          wallet_id: string
        }
        Insert: {
          amount: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type: string
          wallet_id: string
        }
        Update: {
          amount?: number
          created_at?: string | null
          description?: string | null
          id?: string
          reference_id?: string | null
          reference_type?: string | null
          transaction_type?: string
          wallet_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "wallet_transactions_wallet_id_fkey"
            columns: ["wallet_id"]
            isOneToOne: false
            referencedRelation: "member_wallets"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      activity_logs_safe: {
        Row: {
          action_type: string | null
          created_at: string | null
          details: Json | null
          entity_id: string | null
          entity_type: string | null
          family_id: string | null
          id: string | null
          user_id: string | null
        }
        Insert: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string | null
          user_id?: string | null
        }
        Update: {
          action_type?: string | null
          created_at?: string | null
          details?: Json | null
          entity_id?: string | null
          entity_type?: string | null
          family_id?: string | null
          id?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "activity_logs_family_id_fkey"
            columns: ["family_id"]
            isOneToOne: false
            referencedRelation: "families"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      get_user_families: {
        Args: { check_user_id: string }
        Returns: {
          family_id: string
          family_name: string
          family_slug: string
          user_role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      has_family_role: {
        Args: {
          check_family_id: string
          check_role: Database["public"]["Enums"]["user_role"]
          check_user_id: string
        }
        Returns: boolean
      }
      has_permission: {
        Args: {
          check_action: string
          check_family_id: string
          check_module: string
          check_user_id: string
        }
        Returns: boolean
      }
      is_family_head: {
        Args: { check_family_id: string; check_user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { check_user_id: string }; Returns: boolean }
      log_activity: {
        Args: {
          p_action_type: string
          p_details?: Json
          p_entity_id?: string
          p_entity_type?: string
          p_family_id?: string
        }
        Returns: string
      }
      user_belongs_to_family: {
        Args: { check_family_id: string; check_user_id: string }
        Returns: boolean
      }
    }
    Enums: {
      user_role:
        | "super_admin"
        | "family_head"
        | "treasurer"
        | "loan_committee"
        | "member"
        | "guest"
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
      user_role: [
        "super_admin",
        "family_head",
        "treasurer",
        "loan_committee",
        "member",
        "guest",
      ],
    },
  },
} as const
