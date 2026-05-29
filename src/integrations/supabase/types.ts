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
      abandoned_carts: {
        Row: {
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          id: string
          item_count: number
          items: Json
          last_activity_at: string
          notified_at: string | null
          notify_count: number
          recovered_at: string | null
          recovered_order_number: string | null
          recovery_token: string
          status: string
          subtotal: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          notified_at?: string | null
          notify_count?: number
          recovered_at?: string | null
          recovered_order_number?: string | null
          recovery_token?: string
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          id?: string
          item_count?: number
          items?: Json
          last_activity_at?: string
          notified_at?: string | null
          notify_count?: number
          recovered_at?: string | null
          recovered_order_number?: string | null
          recovery_token?: string
          status?: string
          subtotal?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      admin_2fa_sessions: {
        Row: {
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          revoked_at: string | null
          token_hash: string
          trusted_device: boolean
          user_agent: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          revoked_at?: string | null
          token_hash: string
          trusted_device?: boolean
          user_agent?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          revoked_at?: string | null
          token_hash?: string
          trusted_device?: boolean
          user_agent?: string | null
          user_id?: string
        }
        Relationships: []
      }
      admin_audit_log: {
        Row: {
          action: string
          actor_email: string | null
          actor_user_id: string | null
          created_at: string
          details: Json
          id: string
          target_email: string | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_email?: string | null
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          id?: string
          target_email?: string | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      admin_ip_allowlist: {
        Row: {
          active: boolean
          cidr: string
          created_at: string
          created_by: string | null
          id: string
          label: string
        }
        Insert: {
          active?: boolean
          cidr: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
        }
        Update: {
          active?: boolean
          cidr?: string
          created_at?: string
          created_by?: string | null
          id?: string
          label?: string
        }
        Relationships: []
      }
      admin_login_attempts: {
        Row: {
          created_at: string
          email: string
          id: string
          ip: string
          reason: string | null
          stage: string
          success: boolean
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          email?: string
          id?: string
          ip?: string
          reason?: string | null
          stage?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          ip?: string
          reason?: string | null
          stage?: string
          success?: boolean
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      admin_secrets: {
        Row: {
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
        }
        Insert: {
          key: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Update: {
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
        }
        Relationships: []
      }
      analytics_report_runs: {
        Row: {
          created_at: string
          error: string | null
          formats: string[]
          id: string
          meta: Json
          recipients: string[]
          status: string
          subscription_id: string | null
          trigger: string
        }
        Insert: {
          created_at?: string
          error?: string | null
          formats?: string[]
          id?: string
          meta?: Json
          recipients?: string[]
          status?: string
          subscription_id?: string | null
          trigger?: string
        }
        Update: {
          created_at?: string
          error?: string | null
          formats?: string[]
          id?: string
          meta?: Json
          recipients?: string[]
          status?: string
          subscription_id?: string | null
          trigger?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_report_runs_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "analytics_report_subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_report_subscriptions: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          enabled: boolean
          formats: string[]
          id: string
          last_run_at: string | null
          monthday: number
          name: string
          next_run_at: string | null
          recipients: string[]
          schedule: string
          send_hour: number
          updated_at: string
          weekday: number
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          formats?: string[]
          id?: string
          last_run_at?: string | null
          monthday?: number
          name: string
          next_run_at?: string | null
          recipients?: string[]
          schedule?: string
          send_hour?: number
          updated_at?: string
          weekday?: number
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          enabled?: boolean
          formats?: string[]
          id?: string
          last_run_at?: string | null
          monthday?: number
          name?: string
          next_run_at?: string | null
          recipients?: string[]
          schedule?: string
          send_hour?: number
          updated_at?: string
          weekday?: number
        }
        Relationships: []
      }
      analytics_saved_views: {
        Row: {
          config: Json
          created_at: string
          created_by: string | null
          description: string | null
          id: string
          is_pinned: boolean
          name: string
          updated_at: string
        }
        Insert: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          name: string
          updated_at?: string
        }
        Update: {
          config?: Json
          created_at?: string
          created_by?: string | null
          description?: string | null
          id?: string
          is_pinned?: boolean
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      app_secrets: {
        Row: {
          key: string
          updated_at: string
          value: string
        }
        Insert: {
          key: string
          updated_at?: string
          value?: string
        }
        Update: {
          key?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
      }
      blog_posts: {
        Row: {
          author: string
          author_avatar: string | null
          category: string
          content: string | null
          created_at: string
          excerpt: string | null
          featured: boolean
          id: string
          image: string | null
          published: boolean
          read_time: number | null
          slug: string
          tags: Json | null
          title: string
          updated_at: string
        }
        Insert: {
          author?: string
          author_avatar?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id: string
          image?: string | null
          published?: boolean
          read_time?: number | null
          slug: string
          tags?: Json | null
          title: string
          updated_at?: string
        }
        Update: {
          author?: string
          author_avatar?: string | null
          category?: string
          content?: string | null
          created_at?: string
          excerpt?: string | null
          featured?: boolean
          id?: string
          image?: string | null
          published?: boolean
          read_time?: number | null
          slug?: string
          tags?: Json | null
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      brands: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          id: string
          logo_url: string | null
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          id?: string
          logo_url?: string | null
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      bulk_campaigns: {
        Row: {
          body: string
          channel: string
          created_at: string
          failed_count: number
          id: string
          name: string
          payload: Json
          scheduled_at: string | null
          segment_id: string | null
          sent_at: string | null
          sent_count: number
          status: string
          subject: string | null
          template: string
          total_recipients: number
          updated_at: string
        }
        Insert: {
          body?: string
          channel: string
          created_at?: string
          failed_count?: number
          id?: string
          name: string
          payload?: Json
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          template?: string
          total_recipients?: number
          updated_at?: string
        }
        Update: {
          body?: string
          channel?: string
          created_at?: string
          failed_count?: number
          id?: string
          name?: string
          payload?: Json
          scheduled_at?: string | null
          segment_id?: string | null
          sent_at?: string | null
          sent_count?: number
          status?: string
          subject?: string | null
          template?: string
          total_recipients?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "bulk_campaigns_segment_id_fkey"
            columns: ["segment_id"]
            isOneToOne: false
            referencedRelation: "customer_segments"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          featured: boolean
          icon: string | null
          id: string
          image_url: string | null
          name: string
          parent_id: string | null
          seo_description: string | null
          seo_keywords: string | null
          seo_title: string | null
          slug: string
          sort_order: number
          updated_at: string
          visible_on_pages: string[]
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          name: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug: string
          sort_order?: number
          updated_at?: string
          visible_on_pages?: string[]
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          featured?: boolean
          icon?: string | null
          id?: string
          image_url?: string | null
          name?: string
          parent_id?: string | null
          seo_description?: string | null
          seo_keywords?: string | null
          seo_title?: string | null
          slug?: string
          sort_order?: number
          updated_at?: string
          visible_on_pages?: string[]
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_conversations: {
        Row: {
          assigned_admin_id: string | null
          created_at: string
          guest_token: string | null
          id: string
          last_message_at: string
          meta: Json
          status: string
          subject: string | null
          user_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          last_message_at?: string
          meta?: Json
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          created_at?: string
          guest_token?: string | null
          id?: string
          last_message_at?: string
          meta?: Json
          status?: string
          subject?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      chat_kb_articles: {
        Row: {
          active: boolean
          body: string
          category: string
          created_at: string
          embedded_at: string | null
          embedding: Json | null
          id: string
          priority: number
          tags: string[]
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          body: string
          category?: string
          created_at?: string
          embedded_at?: string | null
          embedding?: Json | null
          id?: string
          priority?: number
          tags?: string[]
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          body?: string
          category?: string
          created_at?: string
          embedded_at?: string | null
          embedding?: Json | null
          id?: string
          priority?: number
          tags?: string[]
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          content: string
          conversation_id: string
          created_at: string
          id: string
          meta: Json
          role: string
        }
        Insert: {
          content: string
          conversation_id: string
          created_at?: string
          id?: string
          meta?: Json
          role: string
        }
        Update: {
          content?: string
          conversation_id?: string
          created_at?: string
          id?: string
          meta?: Json
          role?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "chat_conversations"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_settings: {
        Row: {
          api_key_secret_name: string
          brand_name: string
          confidence_threshold: number
          enable_order_context: boolean
          enabled: boolean
          escalate_keywords: string[]
          escalate_on_low_confidence: boolean
          escalate_on_negative_sentiment: boolean
          escalate_on_no_kb: boolean
          escalation_after_messages: number
          escalation_label: string
          id: string
          max_failed_turns: number
          model: string
          provider: string
          quick_actions: Json
          system_prompt: string
          updated_at: string
          welcome_message: string
        }
        Insert: {
          api_key_secret_name?: string
          brand_name?: string
          confidence_threshold?: number
          enable_order_context?: boolean
          enabled?: boolean
          escalate_keywords?: string[]
          escalate_on_low_confidence?: boolean
          escalate_on_negative_sentiment?: boolean
          escalate_on_no_kb?: boolean
          escalation_after_messages?: number
          escalation_label?: string
          id?: string
          max_failed_turns?: number
          model?: string
          provider?: string
          quick_actions?: Json
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Update: {
          api_key_secret_name?: string
          brand_name?: string
          confidence_threshold?: number
          enable_order_context?: boolean
          enabled?: boolean
          escalate_keywords?: string[]
          escalate_on_low_confidence?: boolean
          escalate_on_negative_sentiment?: boolean
          escalate_on_no_kb?: boolean
          escalation_after_messages?: number
          escalation_label?: string
          id?: string
          max_failed_turns?: number
          model?: string
          provider?: string
          quick_actions?: Json
          system_prompt?: string
          updated_at?: string
          welcome_message?: string
        }
        Relationships: []
      }
      combo_rules: {
        Row: {
          active: boolean
          created_at: string
          description: string | null
          eligible_categories: Json
          eligible_product_ids: Json
          extra_discount_type: string
          extra_discount_value: number
          id: string
          max_items: number | null
          min_items: number
          name: string
          sort_order: number
          stackable: boolean
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          description?: string | null
          eligible_categories?: Json
          eligible_product_ids?: Json
          extra_discount_type?: string
          extra_discount_value?: number
          id: string
          max_items?: number | null
          min_items?: number
          name: string
          sort_order?: number
          stackable?: boolean
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          description?: string | null
          eligible_categories?: Json
          eligible_product_ids?: Json
          extra_discount_type?: string
          extra_discount_value?: number
          id?: string
          max_items?: number | null
          min_items?: number
          name?: string
          sort_order?: number
          stackable?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      contact_submissions: {
        Row: {
          created_at: string
          email: string
          id: string
          message: string
          name: string
          phone: string | null
          status: string
          subject: string
        }
        Insert: {
          created_at?: string
          email: string
          id: string
          message: string
          name: string
          phone?: string | null
          status?: string
          subject?: string
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          message?: string
          name?: string
          phone?: string | null
          status?: string
          subject?: string
        }
        Relationships: []
      }
      coupons: {
        Row: {
          active: boolean
          code: string
          created_at: string
          expires_at: string | null
          is_public: boolean
          label: string
          max_discount: number | null
          min_order_value: number | null
          type: string
          usage_count: number
          usage_limit: number | null
          value: number
        }
        Insert: {
          active?: boolean
          code: string
          created_at?: string
          expires_at?: string | null
          is_public?: boolean
          label?: string
          max_discount?: number | null
          min_order_value?: number | null
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value: number
        }
        Update: {
          active?: boolean
          code?: string
          created_at?: string
          expires_at?: string | null
          is_public?: boolean
          label?: string
          max_discount?: number | null
          min_order_value?: number | null
          type?: string
          usage_count?: number
          usage_limit?: number | null
          value?: number
        }
        Relationships: []
      }
      customer_segments: {
        Row: {
          cached_at: string | null
          cached_count: number
          created_at: string
          description: string | null
          id: string
          name: string
          rules: Json
          updated_at: string
        }
        Insert: {
          cached_at?: string | null
          cached_count?: number
          created_at?: string
          description?: string | null
          id?: string
          name: string
          rules?: Json
          updated_at?: string
        }
        Update: {
          cached_at?: string | null
          cached_count?: number
          created_at?: string
          description?: string | null
          id?: string
          name?: string
          rules?: Json
          updated_at?: string
        }
        Relationships: []
      }
      dimensions: {
        Row: {
          height: number
          id: string
          length: number
          name: string
          unit: string
          width: number
        }
        Insert: {
          height?: number
          id: string
          length?: number
          name: string
          unit?: string
          width?: number
        }
        Update: {
          height?: number
          id?: string
          length?: number
          name?: string
          unit?: string
          width?: number
        }
        Relationships: []
      }
      email_otp_challenges: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          ip: string | null
          user_id: string
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          ip?: string | null
          user_id: string
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          ip?: string | null
          user_id?: string
        }
        Relationships: []
      }
      faqs: {
        Row: {
          answer: string
          category: string
          enabled: boolean
          id: string
          order: number
          question: string
        }
        Insert: {
          answer: string
          category?: string
          enabled?: boolean
          id: string
          order?: number
          question: string
        }
        Update: {
          answer?: string
          category?: string
          enabled?: boolean
          id?: string
          order?: number
          question?: string
        }
        Relationships: []
      }
      feature_flags: {
        Row: {
          config: Json
          created_at: string
          description: string | null
          enabled: boolean
          key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          config?: Json
          created_at?: string
          description?: string | null
          enabled?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      gift_cards: {
        Row: {
          amount: number
          balance: number
          code: string
          created_at: string
          currency: string
          expires_at: string | null
          id: string
          issued_by_user_id: string | null
          message: string | null
          notes: string | null
          recipient_email: string | null
          recipient_name: string | null
          redeemed_at: string | null
          redeemed_by_user_id: string | null
          sender_name: string | null
          source: string
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          balance: number
          code: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          issued_by_user_id?: string | null
          message?: string | null
          notes?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Update: {
          amount?: number
          balance?: number
          code?: string
          created_at?: string
          currency?: string
          expires_at?: string | null
          id?: string
          issued_by_user_id?: string | null
          message?: string | null
          notes?: string | null
          recipient_email?: string | null
          recipient_name?: string | null
          redeemed_at?: string | null
          redeemed_by_user_id?: string | null
          sender_name?: string | null
          source?: string
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      global_reviews: {
        Row: {
          avatar: string | null
          comment: string
          created_at: string
          helpful: number
          id: string
          images: Json | null
          name: string
          pinned: boolean
          product_id: string | null
          rating: number
          show_on_home: boolean
          show_on_testimonials: boolean
          source: string | null
          title: string | null
          variant: string | null
          verified: boolean
          video: string | null
        }
        Insert: {
          avatar?: string | null
          comment: string
          created_at?: string
          helpful?: number
          id: string
          images?: Json | null
          name: string
          pinned?: boolean
          product_id?: string | null
          rating?: number
          show_on_home?: boolean
          show_on_testimonials?: boolean
          source?: string | null
          title?: string | null
          variant?: string | null
          verified?: boolean
          video?: string | null
        }
        Update: {
          avatar?: string | null
          comment?: string
          created_at?: string
          helpful?: number
          id?: string
          images?: Json | null
          name?: string
          pinned?: boolean
          product_id?: string | null
          rating?: number
          show_on_home?: boolean
          show_on_testimonials?: boolean
          source?: string | null
          title?: string | null
          variant?: string | null
          verified?: boolean
          video?: string | null
        }
        Relationships: []
      }
      guardian_points: {
        Row: {
          confirmed_reports_count: number
          created_at: string
          points: number
          reports_count: number
          tier: string
          updated_at: string
          user_id: string
          verifications_count: number
        }
        Insert: {
          confirmed_reports_count?: number
          created_at?: string
          points?: number
          reports_count?: number
          tier?: string
          updated_at?: string
          user_id: string
          verifications_count?: number
        }
        Update: {
          confirmed_reports_count?: number
          created_at?: string
          points?: number
          reports_count?: number
          tier?: string
          updated_at?: string
          user_id?: string
          verifications_count?: number
        }
        Relationships: []
      }
      homepage_config: {
        Row: {
          config: Json
          key: string
          updated_at: string
        }
        Insert: {
          config?: Json
          key?: string
          updated_at?: string
        }
        Update: {
          config?: Json
          key?: string
          updated_at?: string
        }
        Relationships: []
      }
      invoices: {
        Row: {
          created_at: string
          emailed_at: string | null
          id: string
          invoice_number: string
          issued_at: string
          order_id: string
          order_number: string
          pdf_path: string | null
          snapshot: Json
        }
        Insert: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          invoice_number: string
          issued_at?: string
          order_id: string
          order_number: string
          pdf_path?: string | null
          snapshot?: Json
        }
        Update: {
          created_at?: string
          emailed_at?: string | null
          id?: string
          invoice_number?: string
          issued_at?: string
          order_id?: string
          order_number?: string
          pdf_path?: string | null
          snapshot?: Json
        }
        Relationships: []
      }
      login_lockouts: {
        Row: {
          created_at: string
          email: string | null
          fails: number
          id: string
          ip: string | null
          last_attempt: string
          locked_until: string | null
        }
        Insert: {
          created_at?: string
          email?: string | null
          fails?: number
          id?: string
          ip?: string | null
          last_attempt?: string
          locked_until?: string | null
        }
        Update: {
          created_at?: string
          email?: string | null
          fails?: number
          id?: string
          ip?: string | null
          last_attempt?: string
          locked_until?: string | null
        }
        Relationships: []
      }
      loyalty_status: {
        Row: {
          last_recalc_at: string
          lifetime_spend: number
          order_count: number
          tier_id: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          last_recalc_at?: string
          lifetime_spend?: number
          order_count?: number
          tier_id?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          last_recalc_at?: string
          lifetime_spend?: number
          order_count?: number
          tier_id?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "loyalty_status_tier_id_fkey"
            columns: ["tier_id"]
            isOneToOne: false
            referencedRelation: "loyalty_tiers"
            referencedColumns: ["id"]
          },
        ]
      }
      loyalty_tiers: {
        Row: {
          active: boolean
          badge_color: string
          created_at: string
          discount_percent: number
          free_shipping: boolean
          id: string
          min_lifetime_spend: number
          name: string
          perks: Json
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          badge_color?: string
          created_at?: string
          discount_percent?: number
          free_shipping?: boolean
          id?: string
          min_lifetime_spend?: number
          name: string
          perks?: Json
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          badge_color?: string
          created_at?: string
          discount_percent?: number
          free_shipping?: boolean
          id?: string
          min_lifetime_spend?: number
          name?: string
          perks?: Json
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      marketing_events: {
        Row: {
          channel: string
          created_at: string
          currency: string | null
          error: string | null
          event_name: string
          id: string
          order_number: string | null
          payload: Json
          response: Json | null
          status: string
          user_id: string | null
          value: number | null
        }
        Insert: {
          channel: string
          created_at?: string
          currency?: string | null
          error?: string | null
          event_name: string
          id?: string
          order_number?: string | null
          payload?: Json
          response?: Json | null
          status?: string
          user_id?: string | null
          value?: number | null
        }
        Update: {
          channel?: string
          created_at?: string
          currency?: string | null
          error?: string | null
          event_name?: string
          id?: string
          order_number?: string | null
          payload?: Json
          response?: Json | null
          status?: string
          user_id?: string | null
          value?: number | null
        }
        Relationships: []
      }
      marketing_settings: {
        Row: {
          ab_experiments: Json
          bing_verification: string | null
          extras: Json
          fb_capi_access_token: string | null
          fb_capi_pixel_id: string | null
          fb_capi_test_event_code: string | null
          ga4_api_secret: string | null
          ga4_measurement_id: string | null
          gsc_verification: string | null
          hreflang: Json
          key: string
          linkedin_partner_id: string | null
          og_default_image: string | null
          og_site_name: string | null
          org_address: Json
          org_legal_name: string | null
          org_phone: string | null
          org_same_as: Json
          pinterest_tag_id: string | null
          pinterest_verification: string | null
          quora_pixel_id: string | null
          reddit_pixel_id: string | null
          robots_txt: string | null
          twitter_card_type: string | null
          twitter_pixel_id: string | null
          twitter_site_handle: string | null
          updated_at: string
          yandex_verification: string | null
        }
        Insert: {
          ab_experiments?: Json
          bing_verification?: string | null
          extras?: Json
          fb_capi_access_token?: string | null
          fb_capi_pixel_id?: string | null
          fb_capi_test_event_code?: string | null
          ga4_api_secret?: string | null
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          hreflang?: Json
          key?: string
          linkedin_partner_id?: string | null
          og_default_image?: string | null
          og_site_name?: string | null
          org_address?: Json
          org_legal_name?: string | null
          org_phone?: string | null
          org_same_as?: Json
          pinterest_tag_id?: string | null
          pinterest_verification?: string | null
          quora_pixel_id?: string | null
          reddit_pixel_id?: string | null
          robots_txt?: string | null
          twitter_card_type?: string | null
          twitter_pixel_id?: string | null
          twitter_site_handle?: string | null
          updated_at?: string
          yandex_verification?: string | null
        }
        Update: {
          ab_experiments?: Json
          bing_verification?: string | null
          extras?: Json
          fb_capi_access_token?: string | null
          fb_capi_pixel_id?: string | null
          fb_capi_test_event_code?: string | null
          ga4_api_secret?: string | null
          ga4_measurement_id?: string | null
          gsc_verification?: string | null
          hreflang?: Json
          key?: string
          linkedin_partner_id?: string | null
          og_default_image?: string | null
          og_site_name?: string | null
          org_address?: Json
          org_legal_name?: string | null
          org_phone?: string | null
          org_same_as?: Json
          pinterest_tag_id?: string | null
          pinterest_verification?: string | null
          quora_pixel_id?: string | null
          reddit_pixel_id?: string | null
          robots_txt?: string | null
          twitter_card_type?: string | null
          twitter_pixel_id?: string | null
          twitter_site_handle?: string | null
          updated_at?: string
          yandex_verification?: string | null
        }
        Relationships: []
      }
      notification_log: {
        Row: {
          customer_name: string
          email: string | null
          id: string
          items: string
          message: string
          order_number: string
          sent_at: string
          total: number
          whatsapp_link: string | null
        }
        Insert: {
          customer_name: string
          email?: string | null
          id: string
          items?: string
          message?: string
          order_number: string
          sent_at?: string
          total: number
          whatsapp_link?: string | null
        }
        Update: {
          customer_name?: string
          email?: string | null
          id?: string
          items?: string
          message?: string
          order_number?: string
          sent_at?: string
          total?: number
          whatsapp_link?: string | null
        }
        Relationships: []
      }
      notification_queue: {
        Row: {
          attempts: number
          channel: string
          created_at: string
          error: string | null
          id: string
          next_attempt_at: string | null
          order_number: string | null
          payload: Json
          recipient: string
          sent_at: string | null
          status: string
          template: string
          user_id: string | null
        }
        Insert: {
          attempts?: number
          channel: string
          created_at?: string
          error?: string | null
          id?: string
          next_attempt_at?: string | null
          order_number?: string | null
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: string
          template: string
          user_id?: string | null
        }
        Update: {
          attempts?: number
          channel?: string
          created_at?: string
          error?: string | null
          id?: string
          next_attempt_at?: string | null
          order_number?: string | null
          payload?: Json
          recipient?: string
          sent_at?: string | null
          status?: string
          template?: string
          user_id?: string | null
        }
        Relationships: []
      }
      offers: {
        Row: {
          active: boolean
          applies_to_flavors: Json
          applies_to_sizes: Json
          badge_label: string | null
          created_at: string
          description: string | null
          expires_at: string | null
          free_product_id: string | null
          free_product_name: string | null
          id: string
          max_order_value: number | null
          min_order_value: number | null
          priority: number
          scope_type: string
          scope_values: Json
          starts_at: string | null
          terms: string | null
          title: string
          type: string
          updated_at: string
          value: number
        }
        Insert: {
          active?: boolean
          applies_to_flavors?: Json
          applies_to_sizes?: Json
          badge_label?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          free_product_id?: string | null
          free_product_name?: string | null
          id: string
          max_order_value?: number | null
          min_order_value?: number | null
          priority?: number
          scope_type?: string
          scope_values?: Json
          starts_at?: string | null
          terms?: string | null
          title: string
          type?: string
          updated_at?: string
          value?: number
        }
        Update: {
          active?: boolean
          applies_to_flavors?: Json
          applies_to_sizes?: Json
          badge_label?: string | null
          created_at?: string
          description?: string | null
          expires_at?: string | null
          free_product_id?: string | null
          free_product_name?: string | null
          id?: string
          max_order_value?: number | null
          min_order_value?: number | null
          priority?: number
          scope_type?: string
          scope_values?: Json
          starts_at?: string | null
          terms?: string | null
          title?: string
          type?: string
          updated_at?: string
          value?: number
        }
        Relationships: []
      }
      order_modify_requests: {
        Row: {
          access_token: string
          admin_notes: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_notes: string | null
          customer_phone: string | null
          id: string
          order_id: string | null
          order_number: string
          original_address: Json
          original_items: Json
          requested_address: Json | null
          requested_items: Json | null
          requested_phone: string | null
          status: string
          submitted_at: string | null
          token_expires_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          order_number: string
          original_address?: Json
          original_items?: Json
          requested_address?: Json | null
          requested_items?: Json | null
          requested_phone?: string | null
          status?: string
          submitted_at?: string | null
          token_expires_at: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          admin_notes?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_notes?: string | null
          customer_phone?: string | null
          id?: string
          order_id?: string | null
          order_number?: string
          original_address?: Json
          original_items?: Json
          requested_address?: Json | null
          requested_items?: Json | null
          requested_phone?: string | null
          status?: string
          submitted_at?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      order_tracking: {
        Row: {
          awb_number: string | null
          courier: string | null
          created_at: string
          current_status: string | null
          estimated_delivery: string | null
          id: string
          last_synced_at: string | null
          manual_override: boolean
          order_id: string
          order_number: string
          status_history: Json
          tracking_url: string | null
          updated_at: string
        }
        Insert: {
          awb_number?: string | null
          courier?: string | null
          created_at?: string
          current_status?: string | null
          estimated_delivery?: string | null
          id?: string
          last_synced_at?: string | null
          manual_override?: boolean
          order_id: string
          order_number: string
          status_history?: Json
          tracking_url?: string | null
          updated_at?: string
        }
        Update: {
          awb_number?: string | null
          courier?: string | null
          created_at?: string
          current_status?: string | null
          estimated_delivery?: string | null
          id?: string
          last_synced_at?: string | null
          manual_override?: boolean
          order_id?: string
          order_number?: string
          status_history?: Json
          tracking_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      orders: {
        Row: {
          auto_ship_attempts: number
          auto_ship_last_error: string | null
          auto_ship_scheduled_at: string | null
          coupon_code: string | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          discount: number | null
          id: string
          items: Json
          notes: string | null
          order_number: string
          order_status: string
          payment_method: string | null
          payment_status: string
          priority_shipping: boolean
          shipping_address: Json
          shipping_cost: number | null
          subtotal: number | null
          total: number
          updated_at: string
          user_id: string | null
        }
        Insert: {
          auto_ship_attempts?: number
          auto_ship_last_error?: string | null
          auto_ship_scheduled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id: string
          items?: Json
          notes?: string | null
          order_number: string
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          priority_shipping?: boolean
          shipping_address?: Json
          shipping_cost?: number | null
          subtotal?: number | null
          total: number
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          auto_ship_attempts?: number
          auto_ship_last_error?: string | null
          auto_ship_scheduled_at?: string | null
          coupon_code?: string | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          discount?: number | null
          id?: string
          items?: Json
          notes?: string | null
          order_number?: string
          order_status?: string
          payment_method?: string | null
          payment_status?: string
          priority_shipping?: boolean
          shipping_address?: Json
          shipping_cost?: number | null
          subtotal?: number | null
          total?: number
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      packaging_boxes: {
        Row: {
          height: number
          id: string
          length: number
          max_weight: number
          name: string
          unit: string
          weight: number
          width: number
        }
        Insert: {
          height?: number
          id: string
          length?: number
          max_weight?: number
          name: string
          unit?: string
          weight?: number
          width?: number
        }
        Update: {
          height?: number
          id?: string
          length?: number
          max_weight?: number
          name?: string
          unit?: string
          weight?: number
          width?: number
        }
        Relationships: []
      }
      page_backgrounds: {
        Row: {
          blend_mode: string
          enabled: boolean
          image_url: string | null
          opacity: number
          page_key: string
          position: string
          repeat: string
          size: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          blend_mode?: string
          enabled?: boolean
          image_url?: string | null
          opacity?: number
          page_key: string
          position?: string
          repeat?: string
          size?: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          blend_mode?: string
          enabled?: boolean
          image_url?: string | null
          opacity?: number
          page_key?: string
          position?: string
          repeat?: string
          size?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: []
      }
      payment_offers: {
        Row: {
          active: boolean
          code: string | null
          created_at: string
          description: string | null
          id: string
          link: string | null
          logo: string | null
          max_cashback: number | null
          provider: string | null
          sort_order: number
          title: string
          updated_at: string
        }
        Insert: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id: string
          link?: string | null
          logo?: string | null
          max_cashback?: number | null
          provider?: string | null
          sort_order?: number
          title: string
          updated_at?: string
        }
        Update: {
          active?: boolean
          code?: string | null
          created_at?: string
          description?: string | null
          id?: string
          link?: string | null
          logo?: string | null
          max_cashback?: number | null
          provider?: string | null
          sort_order?: number
          title?: string
          updated_at?: string
        }
        Relationships: []
      }
      payment_transactions: {
        Row: {
          amount: number
          created_at: string
          currency: string
          id: string
          order_number: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string | null
          raw: Json
          signature: string | null
          status: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          id?: string
          order_number: string
          provider: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          raw?: Json
          signature?: string | null
          status: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          id?: string
          order_number?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string | null
          raw?: Json
          signature?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      permission_audit_log: {
        Row: {
          action: string
          actor_id: string | null
          created_at: string
          id: string
          new_value: Json | null
          note: string | null
          old_value: Json | null
          permission_code: string | null
          target_role: Database["public"]["Enums"]["app_role"] | null
          target_user_id: string | null
        }
        Insert: {
          action: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          permission_code?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
        }
        Update: {
          action?: string
          actor_id?: string | null
          created_at?: string
          id?: string
          new_value?: Json | null
          note?: string | null
          old_value?: Json | null
          permission_code?: string | null
          target_role?: Database["public"]["Enums"]["app_role"] | null
          target_user_id?: string | null
        }
        Relationships: []
      }
      permissions: {
        Row: {
          category: string
          code: string
          created_at: string
          description: string | null
          is_dangerous: boolean
          label: string
          sort_order: number
        }
        Insert: {
          category: string
          code: string
          created_at?: string
          description?: string | null
          is_dangerous?: boolean
          label: string
          sort_order?: number
        }
        Update: {
          category?: string
          code?: string
          created_at?: string
          description?: string | null
          is_dangerous?: boolean
          label?: string
          sort_order?: number
        }
        Relationships: []
      }
      phone_otps: {
        Row: {
          attempts: number
          code_hash: string
          consumed_at: string | null
          created_at: string
          expires_at: string
          id: string
          last_sent_at: string
          phone: string
          send_count_hour: number
        }
        Insert: {
          attempts?: number
          code_hash: string
          consumed_at?: string | null
          created_at?: string
          expires_at: string
          id?: string
          last_sent_at?: string
          phone: string
          send_count_hour?: number
        }
        Update: {
          attempts?: number
          code_hash?: string
          consumed_at?: string | null
          created_at?: string
          expires_at?: string
          id?: string
          last_sent_at?: string
          phone?: string
          send_count_hour?: number
        }
        Relationships: []
      }
      product_auth_checkpoints: {
        Row: {
          actor_user_id: string | null
          batch_code: string
          created_at: string
          id: string
          location: string | null
          notes: string | null
          occurred_at: string
          stage: string
        }
        Insert: {
          actor_user_id?: string | null
          batch_code: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          occurred_at?: string
          stage: string
        }
        Update: {
          actor_user_id?: string | null
          batch_code?: string
          created_at?: string
          id?: string
          location?: string | null
          notes?: string | null
          occurred_at?: string
          stage?: string
        }
        Relationships: []
      }
      product_auth_codes: {
        Row: {
          batch_code: string
          code: string
          created_at: string
          distributor_id: string | null
          expires_at: string | null
          first_scan_at: string | null
          first_scan_city: string | null
          first_scan_country: string | null
          first_scan_fingerprint: string | null
          first_scan_ip: string | null
          first_scan_region: string | null
          first_scan_user_agent: string | null
          geo_history: Json
          hidden_code_hash: string
          hmac_signature: string
          id: string
          last_scan_at: string | null
          manufactured_at: string
          notes: string | null
          product_id: string | null
          registered_at: string | null
          registered_user_id: string | null
          scan_count: number
          scan_reward_paid: boolean
          status: Database["public"]["Enums"]["product_auth_status"]
          updated_at: string
          warranty_until: string | null
        }
        Insert: {
          batch_code: string
          code: string
          created_at?: string
          distributor_id?: string | null
          expires_at?: string | null
          first_scan_at?: string | null
          first_scan_city?: string | null
          first_scan_country?: string | null
          first_scan_fingerprint?: string | null
          first_scan_ip?: string | null
          first_scan_region?: string | null
          first_scan_user_agent?: string | null
          geo_history?: Json
          hidden_code_hash: string
          hmac_signature: string
          id?: string
          last_scan_at?: string | null
          manufactured_at?: string
          notes?: string | null
          product_id?: string | null
          registered_at?: string | null
          registered_user_id?: string | null
          scan_count?: number
          scan_reward_paid?: boolean
          status?: Database["public"]["Enums"]["product_auth_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Update: {
          batch_code?: string
          code?: string
          created_at?: string
          distributor_id?: string | null
          expires_at?: string | null
          first_scan_at?: string | null
          first_scan_city?: string | null
          first_scan_country?: string | null
          first_scan_fingerprint?: string | null
          first_scan_ip?: string | null
          first_scan_region?: string | null
          first_scan_user_agent?: string | null
          geo_history?: Json
          hidden_code_hash?: string
          hmac_signature?: string
          id?: string
          last_scan_at?: string | null
          manufactured_at?: string
          notes?: string | null
          product_id?: string | null
          registered_at?: string | null
          registered_user_id?: string | null
          scan_count?: number
          scan_reward_paid?: boolean
          status?: Database["public"]["Enums"]["product_auth_status"]
          updated_at?: string
          warranty_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_auth_codes_distributor_id_fkey"
            columns: ["distributor_id"]
            isOneToOne: false
            referencedRelation: "product_auth_distributors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_auth_codes_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_auth_distributors: {
        Row: {
          contact_email: string | null
          contact_name: string | null
          contact_phone: string | null
          created_at: string
          id: string
          name: string
          notes: string | null
          region: string | null
          status: string
          updated_at: string
        }
        Insert: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name: string
          notes?: string | null
          region?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          contact_email?: string | null
          contact_name?: string | null
          contact_phone?: string | null
          created_at?: string
          id?: string
          name?: string
          notes?: string | null
          region?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_legal_cases: {
        Row: {
          body_markdown: string
          case_type: string
          created_at: string
          created_by: string | null
          id: string
          listing_id: string | null
          recipient: string | null
          report_id: string | null
          sent_at: string | null
          status: string
          subject: string
          updated_at: string
        }
        Insert: {
          body_markdown: string
          case_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          recipient?: string | null
          report_id?: string | null
          sent_at?: string | null
          status?: string
          subject: string
          updated_at?: string
        }
        Update: {
          body_markdown?: string
          case_type?: string
          created_at?: string
          created_by?: string | null
          id?: string
          listing_id?: string | null
          recipient?: string | null
          report_id?: string | null
          sent_at?: string | null
          status?: string
          subject?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_auth_legal_cases_listing_id_fkey"
            columns: ["listing_id"]
            isOneToOne: false
            referencedRelation: "product_auth_marketplace_listings"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_auth_legal_cases_report_id_fkey"
            columns: ["report_id"]
            isOneToOne: false
            referencedRelation: "product_auth_reports"
            referencedColumns: ["id"]
          },
        ]
      }
      product_auth_marketplace_listings: {
        Row: {
          ai_confidence: number | null
          ai_notes: string | null
          ai_verdict: string | null
          created_at: string
          created_by: string | null
          discount_pct: number | null
          id: string
          listed_price: number | null
          listing_url: string
          our_mrp: number | null
          platform: string
          resolved_at: string | null
          seller_name: string | null
          status: string
          updated_at: string
        }
        Insert: {
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_verdict?: string | null
          created_at?: string
          created_by?: string | null
          discount_pct?: number | null
          id?: string
          listed_price?: number | null
          listing_url: string
          our_mrp?: number | null
          platform: string
          resolved_at?: string | null
          seller_name?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_verdict?: string | null
          created_at?: string
          created_by?: string | null
          discount_pct?: number | null
          id?: string
          listed_price?: number | null
          listing_url?: string
          our_mrp?: number | null
          platform?: string
          resolved_at?: string | null
          seller_name?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: []
      }
      product_auth_reports: {
        Row: {
          admin_notes: string | null
          ai_confidence: number | null
          ai_notes: string | null
          ai_verdict: string | null
          auth_code_id: string | null
          bounty_amount: number | null
          bounty_paid_at: string | null
          code: string | null
          created_at: string
          details: string | null
          id: string
          ip: string | null
          photo_urls: Json | null
          purchase_location: string | null
          reason: string
          reporter_email: string | null
          reporter_name: string | null
          reporter_phone: string | null
          reporter_user_id: string | null
          status: string
          updated_at: string
        }
        Insert: {
          admin_notes?: string | null
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_verdict?: string | null
          auth_code_id?: string | null
          bounty_amount?: number | null
          bounty_paid_at?: string | null
          code?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip?: string | null
          photo_urls?: Json | null
          purchase_location?: string | null
          reason: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Update: {
          admin_notes?: string | null
          ai_confidence?: number | null
          ai_notes?: string | null
          ai_verdict?: string | null
          auth_code_id?: string | null
          bounty_amount?: number | null
          bounty_paid_at?: string | null
          code?: string | null
          created_at?: string
          details?: string | null
          id?: string
          ip?: string | null
          photo_urls?: Json | null
          purchase_location?: string | null
          reason?: string
          reporter_email?: string | null
          reporter_name?: string | null
          reporter_phone?: string | null
          reporter_user_id?: string | null
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_auth_reports_auth_code_id_fkey"
            columns: ["auth_code_id"]
            isOneToOne: false
            referencedRelation: "product_auth_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_auth_scans: {
        Row: {
          accepted: boolean
          auth_code_id: string | null
          city: string | null
          code: string
          country: string | null
          fingerprint: string | null
          hidden_code_provided: boolean
          id: string
          ip: string | null
          region: string | null
          rejection_reason: string | null
          scanned_at: string
          seal_ai_confidence: number | null
          seal_ai_notes: string | null
          seal_ai_verdict: string | null
          seal_photo_url: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          accepted?: boolean
          auth_code_id?: string | null
          city?: string | null
          code: string
          country?: string | null
          fingerprint?: string | null
          hidden_code_provided?: boolean
          id?: string
          ip?: string | null
          region?: string | null
          rejection_reason?: string | null
          scanned_at?: string
          seal_ai_confidence?: number | null
          seal_ai_notes?: string | null
          seal_ai_verdict?: string | null
          seal_photo_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          accepted?: boolean
          auth_code_id?: string | null
          city?: string | null
          code?: string
          country?: string | null
          fingerprint?: string | null
          hidden_code_provided?: boolean
          id?: string
          ip?: string | null
          region?: string | null
          rejection_reason?: string | null
          scanned_at?: string
          seal_ai_confidence?: number | null
          seal_ai_notes?: string | null
          seal_ai_verdict?: string | null
          seal_photo_url?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_auth_scans_auth_code_id_fkey"
            columns: ["auth_code_id"]
            isOneToOne: false
            referencedRelation: "product_auth_codes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_cooccurrence: {
        Row: {
          product_id: string
          refreshed_at: string
          related_id: string
          score: number
        }
        Insert: {
          product_id: string
          refreshed_at?: string
          related_id: string
          score?: number
        }
        Update: {
          product_id?: string
          refreshed_at?: string
          related_id?: string
          score?: number
        }
        Relationships: []
      }
      product_flavors: {
        Row: {
          active: boolean
          created_at: string
          hex_color: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          active?: boolean
          created_at?: string
          hex_color?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          active?: boolean
          created_at?: string
          hex_color?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      product_questions: {
        Row: {
          answer: string | null
          answered_at: string | null
          answered_by_name: string | null
          answered_by_user_id: string | null
          asker_name: string
          created_at: string
          helpful_count: number
          id: string
          product_id: string
          product_name: string
          question: string
          status: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          answered_by_name?: string | null
          answered_by_user_id?: string | null
          asker_name?: string
          created_at?: string
          helpful_count?: number
          id?: string
          product_id: string
          product_name?: string
          question: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          answered_by_name?: string | null
          answered_by_user_id?: string | null
          asker_name?: string
          created_at?: string
          helpful_count?: number
          id?: string
          product_id?: string
          product_name?: string
          question?: string
          status?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      product_reviews: {
        Row: {
          avatar: string | null
          comment: string
          created_at: string
          helpful: number
          id: string
          images: Json | null
          name: string
          pinned: boolean
          product_id: string
          rating: number
          source: string | null
          title: string | null
          variant: string | null
          verified: boolean
          video: string | null
        }
        Insert: {
          avatar?: string | null
          comment: string
          created_at?: string
          helpful?: number
          id: string
          images?: Json | null
          name: string
          pinned?: boolean
          product_id: string
          rating?: number
          source?: string | null
          title?: string | null
          variant?: string | null
          verified?: boolean
          video?: string | null
        }
        Update: {
          avatar?: string | null
          comment?: string
          created_at?: string
          helpful?: number
          id?: string
          images?: Json | null
          name?: string
          pinned?: boolean
          product_id?: string
          rating?: number
          source?: string | null
          title?: string | null
          variant?: string | null
          verified?: boolean
          video?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_reviews_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_sizes: {
        Row: {
          active: boolean
          created_at: string
          id: string
          name: string
          slug: string
          sort_order: number
          updated_at: string
          value_grams: number
        }
        Insert: {
          active?: boolean
          created_at?: string
          id?: string
          name: string
          slug: string
          sort_order?: number
          updated_at?: string
          value_grams?: number
        }
        Update: {
          active?: boolean
          created_at?: string
          id?: string
          name?: string
          slug?: string
          sort_order?: number
          updated_at?: string
          value_grams?: number
        }
        Relationships: []
      }
      product_translations: {
        Row: {
          benefits: string | null
          description: string | null
          locale: string
          meta: Json
          name: string | null
          product_id: string
          source_hash: string | null
          updated_at: string
          usage: string | null
        }
        Insert: {
          benefits?: string | null
          description?: string | null
          locale: string
          meta?: Json
          name?: string | null
          product_id: string
          source_hash?: string | null
          updated_at?: string
          usage?: string | null
        }
        Update: {
          benefits?: string | null
          description?: string | null
          locale?: string
          meta?: Json
          name?: string | null
          product_id?: string
          source_hash?: string | null
          updated_at?: string
          usage?: string | null
        }
        Relationships: []
      }
      product_variants: {
        Row: {
          active: boolean
          barcode: string | null
          compare_price: number | null
          created_at: string
          flavor_id: string | null
          flavor_name: string | null
          height_cm: number | null
          id: string
          image_url: string | null
          is_default: boolean
          length_cm: number | null
          low_stock_threshold: number
          price: number
          product_id: string
          size_id: string | null
          size_name: string | null
          sku: string
          sort_order: number
          stock: number
          updated_at: string
          weight_grams: number | null
          width_cm: number | null
        }
        Insert: {
          active?: boolean
          barcode?: string | null
          compare_price?: number | null
          created_at?: string
          flavor_id?: string | null
          flavor_name?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          length_cm?: number | null
          low_stock_threshold?: number
          price?: number
          product_id: string
          size_id?: string | null
          size_name?: string | null
          sku: string
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
        }
        Update: {
          active?: boolean
          barcode?: string | null
          compare_price?: number | null
          created_at?: string
          flavor_id?: string | null
          flavor_name?: string | null
          height_cm?: number | null
          id?: string
          image_url?: string | null
          is_default?: boolean
          length_cm?: number | null
          low_stock_threshold?: number
          price?: number
          product_id?: string
          size_id?: string | null
          size_name?: string | null
          sku?: string
          sort_order?: number
          stock?: number
          updated_at?: string
          weight_grams?: number | null
          width_cm?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_variants_flavor_id_fkey"
            columns: ["flavor_id"]
            isOneToOne: false
            referencedRelation: "product_flavors"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_variants_size_id_fkey"
            columns: ["size_id"]
            isOneToOne: false
            referencedRelation: "product_sizes"
            referencedColumns: ["id"]
          },
        ]
      }
      product_waitlist: {
        Row: {
          channels: Json
          created_at: string
          email: string
          id: string
          name: string | null
          notified: boolean
          phone: string | null
          product_id: string
          product_name: string
          user_id: string | null
        }
        Insert: {
          channels?: Json
          created_at?: string
          email: string
          id: string
          name?: string | null
          notified?: boolean
          phone?: string | null
          product_id: string
          product_name?: string
          user_id?: string | null
        }
        Update: {
          channels?: Json
          created_at?: string
          email?: string
          id?: string
          name?: string | null
          notified?: boolean
          phone?: string | null
          product_id?: string
          product_name?: string
          user_id?: string | null
        }
        Relationships: []
      }
      products: {
        Row: {
          benefits: Json | null
          brand: string | null
          category: string
          certifications: Json | null
          combo_widget_enabled: boolean
          compare_price: number | null
          created_at: string
          description: string | null
          dimensions: Json | null
          faqs: Json | null
          gst_rate: number
          how_to_use: string | null
          hsn_code: string
          id: string
          images: Json | null
          in_stock: boolean
          ingredients: string | null
          is_active: boolean
          is_best_seller: boolean
          is_featured: boolean
          is_new_arrival: boolean
          low_stock_threshold: number
          name: string
          nutrition_facts: Json | null
          price: number
          ratings: number | null
          review_count: number | null
          serving_size: string | null
          servings: number | null
          shipping_weight: number | null
          short_description: string | null
          sku: string | null
          slug: string
          stock_count: number | null
          tags: Json | null
          updated_at: string
          variants: Json | null
          variants_pro_config: Json
          warnings: string | null
          weight: number | null
        }
        Insert: {
          benefits?: Json | null
          brand?: string | null
          category?: string
          certifications?: Json | null
          combo_widget_enabled?: boolean
          compare_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          faqs?: Json | null
          gst_rate?: number
          how_to_use?: string | null
          hsn_code?: string
          id: string
          images?: Json | null
          in_stock?: boolean
          ingredients?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          name: string
          nutrition_facts?: Json | null
          price: number
          ratings?: number | null
          review_count?: number | null
          serving_size?: string | null
          servings?: number | null
          shipping_weight?: number | null
          short_description?: string | null
          sku?: string | null
          slug: string
          stock_count?: number | null
          tags?: Json | null
          updated_at?: string
          variants?: Json | null
          variants_pro_config?: Json
          warnings?: string | null
          weight?: number | null
        }
        Update: {
          benefits?: Json | null
          brand?: string | null
          category?: string
          certifications?: Json | null
          combo_widget_enabled?: boolean
          compare_price?: number | null
          created_at?: string
          description?: string | null
          dimensions?: Json | null
          faqs?: Json | null
          gst_rate?: number
          how_to_use?: string | null
          hsn_code?: string
          id?: string
          images?: Json | null
          in_stock?: boolean
          ingredients?: string | null
          is_active?: boolean
          is_best_seller?: boolean
          is_featured?: boolean
          is_new_arrival?: boolean
          low_stock_threshold?: number
          name?: string
          nutrition_facts?: Json | null
          price?: number
          ratings?: number | null
          review_count?: number | null
          serving_size?: string | null
          servings?: number | null
          shipping_weight?: number | null
          short_description?: string | null
          sku?: string | null
          slug?: string
          stock_count?: number | null
          tags?: Json | null
          updated_at?: string
          variants?: Json | null
          variants_pro_config?: Json
          warnings?: string | null
          weight?: number | null
        }
        Relationships: []
      }
      profiles: {
        Row: {
          admin_notes: string | null
          anniversary: string | null
          anniversary_credited_year: number | null
          birthday: string | null
          birthday_credited_year: number | null
          created_at: string
          email: string
          id: string
          is_wholesale: boolean
          name: string
          phone: string | null
          preferred_language: string
          referral_code: string | null
          referred_by_user_id: string | null
          tags: string[]
          updated_at: string
          vip: boolean
          wholesale_discount_percent: number
          wholesale_min_order: number
          wholesale_notes: string | null
        }
        Insert: {
          admin_notes?: string | null
          anniversary?: string | null
          anniversary_credited_year?: number | null
          birthday?: string | null
          birthday_credited_year?: number | null
          created_at?: string
          email: string
          id: string
          is_wholesale?: boolean
          name?: string
          phone?: string | null
          preferred_language?: string
          referral_code?: string | null
          referred_by_user_id?: string | null
          tags?: string[]
          updated_at?: string
          vip?: boolean
          wholesale_discount_percent?: number
          wholesale_min_order?: number
          wholesale_notes?: string | null
        }
        Update: {
          admin_notes?: string | null
          anniversary?: string | null
          anniversary_credited_year?: number | null
          birthday?: string | null
          birthday_credited_year?: number | null
          created_at?: string
          email?: string
          id?: string
          is_wholesale?: boolean
          name?: string
          phone?: string | null
          preferred_language?: string
          referral_code?: string | null
          referred_by_user_id?: string | null
          tags?: string[]
          updated_at?: string
          vip?: boolean
          wholesale_discount_percent?: number
          wholesale_min_order?: number
          wholesale_notes?: string | null
        }
        Relationships: []
      }
      purchase_items: {
        Row: {
          cgst: number
          created_at: string
          gst_rate: number
          hsn_code: string | null
          id: string
          igst: number
          line_total: number
          product_id: string
          product_name: string
          purchase_id: string
          qty: number
          sgst: number
          taxable: number
          unit_cost: number
        }
        Insert: {
          cgst?: number
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number
          line_total?: number
          product_id: string
          product_name?: string
          purchase_id: string
          qty: number
          sgst?: number
          taxable?: number
          unit_cost?: number
        }
        Update: {
          cgst?: number
          created_at?: string
          gst_rate?: number
          hsn_code?: string | null
          id?: string
          igst?: number
          line_total?: number
          product_id?: string
          product_name?: string
          purchase_id?: string
          qty?: number
          sgst?: number
          taxable?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_items_purchase_id_fkey"
            columns: ["purchase_id"]
            isOneToOne: false
            referencedRelation: "purchases"
            referencedColumns: ["id"]
          },
        ]
      }
      purchases: {
        Row: {
          cgst: number
          created_at: string
          id: string
          igst: number
          invoice_date: string | null
          invoice_number: string | null
          notes: string | null
          purchase_number: string
          sgst: number
          status: string
          subtotal: number
          supplier_gstin: string | null
          supplier_name: string
          supplier_state_code: string | null
          total: number
          updated_at: string
        }
        Insert: {
          cgst?: number
          created_at?: string
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          purchase_number: string
          sgst?: number
          status?: string
          subtotal?: number
          supplier_gstin?: string | null
          supplier_name?: string
          supplier_state_code?: string | null
          total?: number
          updated_at?: string
        }
        Update: {
          cgst?: number
          created_at?: string
          id?: string
          igst?: number
          invoice_date?: string | null
          invoice_number?: string | null
          notes?: string | null
          purchase_number?: string
          sgst?: number
          status?: string
          subtotal?: number
          supplier_gstin?: string | null
          supplier_name?: string
          supplier_state_code?: string | null
          total?: number
          updated_at?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          last_used_at: string | null
          p256dh: string
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          last_used_at?: string | null
          p256dh: string
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          last_used_at?: string | null
          p256dh?: string
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      quick_checkout_methods: {
        Row: {
          cod_eligible: boolean
          config: Json
          created_at: string
          enabled: boolean
          icon_emoji: string | null
          icon_url: string | null
          id: string
          label: string
          max_order: number | null
          min_order: number | null
          provider: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          cod_eligible?: boolean
          config?: Json
          created_at?: string
          enabled?: boolean
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          label: string
          max_order?: number | null
          min_order?: number | null
          provider: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          cod_eligible?: boolean
          config?: Json
          created_at?: string
          enabled?: boolean
          icon_emoji?: string | null
          icon_url?: string | null
          id?: string
          label?: string
          max_order?: number | null
          min_order?: number | null
          provider?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
      rate_limits: {
        Row: {
          blocked_until: string | null
          bucket: string
          created_at: string
          hits: number
          id: string
          key: string
          updated_at: string
          window_start: string
        }
        Insert: {
          blocked_until?: string | null
          bucket: string
          created_at?: string
          hits?: number
          id?: string
          key: string
          updated_at?: string
          window_start?: string
        }
        Update: {
          blocked_until?: string | null
          bucket?: string
          created_at?: string
          hits?: number
          id?: string
          key?: string
          updated_at?: string
          window_start?: string
        }
        Relationships: []
      }
      referral_codes: {
        Row: {
          code: string
          created_at: string
          id: string
          user_id: string
          uses_count: number
        }
        Insert: {
          code: string
          created_at?: string
          id?: string
          user_id: string
          uses_count?: number
        }
        Update: {
          code?: string
          created_at?: string
          id?: string
          user_id?: string
          uses_count?: number
        }
        Relationships: []
      }
      referral_events: {
        Row: {
          amount: number
          created_at: string
          event_type: string
          id: string
          order_id: string | null
          referee_id: string
          referrer_id: string
        }
        Insert: {
          amount?: number
          created_at?: string
          event_type: string
          id?: string
          order_id?: string | null
          referee_id: string
          referrer_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          event_type?: string
          id?: string
          order_id?: string | null
          referee_id?: string
          referrer_id?: string
        }
        Relationships: []
      }
      referrals: {
        Row: {
          code: string
          completed_at: string | null
          created_at: string
          id: string
          qualifying_order_id: string | null
          referred_reward: number
          referred_user_id: string
          referrer_reward: number
          referrer_user_id: string
          status: string
        }
        Insert: {
          code: string
          completed_at?: string | null
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_reward?: number
          referred_user_id: string
          referrer_reward?: number
          referrer_user_id: string
          status?: string
        }
        Update: {
          code?: string
          completed_at?: string | null
          created_at?: string
          id?: string
          qualifying_order_id?: string | null
          referred_reward?: number
          referred_user_id?: string
          referrer_reward?: number
          referrer_user_id?: string
          status?: string
        }
        Relationships: []
      }
      return_requests: {
        Row: {
          access_token: string
          admin_notes: string | null
          amount: number | null
          created_at: string
          customer_email: string | null
          customer_name: string | null
          customer_phone: string | null
          details: string | null
          id: string
          items: Json
          order_id: string | null
          order_number: string
          photos: Json
          reason: string
          refund_mode: string
          status: string
          submitted_at: string | null
          token_expires_at: string
          updated_at: string
          user_id: string | null
        }
        Insert: {
          access_token: string
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          details?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          order_number: string
          photos?: Json
          reason?: string
          refund_mode?: string
          status?: string
          submitted_at?: string | null
          token_expires_at: string
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          access_token?: string
          admin_notes?: string | null
          amount?: number | null
          created_at?: string
          customer_email?: string | null
          customer_name?: string | null
          customer_phone?: string | null
          details?: string | null
          id?: string
          items?: Json
          order_id?: string | null
          order_number?: string
          photos?: Json
          reason?: string
          refund_mode?: string
          status?: string
          submitted_at?: string | null
          token_expires_at?: string
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      role_default_permissions: {
        Row: {
          granted: boolean
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          granted?: boolean
          permission_code: string
          role: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          granted?: boolean
          permission_code?: string
          role?: Database["public"]["Enums"]["app_role"]
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "role_default_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      security_events: {
        Row: {
          created_at: string
          detail: Json
          id: string
          kind: string
          route: string | null
          severity: string
          source_ip: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string
          detail?: Json
          id?: string
          kind: string
          route?: string | null
          severity?: string
          source_ip?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string
          detail?: Json
          id?: string
          kind?: string
          route?: string | null
          severity?: string
          source_ip?: string | null
          user_id?: string | null
        }
        Relationships: []
      }
      seo_audit_issues: {
        Row: {
          detail: Json | null
          id: string
          issue_type: string
          message: string
          recommendation: string | null
          run_id: string
          severity: string
          url: string
        }
        Insert: {
          detail?: Json | null
          id?: string
          issue_type: string
          message: string
          recommendation?: string | null
          run_id: string
          severity: string
          url: string
        }
        Update: {
          detail?: Json | null
          id?: string
          issue_type?: string
          message?: string
          recommendation?: string | null
          run_id?: string
          severity?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_audit_issues_run_id_fkey"
            columns: ["run_id"]
            isOneToOne: false
            referencedRelation: "seo_audit_runs"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_audit_runs: {
        Row: {
          completed_at: string | null
          critical_count: number
          error: string | null
          id: string
          notice_count: number
          pages_crawled: number
          started_at: string
          status: string
          total_issues: number
          triggered_by: string | null
          warning_count: number
        }
        Insert: {
          completed_at?: string | null
          critical_count?: number
          error?: string | null
          id?: string
          notice_count?: number
          pages_crawled?: number
          started_at?: string
          status?: string
          total_issues?: number
          triggered_by?: string | null
          warning_count?: number
        }
        Update: {
          completed_at?: string | null
          critical_count?: number
          error?: string | null
          id?: string
          notice_count?: number
          pages_crawled?: number
          started_at?: string
          status?: string
          total_issues?: number
          triggered_by?: string | null
          warning_count?: number
        }
        Relationships: []
      }
      seo_backlink_opportunities: {
        Row: {
          anchor_text: string | null
          authority_score: number | null
          competitors_with_link: string[] | null
          discovered_at: string
          id: string
          is_follow: boolean | null
          notes: string | null
          source_domain: string
          source_url: string | null
          status: string
          topic: string | null
          updated_at: string
        }
        Insert: {
          anchor_text?: string | null
          authority_score?: number | null
          competitors_with_link?: string[] | null
          discovered_at?: string
          id?: string
          is_follow?: boolean | null
          notes?: string | null
          source_domain: string
          source_url?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Update: {
          anchor_text?: string | null
          authority_score?: number | null
          competitors_with_link?: string[] | null
          discovered_at?: string
          id?: string
          is_follow?: boolean | null
          notes?: string | null
          source_domain?: string
          source_url?: string | null
          status?: string
          topic?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_competitor_snapshots: {
        Row: {
          authority_score: number | null
          backlinks_count: number | null
          competitor_id: string
          id: string
          organic_keywords: number | null
          organic_traffic: number | null
          referring_domains: number | null
          snapshot_at: string
        }
        Insert: {
          authority_score?: number | null
          backlinks_count?: number | null
          competitor_id: string
          id?: string
          organic_keywords?: number | null
          organic_traffic?: number | null
          referring_domains?: number | null
          snapshot_at?: string
        }
        Update: {
          authority_score?: number | null
          backlinks_count?: number | null
          competitor_id?: string
          id?: string
          organic_keywords?: number | null
          organic_traffic?: number | null
          referring_domains?: number | null
          snapshot_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "seo_competitor_snapshots_competitor_id_fkey"
            columns: ["competitor_id"]
            isOneToOne: false
            referencedRelation: "seo_competitors"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_competitors: {
        Row: {
          authority_score: number | null
          backlinks_count: number | null
          created_at: string
          domain: string
          id: string
          is_active: boolean
          label: string | null
          last_synced_at: string | null
          organic_keywords: number | null
          organic_traffic: number | null
          referring_domains: number | null
        }
        Insert: {
          authority_score?: number | null
          backlinks_count?: number | null
          created_at?: string
          domain: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_synced_at?: string | null
          organic_keywords?: number | null
          organic_traffic?: number | null
          referring_domains?: number | null
        }
        Update: {
          authority_score?: number | null
          backlinks_count?: number | null
          created_at?: string
          domain?: string
          id?: string
          is_active?: boolean
          label?: string | null
          last_synced_at?: string | null
          organic_keywords?: number | null
          organic_traffic?: number | null
          referring_domains?: number | null
        }
        Relationships: []
      }
      seo_gsc_daily: {
        Row: {
          clicks: number
          country: string | null
          ctr: number | null
          date: string
          device: string | null
          id: string
          impressions: number
          page: string | null
          position: number | null
          query: string | null
          synced_at: string
        }
        Insert: {
          clicks?: number
          country?: string | null
          ctr?: number | null
          date: string
          device?: string | null
          id?: string
          impressions?: number
          page?: string | null
          position?: number | null
          query?: string | null
          synced_at?: string
        }
        Update: {
          clicks?: number
          country?: string | null
          ctr?: number | null
          date?: string
          device?: string | null
          id?: string
          impressions?: number
          page?: string | null
          position?: number | null
          query?: string | null
          synced_at?: string
        }
        Relationships: []
      }
      seo_gsc_indexing: {
        Row: {
          checked_at: string
          coverage_state: string | null
          id: string
          index_status: string | null
          last_crawl_time: string | null
          mobile_usable: boolean | null
          page_fetch_state: string | null
          robots_txt_state: string | null
          url: string
        }
        Insert: {
          checked_at?: string
          coverage_state?: string | null
          id?: string
          index_status?: string | null
          last_crawl_time?: string | null
          mobile_usable?: boolean | null
          page_fetch_state?: string | null
          robots_txt_state?: string | null
          url: string
        }
        Update: {
          checked_at?: string
          coverage_state?: string | null
          id?: string
          index_status?: string | null
          last_crawl_time?: string | null
          mobile_usable?: boolean | null
          page_fetch_state?: string | null
          robots_txt_state?: string | null
          url?: string
        }
        Relationships: []
      }
      seo_insights: {
        Row: {
          created_at: string
          generated_at: string
          id: string
          insights: Json
          model: string | null
          period_days: number
          summary: string | null
        }
        Insert: {
          created_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          model?: string | null
          period_days?: number
          summary?: string | null
        }
        Update: {
          created_at?: string
          generated_at?: string
          id?: string
          insights?: Json
          model?: string | null
          period_days?: number
          summary?: string | null
        }
        Relationships: []
      }
      seo_internal_link_suggestions: {
        Row: {
          anchor_text: string
          generated_at: string
          id: string
          reason: string | null
          score: number | null
          source_path: string
          status: string
          target_path: string
          updated_at: string
        }
        Insert: {
          anchor_text: string
          generated_at?: string
          id?: string
          reason?: string | null
          score?: number | null
          source_path: string
          status?: string
          target_path: string
          updated_at?: string
        }
        Update: {
          anchor_text?: string
          generated_at?: string
          id?: string
          reason?: string | null
          score?: number | null
          source_path?: string
          status?: string
          target_path?: string
          updated_at?: string
        }
        Relationships: []
      }
      seo_keyword_history: {
        Row: {
          checked_at: string
          cpc: number | null
          id: string
          kd: number | null
          keyword_id: string
          position: number | null
          volume: number | null
        }
        Insert: {
          checked_at?: string
          cpc?: number | null
          id?: string
          kd?: number | null
          keyword_id: string
          position?: number | null
          volume?: number | null
        }
        Update: {
          checked_at?: string
          cpc?: number | null
          id?: string
          kd?: number | null
          keyword_id?: string
          position?: number | null
          volume?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "seo_keyword_history_keyword_id_fkey"
            columns: ["keyword_id"]
            isOneToOne: false
            referencedRelation: "seo_tracked_keywords"
            referencedColumns: ["id"]
          },
        ]
      }
      seo_page_meta: {
        Row: {
          ai_suggestions: Json | null
          applied_at: string | null
          canonical: string | null
          created_at: string
          description: string | null
          h1: string | null
          id: string
          is_active: boolean
          json_ld: Json | null
          og_description: string | null
          og_image: string | null
          og_title: string | null
          robots: string | null
          route_path: string
          title: string | null
          updated_at: string
        }
        Insert: {
          ai_suggestions?: Json | null
          applied_at?: string | null
          canonical?: string | null
          created_at?: string
          description?: string | null
          h1?: string | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          robots?: string | null
          route_path: string
          title?: string | null
          updated_at?: string
        }
        Update: {
          ai_suggestions?: Json | null
          applied_at?: string | null
          canonical?: string | null
          created_at?: string
          description?: string | null
          h1?: string | null
          id?: string
          is_active?: boolean
          json_ld?: Json | null
          og_description?: string | null
          og_image?: string | null
          og_title?: string | null
          robots?: string | null
          route_path?: string
          title?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      seo_tracked_keywords: {
        Row: {
          created_at: string
          current_cpc: number | null
          current_kd: number | null
          current_position: number | null
          current_volume: number | null
          database: string
          id: string
          is_active: boolean
          keyword: string
          last_checked_at: string | null
          notes: string | null
          target_url: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_cpc?: number | null
          current_kd?: number | null
          current_position?: number | null
          current_volume?: number | null
          database?: string
          id?: string
          is_active?: boolean
          keyword: string
          last_checked_at?: string | null
          notes?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_cpc?: number | null
          current_kd?: number | null
          current_position?: number | null
          current_volume?: number | null
          database?: string
          id?: string
          is_active?: boolean
          keyword?: string
          last_checked_at?: string | null
          notes?: string | null
          target_url?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      shipment_automation_runs: {
        Row: {
          booked: number
          duration_ms: number | null
          error: string | null
          failed: number
          finished_at: string | null
          id: string
          processed: number
          results: Json
          skipped: number
          started_at: string
          trigger: string
        }
        Insert: {
          booked?: number
          duration_ms?: number | null
          error?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          results?: Json
          skipped?: number
          started_at?: string
          trigger?: string
        }
        Update: {
          booked?: number
          duration_ms?: number | null
          error?: string | null
          failed?: number
          finished_at?: string | null
          id?: string
          processed?: number
          results?: Json
          skipped?: number
          started_at?: string
          trigger?: string
        }
        Relationships: []
      }
      shipment_charges: {
        Row: {
          actual_charge: number | null
          actual_weight_g: number | null
          awb_number: string | null
          courier: string
          created_at: string
          expected_box_id: string | null
          expected_charge: number
          expected_weight_g: number
          id: string
          notes: string | null
          order_number: string
          raw: Json
          reconciled_at: string | null
          status: string
          updated_at: string
          variance: number | null
          variance_pct: number | null
        }
        Insert: {
          actual_charge?: number | null
          actual_weight_g?: number | null
          awb_number?: string | null
          courier?: string
          created_at?: string
          expected_box_id?: string | null
          expected_charge?: number
          expected_weight_g?: number
          id?: string
          notes?: string | null
          order_number: string
          raw?: Json
          reconciled_at?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
          variance_pct?: number | null
        }
        Update: {
          actual_charge?: number | null
          actual_weight_g?: number | null
          awb_number?: string | null
          courier?: string
          created_at?: string
          expected_box_id?: string | null
          expected_charge?: number
          expected_weight_g?: number
          id?: string
          notes?: string | null
          order_number?: string
          raw?: Json
          reconciled_at?: string | null
          status?: string
          updated_at?: string
          variance?: number | null
          variance_pct?: number | null
        }
        Relationships: []
      }
      site_settings: {
        Row: {
          key: string
          settings: Json
          updated_at: string
        }
        Insert: {
          key?: string
          settings?: Json
          updated_at?: string
        }
        Update: {
          key?: string
          settings?: Json
          updated_at?: string
        }
        Relationships: []
      }
      site_visits: {
        Row: {
          country: string | null
          created_at: string
          device: string
          id: string
          path: string
          referrer: string | null
          session_id: string
          user_id: string | null
          utm_campaign: string | null
          utm_medium: string | null
          utm_source: string | null
        }
        Insert: {
          country?: string | null
          created_at?: string
          device?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Update: {
          country?: string | null
          created_at?: string
          device?: string
          id?: string
          path?: string
          referrer?: string | null
          session_id?: string
          user_id?: string | null
          utm_campaign?: string | null
          utm_medium?: string | null
          utm_source?: string | null
        }
        Relationships: []
      }
      stock_movements: {
        Row: {
          created_at: string
          created_by: string | null
          direction: string
          id: string
          note: string | null
          product_id: string
          qty: number
          reason: string
          ref_id: string | null
          ref_type: string | null
          stock_after: number | null
          variant: string | null
        }
        Insert: {
          created_at?: string
          created_by?: string | null
          direction: string
          id?: string
          note?: string | null
          product_id: string
          qty: number
          reason: string
          ref_id?: string | null
          ref_type?: string | null
          stock_after?: number | null
          variant?: string | null
        }
        Update: {
          created_at?: string
          created_by?: string | null
          direction?: string
          id?: string
          note?: string | null
          product_id?: string
          qty?: number
          reason?: string
          ref_id?: string | null
          ref_type?: string | null
          stock_after?: number | null
          variant?: string | null
        }
        Relationships: []
      }
      subscription_orders: {
        Row: {
          created_at: string
          id: string
          order_number: string
          status: string
          subscription_id: string
          total: number
        }
        Insert: {
          created_at?: string
          id?: string
          order_number: string
          status?: string
          subscription_id: string
          total?: number
        }
        Update: {
          created_at?: string
          id?: string
          order_number?: string
          status?: string
          subscription_id?: string
          total?: number
        }
        Relationships: [
          {
            foreignKeyName: "subscription_orders_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          created_at: string
          customer_email: string
          customer_name: string
          customer_phone: string
          discount_percent: number
          failures_count: number
          id: string
          interval_days: number
          last_order_number: string | null
          last_run_at: string | null
          next_run_at: string
          notes: string | null
          payment_method: string
          product_id: string
          product_name: string
          qty: number
          runs_count: number
          shipping_address: Json
          status: string
          unit_price: number
          updated_at: string
          user_id: string | null
          variant: Json
        }
        Insert: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_percent?: number
          failures_count?: number
          id?: string
          interval_days?: number
          last_order_number?: string | null
          last_run_at?: string | null
          next_run_at?: string
          notes?: string | null
          payment_method?: string
          product_id: string
          product_name?: string
          qty?: number
          runs_count?: number
          shipping_address?: Json
          status?: string
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          variant?: Json
        }
        Update: {
          created_at?: string
          customer_email?: string
          customer_name?: string
          customer_phone?: string
          discount_percent?: number
          failures_count?: number
          id?: string
          interval_days?: number
          last_order_number?: string | null
          last_run_at?: string | null
          next_run_at?: string
          notes?: string | null
          payment_method?: string
          product_id?: string
          product_name?: string
          qty?: number
          runs_count?: number
          shipping_address?: Json
          status?: string
          unit_price?: number
          updated_at?: string
          user_id?: string | null
          variant?: Json
        }
        Relationships: []
      }
      urgency_widgets: {
        Row: {
          animation: string
          bg_color: string | null
          color: string | null
          config: Json
          created_at: string
          enabled: boolean
          exclude_product_ids: string[]
          icon: string | null
          id: string
          include_product_ids: string[]
          label_template: string
          min_to_show: number
          sort_order: number
          threshold: number | null
          updated_at: string
          widget_type: string
          window_hours: number
        }
        Insert: {
          animation?: string
          bg_color?: string | null
          color?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          exclude_product_ids?: string[]
          icon?: string | null
          id?: string
          include_product_ids?: string[]
          label_template?: string
          min_to_show?: number
          sort_order?: number
          threshold?: number | null
          updated_at?: string
          widget_type: string
          window_hours?: number
        }
        Update: {
          animation?: string
          bg_color?: string | null
          color?: string | null
          config?: Json
          created_at?: string
          enabled?: boolean
          exclude_product_ids?: string[]
          icon?: string | null
          id?: string
          include_product_ids?: string[]
          label_template?: string
          min_to_show?: number
          sort_order?: number
          threshold?: number | null
          updated_at?: string
          widget_type?: string
          window_hours?: number
        }
        Relationships: []
      }
      user_2fa: {
        Row: {
          created_at: string
          enabled: boolean
          last_verified_at: string | null
          method: string
          secret: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          last_verified_at?: string | null
          method?: string
          secret?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          last_verified_at?: string | null
          method?: string
          secret?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_2fa_backup_codes: {
        Row: {
          code_hash: string
          created_at: string
          id: string
          used_at: string | null
          user_id: string
        }
        Insert: {
          code_hash: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id: string
        }
        Update: {
          code_hash?: string
          created_at?: string
          id?: string
          used_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      user_addresses: {
        Row: {
          address_line1: string
          address_line2: string | null
          city: string
          country: string
          created_at: string
          full_name: string
          id: string
          is_default: boolean
          label: string
          landmark: string | null
          phone: string
          pincode: string
          state: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line1: string
          address_line2?: string | null
          city: string
          country?: string
          created_at?: string
          full_name: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          phone: string
          pincode: string
          state: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line1?: string
          address_line2?: string | null
          city?: string
          country?: string
          created_at?: string
          full_name?: string
          id?: string
          is_default?: boolean
          label?: string
          landmark?: string | null
          phone?: string
          pincode?: string
          state?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_coupons: {
        Row: {
          code: string
          created_at: string
          discount_type: string
          expires_at: string | null
          id: string
          label: string | null
          max_discount: number | null
          min_order: number
          source_order_id: string | null
          used: boolean
          used_order_id: string | null
          user_id: string
          value: number
        }
        Insert: {
          code: string
          created_at?: string
          discount_type?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_discount?: number | null
          min_order?: number
          source_order_id?: string | null
          used?: boolean
          used_order_id?: string | null
          user_id: string
          value?: number
        }
        Update: {
          code?: string
          created_at?: string
          discount_type?: string
          expires_at?: string | null
          id?: string
          label?: string | null
          max_discount?: number | null
          min_order?: number
          source_order_id?: string | null
          used?: boolean
          used_order_id?: string | null
          user_id?: string
          value?: number
        }
        Relationships: []
      }
      user_notifications: {
        Row: {
          body: string
          created_at: string
          id: string
          link: string
          read: boolean
          title: string
          type: string
          user_id: string
        }
        Insert: {
          body?: string
          created_at?: string
          id?: string
          link?: string
          read?: boolean
          title: string
          type?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          link?: string
          read?: boolean
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      user_permissions: {
        Row: {
          expires_at: string | null
          granted: boolean
          granted_at: string
          granted_by: string | null
          permission_code: string
          reason: string | null
          user_id: string
        }
        Insert: {
          expires_at?: string | null
          granted: boolean
          granted_at?: string
          granted_by?: string | null
          permission_code: string
          reason?: string | null
          user_id: string
        }
        Update: {
          expires_at?: string | null
          granted?: boolean
          granted_at?: string
          granted_by?: string | null
          permission_code?: string
          reason?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_permissions_permission_code_fkey"
            columns: ["permission_code"]
            isOneToOne: false
            referencedRelation: "permissions"
            referencedColumns: ["code"]
          },
        ]
      }
      user_roles: {
        Row: {
          id: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          id?: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          id?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
      user_wallets: {
        Row: {
          balance: number
          updated_at: string
          user_id: string
        }
        Insert: {
          balance?: number
          updated_at?: string
          user_id: string
        }
        Update: {
          balance?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      utm_campaigns: {
        Row: {
          channel: string | null
          clicks: number
          conversions: number
          created_at: string
          destination_url: string
          id: string
          name: string
          notes: string | null
          revenue: number
          short_code: string | null
          spend: number
          updated_at: string
          utm_campaign: string
          utm_content: string | null
          utm_medium: string
          utm_source: string
          utm_term: string | null
        }
        Insert: {
          channel?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          destination_url: string
          id?: string
          name: string
          notes?: string | null
          revenue?: number
          short_code?: string | null
          spend?: number
          updated_at?: string
          utm_campaign: string
          utm_content?: string | null
          utm_medium: string
          utm_source: string
          utm_term?: string | null
        }
        Update: {
          channel?: string | null
          clicks?: number
          conversions?: number
          created_at?: string
          destination_url?: string
          id?: string
          name?: string
          notes?: string | null
          revenue?: number
          short_code?: string | null
          spend?: number
          updated_at?: string
          utm_campaign?: string
          utm_content?: string | null
          utm_medium?: string
          utm_source?: string
          utm_term?: string | null
        }
        Relationships: []
      }
      wallet_rules: {
        Row: {
          code: string
          created_at: string
          enabled: boolean
          expiry_days: number | null
          id: string
          max_credit: number | null
          max_per_user: number | null
          min_order: number | null
          mode: string
          name: string
          notes: string | null
          reward_type: string
          reward_value: number
          sort_order: number
          trigger: string
          updated_at: string
        }
        Insert: {
          code: string
          created_at?: string
          enabled?: boolean
          expiry_days?: number | null
          id?: string
          max_credit?: number | null
          max_per_user?: number | null
          min_order?: number | null
          mode?: string
          name: string
          notes?: string | null
          reward_type?: string
          reward_value?: number
          sort_order?: number
          trigger: string
          updated_at?: string
        }
        Update: {
          code?: string
          created_at?: string
          enabled?: boolean
          expiry_days?: number | null
          id?: string
          max_credit?: number | null
          max_per_user?: number | null
          min_order?: number | null
          mode?: string
          name?: string
          notes?: string | null
          reward_type?: string
          reward_value?: number
          sort_order?: number
          trigger?: string
          updated_at?: string
        }
        Relationships: []
      }
      wallet_transactions: {
        Row: {
          amount: number
          created_at: string
          expires_at: string | null
          id: string
          note: string | null
          order_id: string | null
          source: string
          type: string
          user_id: string
        }
        Insert: {
          amount: number
          created_at?: string
          expires_at?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          source?: string
          type: string
          user_id: string
        }
        Update: {
          amount?: number
          created_at?: string
          expires_at?: string | null
          id?: string
          note?: string | null
          order_id?: string | null
          source?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      whatsapp_channels: {
        Row: {
          business_hours: Json
          created_at: string
          custom_icon_url: string | null
          enabled: boolean
          hide_on_desktop: boolean
          hide_on_mobile: boolean
          icon_color: string | null
          icon_style: string
          id: string
          label: string
          message_template: string
          offline_message: string | null
          phone_e164: string
          position: string
          show_on_pages: string[]
          sort_order: number
          updated_at: string
        }
        Insert: {
          business_hours?: Json
          created_at?: string
          custom_icon_url?: string | null
          enabled?: boolean
          hide_on_desktop?: boolean
          hide_on_mobile?: boolean
          icon_color?: string | null
          icon_style?: string
          id?: string
          label: string
          message_template?: string
          offline_message?: string | null
          phone_e164: string
          position?: string
          show_on_pages?: string[]
          sort_order?: number
          updated_at?: string
        }
        Update: {
          business_hours?: Json
          created_at?: string
          custom_icon_url?: string | null
          enabled?: boolean
          hide_on_desktop?: boolean
          hide_on_mobile?: boolean
          icon_color?: string | null
          icon_style?: string
          id?: string
          label?: string
          message_template?: string
          offline_message?: string | null
          phone_e164?: string
          position?: string
          show_on_pages?: string[]
          sort_order?: number
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      gst_purchase_register: {
        Row: {
          cgst: number | null
          igst: number | null
          invoice_date: string | null
          invoice_number: string | null
          period: string | null
          purchase_number: string | null
          sgst: number | null
          supplier_gstin: string | null
          supplier_name: string | null
          taxable: number | null
          total: number | null
        }
        Insert: {
          cgst?: number | null
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          period?: never
          purchase_number?: string | null
          sgst?: number | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          taxable?: number | null
          total?: number | null
        }
        Update: {
          cgst?: number | null
          igst?: number | null
          invoice_date?: string | null
          invoice_number?: string | null
          period?: never
          purchase_number?: string | null
          sgst?: number | null
          supplier_gstin?: string | null
          supplier_name?: string | null
          taxable?: number | null
          total?: number | null
        }
        Relationships: []
      }
      gst_sales_register: {
        Row: {
          cgst: number | null
          igst: number | null
          invoice_number: string | null
          issued_at: string | null
          order_number: string | null
          period: string | null
          place_of_supply: string | null
          seller_gstin: string | null
          sgst: number | null
          taxable: number | null
          total: number | null
        }
        Insert: {
          cgst?: never
          igst?: never
          invoice_number?: string | null
          issued_at?: string | null
          order_number?: string | null
          period?: never
          place_of_supply?: never
          seller_gstin?: never
          sgst?: never
          taxable?: never
          total?: never
        }
        Update: {
          cgst?: never
          igst?: never
          invoice_number?: string | null
          issued_at?: string | null
          order_number?: string | null
          period?: never
          place_of_supply?: never
          seller_gstin?: never
          sgst?: never
          taxable?: never
          total?: never
        }
        Relationships: []
      }
    }
    Functions: {
      check_rate_limit: {
        Args: {
          _block_seconds?: number
          _bucket: string
          _key: string
          _limit: number
          _window_seconds: number
        }
        Returns: {
          allowed: boolean
          blocked_until: string
          hits: number
        }[]
      }
      gen_referral_code: { Args: never; Returns: string }
      get_cron_health: {
        Args: never
        Returns: {
          active: boolean
          failures_24h: number
          jobid: number
          jobname: string
          last_end: string
          last_error: string
          last_start: string
          last_status: string
          runs_24h: number
          schedule: string
        }[]
      }
      has_permission: {
        Args: { _code: string; _user_id: string }
        Returns: boolean
      }
      is_super_admin: { Args: { _user_id: string }; Returns: boolean }
      list_user_effective_permissions: {
        Args: { _user_id: string }
        Returns: {
          category: string
          expires_at: string
          granted: boolean
          label: string
          permission_code: string
          source: string
        }[]
      }
      next_invoice_number: { Args: never; Returns: string }
      notify_admins_low_stock: {
        Args: { p_product_id: string; p_stock: number }
        Returns: undefined
      }
      refresh_product_cooccurrence: { Args: never; Returns: number }
      sync_tab_permissions: { Args: { _entries: Json }; Returns: number }
      wallet_credit: {
        Args: {
          _amount: number
          _expiry_days?: number
          _note: string
          _order_id?: string
          _rule_code?: string
          _source: string
          _user_id: string
        }
        Returns: number
      }
      wallet_expire_now: { Args: never; Returns: number }
    }
    Enums: {
      app_role: "admin" | "customer" | "super_admin" | "moderator"
      product_auth_status:
        | "unused"
        | "verified"
        | "flagged_duplicate"
        | "flagged_geo"
        | "flagged_tamper"
        | "blocked"
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
      app_role: ["admin", "customer", "super_admin", "moderator"],
      product_auth_status: [
        "unused",
        "verified",
        "flagged_duplicate",
        "flagged_geo",
        "flagged_tamper",
        "blocked",
      ],
    },
  },
} as const
