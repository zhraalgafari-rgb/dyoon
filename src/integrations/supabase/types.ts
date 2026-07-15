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
  public: {
    Tables: {
      attachments: {
        Row: {
          amount: number | null
          category: string | null
          created_at: string
          doc_date: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id: string
          mime_type: string | null
          note: string | null
          size_bytes: number | null
          storage_path: string
          user_id: string
        }
        Insert: {
          amount?: number | null
          category?: string | null
          created_at?: string
          doc_date?: string | null
          entity_id: string
          entity_type: string
          file_name: string
          id?: string
          mime_type?: string | null
          note?: string | null
          size_bytes?: number | null
          storage_path: string
          user_id?: string
        }
        Update: {
          amount?: number | null
          category?: string | null
          created_at?: string
          doc_date?: string | null
          entity_id?: string
          entity_type?: string
          file_name?: string
          id?: string
          mime_type?: string | null
          note?: string | null
          size_bytes?: number | null
          storage_path?: string
          user_id?: string
        }
        Relationships: []
      }
      audit_log: {
        Row: {
          action: string
          created_at: string
          entity: string
          entity_id: string | null
          id: string
          metadata: Json | null
          user_id: string
        }
        Insert: {
          action: string
          created_at?: string
          entity: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Update: {
          action?: string
          created_at?: string
          entity?: string
          entity_id?: string | null
          id?: string
          metadata?: Json | null
          user_id?: string
        }
        Relationships: []
      }
      backup_meta: {
        Row: {
          created_at: string
          id: string
          kind: string
          path: string
          size_bytes: number
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: string
          path: string
          size_bytes: number
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          path?: string
          size_bytes?: number
          user_id?: string
        }
        Relationships: []
      }
      budgets: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency_id: string
          id: string
          period: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency_id: string
          id?: string
          period: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency_id?: string
          id?: string
          period?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "budgets_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "budgets_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      company_profile: {
        Row: {
          address: string | null
          created_at: string
          email: string | null
          logo_path: string | null
          name: string | null
          notes: string | null
          phone: string | null
          tax_number: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          address?: string | null
          created_at?: string
          email?: string | null
          logo_path?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Update: {
          address?: string | null
          created_at?: string
          email?: string | null
          logo_path?: string | null
          name?: string | null
          notes?: string | null
          phone?: string | null
          tax_number?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      currencies: {
        Row: {
          created_at: string
          id: string
          is_base: boolean
          name: string
          rate: number
          symbol: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_base?: boolean
          name: string
          rate?: number
          symbol: string
          user_id?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_base?: boolean
          name?: string
          rate?: number
          symbol?: string
          user_id?: string
        }
        Relationships: []
      }
      customer_ratings: {
        Row: {
          computed_at: string
          id: string
          person_id: string
          rating: string
          reason: string | null
          score: number
          user_id: string
        }
        Insert: {
          computed_at?: string
          id?: string
          person_id: string
          rating: string
          reason?: string | null
          score: number
          user_id?: string
        }
        Update: {
          computed_at?: string
          id?: string
          person_id?: string
          rating?: string
          reason?: string | null
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_ratings_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      exchange_rates: {
        Row: {
          created_at: string
          created_by: string | null
          currency_id: string
          effective_date: string
          id: string
          note: string | null
          rate_to_base: number
          user_id: string
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          currency_id: string
          effective_date: string
          id?: string
          note?: string | null
          rate_to_base: number
          user_id?: string
        }
        Update: {
          created_at?: string
          created_by?: string | null
          currency_id?: string
          effective_date?: string
          id?: string
          note?: string | null
          rate_to_base?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "exchange_rates_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      expense_categories: {
        Row: {
          color: string
          created_at: string
          icon: string
          id: string
          is_default: boolean
          name: string
          sort_order: number
          user_id: string
        }
        Insert: {
          color: string
          created_at?: string
          icon: string
          id?: string
          is_default?: boolean
          name: string
          sort_order?: number
          user_id?: string
        }
        Update: {
          color?: string
          created_at?: string
          icon?: string
          id?: string
          is_default?: boolean
          name?: string
          sort_order?: number
          user_id?: string
        }
        Relationships: []
      }
      expenses: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency_id: string
          expense_date: string
          id: string
          note: string | null
          rate_at_tx: number | null
          receipt_path: string | null
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency_id: string
          expense_date: string
          id?: string
          note?: string | null
          rate_at_tx?: number | null
          receipt_path?: string | null
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency_id?: string
          expense_date?: string
          id?: string
          note?: string | null
          rate_at_tx?: number | null
          receipt_path?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "expenses_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "expenses_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
        ]
      }
      opening_balances: {
        Row: {
          amount: number
          created_at: string
          currency_id: string
          direction: string
          id: string
          note: string | null
          opening_date: string
          person_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_id: string
          direction: string
          id?: string
          note?: string | null
          opening_date: string
          person_id: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_id?: string
          direction?: string
          id?: string
          note?: string | null
          opening_date?: string
          person_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "opening_balances_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "opening_balances_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      people: {
        Row: {
          avatar_color: string | null
          created_at: string
          credit_limit: number | null
          id: string
          is_archived: boolean
          name: string
          notes: string | null
          phone: string | null
          type: string
          user_id: string
        }
        Insert: {
          avatar_color?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_archived?: boolean
          name: string
          notes?: string | null
          phone?: string | null
          type: string
          user_id?: string
        }
        Update: {
          avatar_color?: string | null
          created_at?: string
          credit_limit?: number | null
          id?: string
          is_archived?: boolean
          name?: string
          notes?: string | null
          phone?: string | null
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          backup_frequency: string
          created_at: string
          display_name: string | null
          id: string
          last_seen_reminder_at: string | null
          notif_subscription: Json | null
          onboarded: boolean
          pin_hash: string | null
          theme: string
          updated_at: string
          user_id: string
        }
        Insert: {
          backup_frequency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_reminder_at?: string | null
          notif_subscription?: Json | null
          onboarded?: boolean
          pin_hash?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Update: {
          backup_frequency?: string
          created_at?: string
          display_name?: string | null
          id?: string
          last_seen_reminder_at?: string | null
          notif_subscription?: Json | null
          onboarded?: boolean
          pin_hash?: string | null
          theme?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      recurring_rules: {
        Row: {
          amount: number
          category_id: string | null
          created_at: string
          currency_id: string
          day_of_month: number | null
          direction: string | null
          frequency: string
          id: string
          is_active: boolean
          kind: string
          last_run: string | null
          next_run: string
          note: string | null
          person_id: string | null
          title: string
          user_id: string
        }
        Insert: {
          amount: number
          category_id?: string | null
          created_at?: string
          currency_id: string
          day_of_month?: number | null
          direction?: string | null
          frequency: string
          id?: string
          is_active?: boolean
          kind: string
          last_run?: string | null
          next_run: string
          note?: string | null
          person_id?: string | null
          title: string
          user_id?: string
        }
        Update: {
          amount?: number
          category_id?: string | null
          created_at?: string
          currency_id?: string
          day_of_month?: number | null
          direction?: string | null
          frequency?: string
          id?: string
          is_active?: boolean
          kind?: string
          last_run?: string | null
          next_run?: string
          note?: string | null
          person_id?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "recurring_rules_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "expense_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "recurring_rules_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      reminders: {
        Row: {
          created_at: string
          due_date: string
          id: string
          is_done: boolean
          note: string | null
          person_id: string | null
          repeat: string
          snoozed_until: string | null
          title: string
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          due_date: string
          id?: string
          is_done?: boolean
          note?: string | null
          person_id?: string | null
          repeat: string
          snoozed_until?: string | null
          title: string
          transaction_id?: string | null
          user_id?: string
        }
        Update: {
          created_at?: string
          due_date?: string
          id?: string
          is_done?: boolean
          note?: string | null
          person_id?: string | null
          repeat?: string
          snoozed_until?: string | null
          title?: string
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "reminders_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reminders_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transactions: {
        Row: {
          amount: number
          created_at: string
          currency_id: string
          details: string | null
          direction: string
          due_date: string | null
          id: string
          is_paid: boolean
          person_id: string
          rate_at_tx: number | null
          transaction_date: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency_id: string
          details?: string | null
          direction: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          person_id: string
          rate_at_tx?: number | null
          transaction_date: string
          user_id?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency_id?: string
          details?: string | null
          direction?: string
          due_date?: string | null
          id?: string
          is_paid?: boolean
          person_id?: string
          rate_at_tx?: number | null
          transaction_date?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
      customer_risk_scores: {
        Row: {
          classification: string
          computed_at: string
          factors: Json
          person_id: string
          score: number
          user_id: string
        }
        Insert: {
          classification: string
          computed_at?: string
          factors?: Json
          person_id: string
          score: number
          user_id: string
        }
        Update: {
          classification?: string
          computed_at?: string
          factors?: Json
          person_id?: string
          score?: number
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "customer_risk_scores_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: true
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      followup_logs: {
        Row: {
          channel: Database["public"]["Enums"]["followup_channel"]
          created_at: string
          id: string
          message: string | null
          outcome: string | null
          person_id: string | null
          transaction_id: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["followup_channel"]
          created_at?: string
          id?: string
          message?: string | null
          outcome?: string | null
          person_id?: string | null
          transaction_id?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["followup_channel"]
          created_at?: string
          id?: string
          message?: string | null
          outcome?: string | null
          person_id?: string | null
          transaction_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "followup_logs_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "followup_logs_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_delivery_logs: {
        Row: {
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at: string | null
          error_code: string | null
          error_message: string | null
          id: string
          job_id: string
          latency_ms: number | null
          provider: string | null
          request_payload: Json | null
          response_payload: Json | null
          status: string
        }
        Insert: {
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id: string
          latency_ms?: number | null
          provider?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          error_code?: string | null
          error_message?: string | null
          id?: string
          job_id?: string
          latency_ms?: number | null
          provider?: string | null
          request_payload?: Json | null
          response_payload?: Json | null
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_delivery_logs_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_events: {
        Row: {
          channel: Database["public"]["Enums"]["notif_channel"] | null
          created_at: string | null
          event_type: string
          id: string
          job_id: string
          metadata: Json | null
          provider: string | null
          provider_message_id: string | null
          user_id: string
        }
        Insert: {
          channel?: Database["public"]["Enums"]["notif_channel"] | null
          created_at?: string | null
          event_type: string
          id?: string
          job_id: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          user_id: string
        }
        Update: {
          channel?: Database["public"]["Enums"]["notif_channel"] | null
          created_at?: string | null
          event_type?: string
          id?: string
          job_id?: string
          metadata?: Json | null
          provider?: string | null
          provider_message_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_events_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_inbox: {
        Row: {
          alert_id: string | null
          archived_at: string | null
          body: string | null
          category: Database["public"]["Enums"]["notif_category"]
          created_at: string | null
          data: Json | null
          id: string
          is_read: boolean | null
          job_id: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          archived_at?: string | null
          body?: string | null
          category: Database["public"]["Enums"]["notif_category"]
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          alert_id?: string | null
          archived_at?: string | null
          body?: string | null
          category?: Database["public"]["Enums"]["notif_category"]
          created_at?: string | null
          data?: Json | null
          id?: string
          is_read?: boolean | null
          job_id?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_inbox_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "smart_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_inbox_job_id_fkey"
            columns: ["job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_jobs: {
        Row: {
          alert_id: string | null
          category: Database["public"]["Enums"]["notif_category"]
          channel: Database["public"]["Enums"]["notif_channel"] | null
          created_at: string | null
          delivered_at: string | null
          failed_at: string | null
          failure_reason: string | null
          id: string
          idempotency_key: string | null
          max_retries: number | null
          parent_job_id: string | null
          payload: Json
          priority: Database["public"]["Enums"]["notif_priority"] | null
          read_at: string | null
          retry_count: number | null
          scheduled_at: string | null
          sent_at: string | null
          status: Database["public"]["Enums"]["notif_status"] | null
          template_id: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          alert_id?: string | null
          category: Database["public"]["Enums"]["notif_category"]
          channel?: Database["public"]["Enums"]["notif_channel"] | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          parent_job_id?: string | null
          payload?: Json
          priority?: Database["public"]["Enums"]["notif_priority"] | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"] | null
          template_id?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          alert_id?: string | null
          category?: Database["public"]["Enums"]["notif_category"]
          channel?: Database["public"]["Enums"]["notif_channel"] | null
          created_at?: string | null
          delivered_at?: string | null
          failed_at?: string | null
          failure_reason?: string | null
          id?: string
          idempotency_key?: string | null
          max_retries?: number | null
          parent_job_id?: string | null
          payload?: Json
          priority?: Database["public"]["Enums"]["notif_priority"] | null
          read_at?: string | null
          retry_count?: number | null
          scheduled_at?: string | null
          sent_at?: string | null
          status?: Database["public"]["Enums"]["notif_status"] | null
          template_id?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_jobs_alert_id_fkey"
            columns: ["alert_id"]
            isOneToOne: false
            referencedRelation: "smart_alerts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_parent_job_id_fkey"
            columns: ["parent_job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_jobs_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      notification_preferences: {
        Row: {
          category: Database["public"]["Enums"]["notif_category"]
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at: string | null
          enabled: boolean | null
          id: string
          max_per_day: number | null
          max_per_week: number | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          category: Database["public"]["Enums"]["notif_category"]
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_per_day?: number | null
          max_per_week?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          category?: Database["public"]["Enums"]["notif_category"]
          channel?: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          enabled?: boolean | null
          id?: string
          max_per_day?: number | null
          max_per_week?: number | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      notification_templates: {
        Row: {
          body: string
          body_ar: string | null
          category: Database["public"]["Enums"]["notif_category"]
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at: string | null
          id: string
          is_active: boolean | null
          name: string
          subject: string | null
          updated_at: string | null
          user_id: string
          variables: Json | null
          variant_of: string | null
        }
        Insert: {
          body: string
          body_ar?: string | null
          category: Database["public"]["Enums"]["notif_category"]
          channel: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          subject?: string | null
          updated_at?: string | null
          user_id: string
          variables?: Json | null
          variant_of?: string | null
        }
        Update: {
          body?: string
          body_ar?: string | null
          category?: Database["public"]["Enums"]["notif_category"]
          channel?: Database["public"]["Enums"]["notif_channel"]
          created_at?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          subject?: string | null
          updated_at?: string | null
          user_id?: string
          variables?: Json | null
          variant_of?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notification_templates_variant_of_fkey"
            columns: ["variant_of"]
            isOneToOne: false
            referencedRelation: "notification_templates"
            referencedColumns: ["id"]
          },
        ]
      }
      payment_promises: {
        Row: {
          amount: number
          created_at: string
          created_by: string
          id: string
          notes: string | null
          person_id: string
          promise_date: string
          status: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          created_by: string
          id?: string
          notes?: string | null
          person_id: string
          promise_date: string
          status?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          created_by?: string
          id?: string
          notes?: string | null
          person_id?: string
          promise_date?: string
          status?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "payment_promises_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      smart_alerts: {
        Row: {
          body: string | null
          channel: Database["public"]["Enums"]["notif_channel"]
          completed_at: string | null
          created_at: string
          due_at: string | null
          id: string
          notification_job_id: string | null
          person_id: string | null
          priority: Database["public"]["Enums"]["notif_priority"]
          source_id: string
          source_type: Database["public"]["Enums"]["alert_source"]
          status: Database["public"]["Enums"]["alert_status"]
          title: string
          transaction_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notif_channel"]
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notification_job_id?: string | null
          person_id?: string | null
          priority?: Database["public"]["Enums"]["notif_priority"]
          source_id: string
          source_type: Database["public"]["Enums"]["alert_source"]
          status?: Database["public"]["Enums"]["alert_status"]
          title: string
          transaction_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string | null
          channel?: Database["public"]["Enums"]["notif_channel"]
          completed_at?: string | null
          created_at?: string
          due_at?: string | null
          id?: string
          notification_job_id?: string | null
          person_id?: string | null
          priority?: Database["public"]["Enums"]["notif_priority"]
          source_id?: string
          source_type?: Database["public"]["Enums"]["alert_source"]
          status?: Database["public"]["Enums"]["alert_status"]
          title?: string
          transaction_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "smart_alerts_notification_job_id_fkey"
            columns: ["notification_job_id"]
            isOneToOne: false
            referencedRelation: "notification_jobs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_alerts_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "smart_alerts_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
      transaction_notes: {
        Row: {
          author: string
          body: string
          created_at: string
          has_reminder: boolean
          id: string
          matched_text: string | null
          parsed_due_at: string | null
          person_id: string | null
          transaction_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          author?: string
          body: string
          created_at?: string
          has_reminder?: boolean
          id?: string
          matched_text?: string | null
          parsed_due_at?: string | null
          person_id?: string | null
          transaction_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          author?: string
          body?: string
          created_at?: string
          has_reminder?: boolean
          id?: string
          matched_text?: string | null
          parsed_due_at?: string | null
          person_id?: string | null
          transaction_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transaction_notes_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transaction_notes_transaction_id_fkey"
            columns: ["transaction_id"]
            isOneToOne: false
            referencedRelation: "transactions"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      view_person_balances: {
        Row: {
          currency_id: string | null
          net_balance: number | null
          person_id: string | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
      view_person_balances_detailed: {
        Row: {
          currency_id: string | null
          last_amount: number | null
          last_date: string | null
          last_direction: string | null
          net: number | null
          person_id: string | null
          total_credit: number | null
          total_debit: number | null
          tx_count: number | null
          user_id: string | null
        }
        Relationships: [
          {
            foreignKeyName: "transactions_currency_id_fkey"
            columns: ["currency_id"]
            isOneToOne: false
            referencedRelation: "currencies"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "transactions_person_id_fkey"
            columns: ["person_id"]
            isOneToOne: false
            referencedRelation: "people"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Functions: {
      rpc_get_dashboard_totals: {
        Args: Record<PropertyKey, never>
        Returns: {
          currency_id: string
          total_owed: number
          total_owe: number
        }[]
      }
      rpc_calculate_risk_score: {
        Args: {
          p_person_id: string
        }
        Returns: {
          score: number
          classification: string
          factors: Json
        }[]
      }
      rpc_get_high_risk_customers: {
        Args: {
          p_user_id: string
          p_limit?: number
        }
        Returns: {
          person_id: string
          person_name: string
          score: number
          classification: string
          outstanding_debt: number
          overdue_count: number
          broken_promises: number
        }[]
      }
      rpc_create_promise: {
        Args: {
          p_user_id: string
          p_person_id: string
          p_amount: number
          p_promise_date: string
          p_notes?: string
        }
        Returns: string
      }
      rpc_cancel_promise: {
        Args: {
          p_promise_id: string
        }
        Returns: boolean
      }
      rpc_get_pending_promises: {
        Args: {
          p_person_id: string
        }
        Returns: {
          id: string
          amount: number
          promise_date: string
          notes: string
          status: string
          created_at: string
        }[]
      }
      rpc_get_broken_promises: {
        Args: {
          p_user_id: string
        }
        Returns: {
          id: string
          person_id: string
          person_name: string
          amount: number
          promise_date: string
          created_at: string
        }[]
      }
    }
    Enums: {
      alert_source: "note" | "reminder" | "followup" | "transaction" | "overdue"
      alert_status: "pending" | "triggered" | "done" | "dismissed" | "snoozed"
      followup_channel: "whatsapp" | "call" | "email" | "note" | "other"
      notif_category:
        | "reminder"
        | "overdue"
        | "payment_received"
        | "payment_sent"
        | "recurring"
        | "backup"
        | "system"
        | "marketing"
      notif_channel: "in_app" | "push" | "email" | "sms"
      notif_priority: "critical" | "high" | "normal" | "low"
      notif_status:
        | "pending"
        | "queued"
        | "sent"
        | "delivered"
        | "read"
        | "failed"
        | "cancelled"
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
    Enums: {},
  },
} as const
