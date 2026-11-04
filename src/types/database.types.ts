export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      admin_audit_logs: {
        Row: {
          action: string
          actor_role: string | null
          actor_user_id: string | null
          after_summary: Json | null
          before_summary: Json | null
          created_at: string
          id: string
          permission_used: string | null
          provider_reference: string | null
          reason: string
          request_id: string | null
          result_status: string
          target_id: string | null
          target_type: string
        }
        Insert: {
          action: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          created_at?: string
          id?: string
          permission_used?: string | null
          provider_reference?: string | null
          reason: string
          request_id?: string | null
          result_status?: string
          target_id?: string | null
          target_type: string
        }
        Update: {
          action?: string
          actor_role?: string | null
          actor_user_id?: string | null
          after_summary?: Json | null
          before_summary?: Json | null
          created_at?: string
          id?: string
          permission_used?: string | null
          provider_reference?: string | null
          reason?: string
          request_id?: string | null
          result_status?: string
          target_id?: string | null
          target_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_audit_logs_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_permission_definitions: {
        Row: {
          category: string
          description: string
          id: string
          is_high_risk: boolean
        }
        Insert: {
          category: string
          description: string
          id: string
          is_high_risk?: boolean
        }
        Update: {
          category?: string
          description?: string
          id?: string
          is_high_risk?: boolean
        }
        Relationships: []
      }
      admin_role_definitions: {
        Row: {
          created_at: string
          description: string
          id: string
          name: string
          requires_mfa: boolean
        }
        Insert: {
          created_at?: string
          description: string
          id: string
          name: string
          requires_mfa?: boolean
        }
        Update: {
          created_at?: string
          description?: string
          id?: string
          name?: string
          requires_mfa?: boolean
        }
        Relationships: []
      }
      admin_role_permissions: {
        Row: {
          permission_id: string
          role_id: string
        }
        Insert: {
          permission_id: string
          role_id: string
        }
        Update: {
          permission_id?: string
          role_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_role_permissions_permission_id_fkey"
            columns: ["permission_id"]
            isOneToOne: false
            referencedRelation: "admin_permission_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_role_permissions_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_role_definitions"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_user_roles: {
        Row: {
          assigned_by: string | null
          created_at: string
          is_active: boolean
          mfa_enforced: boolean
          revoked_at: string | null
          role_id: string
          updated_at: string
          user_id: string
        }
        Insert: {
          assigned_by?: string | null
          created_at?: string
          is_active?: boolean
          mfa_enforced?: boolean
          revoked_at?: string | null
          role_id: string
          updated_at?: string
          user_id: string
        }
        Update: {
          assigned_by?: string | null
          created_at?: string
          is_active?: boolean
          mfa_enforced?: boolean
          revoked_at?: string | null
          role_id?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "admin_user_roles_assigned_by_fkey"
            columns: ["assigned_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_role_id_fkey"
            columns: ["role_id"]
            isOneToOne: false
            referencedRelation: "admin_role_definitions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "admin_user_roles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_daily_aggregates: {
        Row: {
          bio_profile_id: string
          blog_views: number
          contact_submits: number
          dm_attributed_visits: number
          link_clicks: number
          metric_date: string
          page_views: number
          unique_visitors_est: number
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          blog_views?: number
          contact_submits?: number
          dm_attributed_visits?: number
          link_clicks?: number
          metric_date: string
          page_views?: number
          unique_visitors_est?: number
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          blog_views?: number
          contact_submits?: number
          dm_attributed_visits?: number
          link_clicks?: number
          metric_date?: string
          page_views?: number
          unique_visitors_est?: number
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_daily_aggregates_bio_profile_id_fkey"
            columns: ["bio_profile_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_daily_aggregates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      analytics_events: {
        Row: {
          automation_rule_id: string | null
          bio_profile_id: string | null
          blog_post_id: string | null
          created_at: string
          device_class: string
          event_type: string
          id: string
          link_id: string | null
          referrer_host: string
          retention_expires_at: string
          visitor_daily_hmac: string
          workspace_id: string
        }
        Insert: {
          automation_rule_id?: string | null
          bio_profile_id?: string | null
          blog_post_id?: string | null
          created_at?: string
          device_class?: string
          event_type: string
          id?: string
          link_id?: string | null
          referrer_host?: string
          retention_expires_at?: string
          visitor_daily_hmac: string
          workspace_id: string
        }
        Update: {
          automation_rule_id?: string | null
          bio_profile_id?: string | null
          blog_post_id?: string | null
          created_at?: string
          device_class?: string
          event_type?: string
          id?: string
          link_id?: string | null
          referrer_host?: string
          retention_expires_at?: string
          visitor_daily_hmac?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "analytics_events_automation_rule_id_fkey"
            columns: ["automation_rule_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_bio_profile_id_fkey"
            columns: ["bio_profile_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_blog_post_id_fkey"
            columns: ["blog_post_id"]
            isOneToOne: false
            referencedRelation: "bio_blog_posts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_link_id_fkey"
            columns: ["link_id"]
            isOneToOne: false
            referencedRelation: "bio_links"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "analytics_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_attempts: {
        Row: {
          action_type: string
          attempt_number: number
          attempted_at: string
          execution_id: string
          http_status: number | null
          id: string
          outcome_classification: string
          provider_error_code: string | null
          provider_error_subcode: string | null
          response_summary: string | null
          workspace_id: string
        }
        Insert: {
          action_type: string
          attempt_number: number
          attempted_at?: string
          execution_id: string
          http_status?: number | null
          id?: string
          outcome_classification: string
          provider_error_code?: string | null
          provider_error_subcode?: string | null
          response_summary?: string | null
          workspace_id: string
        }
        Update: {
          action_type?: string
          attempt_number?: number
          attempted_at?: string
          execution_id?: string
          http_status?: number | null
          id?: string
          outcome_classification?: string
          provider_error_code?: string | null
          provider_error_subcode?: string | null
          response_summary?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_attempts_execution_id_workspace_id_fkey"
            columns: ["execution_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "automation_executions"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      automation_executions: {
        Row: {
          attempt_count: number
          attribution_token: string
          comment_id: string
          commenter_ig_id: string | null
          commenter_username: string | null
          completed_at: string | null
          created_at: string
          failure_category: string | null
          failure_detail: string | null
          id: string
          instagram_connection_id: string
          matched_keyword: string | null
          next_retry_at: string | null
          provider_event_id_snapshot: string
          provider_message_id: string | null
          rule_id: string | null
          rule_version_evaluated: number | null
          status: Database["public"]["Enums"]["ig_execution_status"]
          webhook_event_id: string | null
          workspace_id: string
        }
        Insert: {
          attempt_count?: number
          attribution_token?: string
          comment_id: string
          commenter_ig_id?: string | null
          commenter_username?: string | null
          completed_at?: string | null
          created_at?: string
          failure_category?: string | null
          failure_detail?: string | null
          id?: string
          instagram_connection_id: string
          matched_keyword?: string | null
          next_retry_at?: string | null
          provider_event_id_snapshot: string
          provider_message_id?: string | null
          rule_id?: string | null
          rule_version_evaluated?: number | null
          status?: Database["public"]["Enums"]["ig_execution_status"]
          webhook_event_id?: string | null
          workspace_id: string
        }
        Update: {
          attempt_count?: number
          attribution_token?: string
          comment_id?: string
          commenter_ig_id?: string | null
          commenter_username?: string | null
          completed_at?: string | null
          created_at?: string
          failure_category?: string | null
          failure_detail?: string | null
          id?: string
          instagram_connection_id?: string
          matched_keyword?: string | null
          next_retry_at?: string | null
          provider_event_id_snapshot?: string
          provider_message_id?: string | null
          rule_id?: string | null
          rule_version_evaluated?: number | null
          status?: Database["public"]["Enums"]["ig_execution_status"]
          webhook_event_id?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_executions_instagram_connection_id_workspace_id_fkey"
            columns: ["instagram_connection_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "instagram_connections"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "automation_executions_rule_id_workspace_id_fkey"
            columns: ["rule_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "automation_rules"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "automation_executions_webhook_event_id_fkey"
            columns: ["webhook_event_id"]
            isOneToOne: false
            referencedRelation: "instagram_webhook_events"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_message_templates: {
        Row: {
          created_at: string
          cta_button_label: string | null
          destination_url: string | null
          id: string
          name: string
          private_message_body: string
          public_reply_body: string | null
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          cta_button_label?: string | null
          destination_url?: string | null
          id?: string
          name: string
          private_message_body: string
          public_reply_body?: string | null
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          cta_button_label?: string | null
          destination_url?: string | null
          id?: string
          name?: string
          private_message_body?: string
          public_reply_body?: string | null
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_message_templates_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      automation_rules: {
        Row: {
          cooldown_hours: number
          created_at: string
          cta_button_label: string | null
          destination_url: string | null
          id: string
          instagram_connection_id: string
          is_enabled: boolean
          keywords: string[]
          match_mode: Database["public"]["Enums"]["ig_match_mode"]
          name: string
          priority: number
          private_message_template: string
          public_reply_template: string | null
          rule_version: number
          send_public_reply: boolean
          target_media_id: string | null
          target_scope: Database["public"]["Enums"]["ig_target_scope"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          cooldown_hours?: number
          created_at?: string
          cta_button_label?: string | null
          destination_url?: string | null
          id?: string
          instagram_connection_id: string
          is_enabled?: boolean
          keywords?: string[]
          match_mode?: Database["public"]["Enums"]["ig_match_mode"]
          name: string
          priority?: number
          private_message_template: string
          public_reply_template?: string | null
          rule_version?: number
          send_public_reply?: boolean
          target_media_id?: string | null
          target_scope?: Database["public"]["Enums"]["ig_target_scope"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          cooldown_hours?: number
          created_at?: string
          cta_button_label?: string | null
          destination_url?: string | null
          id?: string
          instagram_connection_id?: string
          is_enabled?: boolean
          keywords?: string[]
          match_mode?: Database["public"]["Enums"]["ig_match_mode"]
          name?: string
          priority?: number
          private_message_template?: string
          public_reply_template?: string | null
          rule_version?: number
          send_public_reply?: boolean
          target_media_id?: string | null
          target_scope?: Database["public"]["Enums"]["ig_target_scope"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_instagram_connection_id_workspace_id_fkey"
            columns: ["instagram_connection_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "instagram_connections"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      billing_plans: {
        Row: {
          created_at: string
          currency: string
          effective_from: string
          entitlements: Json
          id: string
          is_active_for_sale: boolean
          module: Database["public"]["Enums"]["product_module"]
          name: string
          price_annual_minor: number
          price_monthly_minor: number
          provider_plan_refs: Json
          sort_order: number
          tier: Database["public"]["Enums"]["plan_tier"]
          version: number
        }
        Insert: {
          created_at?: string
          currency?: string
          effective_from?: string
          entitlements?: Json
          id: string
          is_active_for_sale?: boolean
          module: Database["public"]["Enums"]["product_module"]
          name: string
          price_annual_minor?: number
          price_monthly_minor?: number
          provider_plan_refs?: Json
          sort_order?: number
          tier: Database["public"]["Enums"]["plan_tier"]
          version?: number
        }
        Update: {
          created_at?: string
          currency?: string
          effective_from?: string
          entitlements?: Json
          id?: string
          is_active_for_sale?: boolean
          module?: Database["public"]["Enums"]["product_module"]
          name?: string
          price_annual_minor?: number
          price_monthly_minor?: number
          provider_plan_refs?: Json
          sort_order?: number
          tier?: Database["public"]["Enums"]["plan_tier"]
          version?: number
        }
        Relationships: []
      }
      bio_blog_posts: {
        Row: {
          bio_profile_id: string
          category: string
          content_markdown: string
          cover_media_id: string | null
          created_at: string
          excerpt: string | null
          id: string
          published_at: string | null
          reading_time_minutes: number
          sanitized_html: string
          seo_description: string | null
          seo_title: string | null
          slug: string
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          category?: string
          content_markdown?: string
          cover_media_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_time_minutes?: number
          sanitized_html?: string
          seo_description?: string | null
          seo_title?: string | null
          slug: string
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          category?: string
          content_markdown?: string
          cover_media_id?: string | null
          created_at?: string
          excerpt?: string | null
          id?: string
          published_at?: string | null
          reading_time_minutes?: number
          sanitized_html?: string
          seo_description?: string | null
          seo_title?: string | null
          slug?: string
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_blog_posts_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_blog_posts_cover_media_id_workspace_id_fkey"
            columns: ["cover_media_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      bio_collaborations: {
        Row: {
          bio_profile_id: string
          brand_logo_text: string
          brand_name: string
          campaign_summary: string | null
          campaign_title: string | null
          case_study_url: string | null
          category: string | null
          collab_year: string | null
          created_at: string
          id: string
          is_featured: boolean
          logo_media_id: string | null
          position: number
          status: Database["public"]["Enums"]["content_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          brand_logo_text?: string
          brand_name: string
          campaign_summary?: string | null
          campaign_title?: string | null
          case_study_url?: string | null
          category?: string | null
          collab_year?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          logo_media_id?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          brand_logo_text?: string
          brand_name?: string
          campaign_summary?: string | null
          campaign_title?: string | null
          case_study_url?: string | null
          category?: string | null
          collab_year?: string | null
          created_at?: string
          id?: string
          is_featured?: boolean
          logo_media_id?: string | null
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_collaborations_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_collaborations_logo_media_id_workspace_id_fkey"
            columns: ["logo_media_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      bio_contact_submissions: {
        Row: {
          bio_profile_id: string
          budget_range: string | null
          created_at: string
          id: string
          inquiry_type: string
          message: string
          rate_limit_key_hmac: string | null
          retention_expires_at: string
          sender_company: string | null
          sender_email: string
          sender_name: string
          status: Database["public"]["Enums"]["inquiry_status"]
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          budget_range?: string | null
          created_at?: string
          id?: string
          inquiry_type?: string
          message: string
          rate_limit_key_hmac?: string | null
          retention_expires_at?: string
          sender_company?: string | null
          sender_email: string
          sender_name: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          budget_range?: string | null
          created_at?: string
          id?: string
          inquiry_type?: string
          message?: string
          rate_limit_key_hmac?: string | null
          retention_expires_at?: string
          sender_company?: string | null
          sender_email?: string
          sender_name?: string
          status?: Database["public"]["Enums"]["inquiry_status"]
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_contact_submissions_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      bio_gallery_items: {
        Row: {
          bio_profile_id: string
          caption: string | null
          category: string
          created_at: string
          external_url: string | null
          id: string
          is_featured: boolean
          media_asset_id: string | null
          media_type: string
          position: number
          status: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          caption?: string | null
          category?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_featured?: boolean
          media_asset_id?: string | null
          media_type?: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          title: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          caption?: string | null
          category?: string
          created_at?: string
          external_url?: string | null
          id?: string
          is_featured?: boolean
          media_asset_id?: string | null
          media_type?: string
          position?: number
          status?: Database["public"]["Enums"]["content_status"]
          title?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_gallery_items_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_gallery_items_media_asset_id_workspace_id_fkey"
            columns: ["media_asset_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      bio_links: {
        Row: {
          bio_profile_id: string
          created_at: string
          icon: string
          id: string
          is_featured: boolean
          is_visible: boolean
          link_type: string
          opaque_token: string
          platform: string | null
          position: number
          title: string
          updated_at: string
          url: string
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          created_at?: string
          icon?: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          link_type?: string
          opaque_token?: string
          platform?: string | null
          position?: number
          title: string
          updated_at?: string
          url: string
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          created_at?: string
          icon?: string
          id?: string
          is_featured?: boolean
          is_visible?: boolean
          link_type?: string
          opaque_token?: string
          platform?: string | null
          position?: number
          title?: string
          updated_at?: string
          url?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_links_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
        ]
      }
      bio_profiles: {
        Row: {
          about_story: string | null
          allow_indexing: boolean
          avatar_media_id: string | null
          category: string
          cover_media_id: string | null
          created_at: string
          creator_metrics: Json
          current_published_version_id: string | null
          display_name: string
          draft_version: number
          handle: string
          id: string
          is_published: boolean
          location: string | null
          moderation_state: string
          published_at: string | null
          section_order: string[]
          sections_visibility: Json
          seo_description: string | null
          seo_title: string | null
          short_bio: string | null
          tagline: string | null
          template_id: string
          theme_config: Json
          updated_at: string
          workspace_id: string
        }
        Insert: {
          about_story?: string | null
          allow_indexing?: boolean
          avatar_media_id?: string | null
          category?: string
          cover_media_id?: string | null
          created_at?: string
          creator_metrics?: Json
          current_published_version_id?: string | null
          display_name: string
          draft_version?: number
          handle: string
          id?: string
          is_published?: boolean
          location?: string | null
          moderation_state?: string
          published_at?: string | null
          section_order?: string[]
          sections_visibility?: Json
          seo_description?: string | null
          seo_title?: string | null
          short_bio?: string | null
          tagline?: string | null
          template_id?: string
          theme_config?: Json
          updated_at?: string
          workspace_id: string
        }
        Update: {
          about_story?: string | null
          allow_indexing?: boolean
          avatar_media_id?: string | null
          category?: string
          cover_media_id?: string | null
          created_at?: string
          creator_metrics?: Json
          current_published_version_id?: string | null
          display_name?: string
          draft_version?: number
          handle?: string
          id?: string
          is_published?: boolean
          location?: string | null
          moderation_state?: string
          published_at?: string | null
          section_order?: string[]
          sections_visibility?: Json
          seo_description?: string | null
          seo_title?: string | null
          short_bio?: string | null
          tagline?: string | null
          template_id?: string
          theme_config?: Json
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_profiles_avatar_media_id_workspace_id_fkey"
            columns: ["avatar_media_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_profiles_cover_media_id_workspace_id_fkey"
            columns: ["cover_media_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "media_assets"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_profiles_template_id_fkey"
            columns: ["template_id"]
            isOneToOne: false
            referencedRelation: "bio_templates"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "bio_profiles_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "fk_bio_profiles_current_published_version"
            columns: ["current_published_version_id", "id"]
            isOneToOne: false
            referencedRelation: "bio_published_versions"
            referencedColumns: ["id", "bio_profile_id"]
          },
        ]
      }
      bio_published_versions: {
        Row: {
          bio_profile_id: string
          handle_at_publish: string
          id: string
          published_at: string
          published_by: string | null
          snapshot_payload: Json
          version_number: number
          workspace_id: string
        }
        Insert: {
          bio_profile_id: string
          handle_at_publish: string
          id?: string
          published_at?: string
          published_by?: string | null
          snapshot_payload: Json
          version_number: number
          workspace_id: string
        }
        Update: {
          bio_profile_id?: string
          handle_at_publish?: string
          id?: string
          published_at?: string
          published_by?: string | null
          snapshot_payload?: Json
          version_number?: number
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "bio_published_versions_bio_profile_id_workspace_id_fkey"
            columns: ["bio_profile_id", "workspace_id"]
            isOneToOne: false
            referencedRelation: "bio_profiles"
            referencedColumns: ["id", "workspace_id"]
          },
          {
            foreignKeyName: "bio_published_versions_published_by_fkey"
            columns: ["published_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      bio_templates: {
        Row: {
          category: string
          default_theme_config: Json
          description: string | null
          id: string
          is_premium: boolean
          name: string
          preview_image_url: string | null
          schema_version: number
          sort_order: number
        }
        Insert: {
          category: string
          default_theme_config?: Json
          description?: string | null
          id: string
          is_premium?: boolean
          name: string
          preview_image_url?: string | null
          schema_version?: number
          sort_order?: number
        }
        Update: {
          category?: string
          default_theme_config?: Json
          description?: string | null
          id?: string
          is_premium?: boolean
          name?: string
          preview_image_url?: string | null
          schema_version?: number
          sort_order?: number
        }
        Relationships: []
      }
      coupon_code_batches: {
        Row: {
          assigned_email_domain: string | null
          batch_name: string
          code_prefix: string
          created_at: string
          created_by: string | null
          id: string
          last_exported_at: string | null
          last_exported_by: string | null
          max_uses_per_code: number
          promotion_id: string
          quantity: number
          status: string
        }
        Insert: {
          assigned_email_domain?: string | null
          batch_name: string
          code_prefix: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_exported_at?: string | null
          last_exported_by?: string | null
          max_uses_per_code?: number
          promotion_id: string
          quantity: number
          status?: string
        }
        Update: {
          assigned_email_domain?: string | null
          batch_name?: string
          code_prefix?: string
          created_at?: string
          created_by?: string | null
          id?: string
          last_exported_at?: string | null
          last_exported_by?: string | null
          max_uses_per_code?: number
          promotion_id?: string
          quantity?: number
          status?: string
        }
        Relationships: [
          {
            foreignKeyName: "coupon_code_batches_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_code_batches_last_exported_by_fkey"
            columns: ["last_exported_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_code_batches_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_codes: {
        Row: {
          assigned_email_domain: string | null
          assigned_workspace_id: string | null
          batch_id: string | null
          code_hash: string
          code_masked_preview: string
          created_at: string
          expires_at: string | null
          hash_key_version: number
          id: string
          is_active: boolean
          is_public_master_code: boolean
          max_redemptions: number
          promotion_id: string
          reserved_or_redeemed_count: number
        }
        Insert: {
          assigned_email_domain?: string | null
          assigned_workspace_id?: string | null
          batch_id?: string | null
          code_hash: string
          code_masked_preview: string
          created_at?: string
          expires_at?: string | null
          hash_key_version?: number
          id?: string
          is_active?: boolean
          is_public_master_code?: boolean
          max_redemptions?: number
          promotion_id: string
          reserved_or_redeemed_count?: number
        }
        Update: {
          assigned_email_domain?: string | null
          assigned_workspace_id?: string | null
          batch_id?: string | null
          code_hash?: string
          code_masked_preview?: string
          created_at?: string
          expires_at?: string | null
          hash_key_version?: number
          id?: string
          is_active?: boolean
          is_public_master_code?: boolean
          max_redemptions?: number
          promotion_id?: string
          reserved_or_redeemed_count?: number
        }
        Relationships: [
          {
            foreignKeyName: "coupon_codes_assigned_workspace_id_fkey"
            columns: ["assigned_workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_codes_batch_id_fkey"
            columns: ["batch_id"]
            isOneToOne: false
            referencedRelation: "coupon_code_batches"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_codes_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
        ]
      }
      coupon_redemptions: {
        Row: {
          confirmed_at: string | null
          coupon_code_id: string
          created_at: string
          currency: string
          discount_minor: number
          final_minor: number
          id: string
          idempotency_key: string
          plan_id: string
          plan_version: number
          promotion_id: string
          redeemed_by_user_id: string | null
          released_at: string | null
          reservation_expires_at: string
          status: string
          subscription_id: string | null
          subtotal_minor: number
          workspace_id: string | null
        }
        Insert: {
          confirmed_at?: string | null
          coupon_code_id: string
          created_at?: string
          currency: string
          discount_minor: number
          final_minor: number
          id?: string
          idempotency_key: string
          plan_id: string
          plan_version?: number
          promotion_id: string
          redeemed_by_user_id?: string | null
          released_at?: string | null
          reservation_expires_at?: string
          status?: string
          subscription_id?: string | null
          subtotal_minor: number
          workspace_id?: string | null
        }
        Update: {
          confirmed_at?: string | null
          coupon_code_id?: string
          created_at?: string
          currency?: string
          discount_minor?: number
          final_minor?: number
          id?: string
          idempotency_key?: string
          plan_id?: string
          plan_version?: number
          promotion_id?: string
          redeemed_by_user_id?: string | null
          released_at?: string | null
          reservation_expires_at?: string
          status?: string
          subscription_id?: string | null
          subtotal_minor?: number
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "coupon_redemptions_coupon_code_id_fkey"
            columns: ["coupon_code_id"]
            isOneToOne: false
            referencedRelation: "coupon_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_plan_id_plan_version_fkey"
            columns: ["plan_id", "plan_version"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id", "version"]
          },
          {
            foreignKeyName: "coupon_redemptions_promotion_id_fkey"
            columns: ["promotion_id"]
            isOneToOne: false
            referencedRelation: "promotions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_redeemed_by_user_id_fkey"
            columns: ["redeemed_by_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "coupon_redemptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      creator_pages: {
        Row: {
          avatar_url: string
          bio: string
          capability_hash: string | null
          cover_url: string
          created_at: string
          display_name: string
          handle: string
          id: string
          published_at: string | null
          social_links: Json
          status: string
          theme: Json
          updated_at: string
        }
        Insert: {
          avatar_url?: string
          bio?: string
          capability_hash?: string | null
          cover_url?: string
          created_at?: string
          display_name: string
          handle: string
          id?: string
          published_at?: string | null
          social_links?: Json
          status?: string
          theme?: Json
          updated_at?: string
        }
        Update: {
          avatar_url?: string
          bio?: string
          capability_hash?: string | null
          cover_url?: string
          created_at?: string
          display_name?: string
          handle?: string
          id?: string
          published_at?: string | null
          social_links?: Json
          status?: string
          theme?: Json
          updated_at?: string
        }
        Relationships: []
      }
      data_requests: {
        Row: {
          approved_by: string | null
          completed_at: string | null
          completion_summary: string | null
          created_at: string
          due_at: string
          id: string
          legal_hold_reason: string | null
          request_type: string
          requester_email: string
          status: string
          user_id: string | null
          workspace_id: string | null
        }
        Insert: {
          approved_by?: string | null
          completed_at?: string | null
          completion_summary?: string | null
          created_at?: string
          due_at?: string
          id?: string
          legal_hold_reason?: string | null
          request_type: string
          requester_email: string
          status?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Update: {
          approved_by?: string | null
          completed_at?: string | null
          completion_summary?: string | null
          created_at?: string
          due_at?: string
          id?: string
          legal_hold_reason?: string | null
          request_type?: string
          requester_email?: string
          status?: string
          user_id?: string | null
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "data_requests_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "data_requests_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      dm_logs: {
        Row: {
          comment_id: string
          comment_text: string | null
          commenter_ig_id: string
          commenter_username: string | null
          created_at: string
          error_message: string | null
          id: string
          ig_account_id: string
          rule_id: string | null
          status: Database["public"]["Enums"]["dm_status"]
        }
        Insert: {
          comment_id: string
          comment_text?: string | null
          commenter_ig_id: string
          commenter_username?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ig_account_id: string
          rule_id?: string | null
          status: Database["public"]["Enums"]["dm_status"]
        }
        Update: {
          comment_id?: string
          comment_text?: string | null
          commenter_ig_id?: string
          commenter_username?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          ig_account_id?: string
          rule_id?: string | null
          status?: Database["public"]["Enums"]["dm_status"]
        }
        Relationships: [
          {
            foreignKeyName: "dm_logs_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "dm_logs_rule_id_fkey"
            columns: ["rule_id"]
            isOneToOne: false
            referencedRelation: "legacy_automation_rules_v0"
            referencedColumns: ["id"]
          },
        ]
      }
      feature_flags: {
        Row: {
          allowed_workspace_ids: string[]
          description: string
          is_enabled: boolean
          key: string
          rollout_percentage: number
          updated_at: string
          updated_by: string | null
          version: number
        }
        Insert: {
          allowed_workspace_ids?: string[]
          description: string
          is_enabled?: boolean
          key: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Update: {
          allowed_workspace_ids?: string[]
          description?: string
          is_enabled?: boolean
          key?: string
          rollout_percentage?: number
          updated_at?: string
          updated_by?: string | null
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "feature_flags_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_accounts: {
        Row: {
          access_token: string
          created_at: string
          id: string
          ig_user_id: string
          ig_username: string
          is_active: boolean
          token_expires_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          access_token: string
          created_at?: string
          id?: string
          ig_user_id: string
          ig_username: string
          is_active?: boolean
          token_expires_at: string
          updated_at?: string
          user_id: string
        }
        Update: {
          access_token?: string
          created_at?: string
          id?: string
          ig_user_id?: string
          ig_username?: string
          is_active?: boolean
          token_expires_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      instagram_connections: {
        Row: {
          account_type: string
          connected_at: string | null
          granted_scopes: string[]
          hourly_ceiling: number
          hourly_replies_sent: number
          hourly_window_start: string
          id: string
          ig_user_id: string
          ig_username: string
          is_paused: boolean
          last_error_category: string | null
          last_error_code: string | null
          last_webhook_received_at: string | null
          login_product: string
          profile_picture_url: string | null
          status: Database["public"]["Enums"]["ig_connection_status"]
          token_expires_at: string | null
          updated_at: string
          webhook_subscribed: boolean
          workspace_id: string
        }
        Insert: {
          account_type?: string
          connected_at?: string | null
          granted_scopes?: string[]
          hourly_ceiling?: number
          hourly_replies_sent?: number
          hourly_window_start?: string
          id?: string
          ig_user_id: string
          ig_username: string
          is_paused?: boolean
          last_error_category?: string | null
          last_error_code?: string | null
          last_webhook_received_at?: string | null
          login_product?: string
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["ig_connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          webhook_subscribed?: boolean
          workspace_id: string
        }
        Update: {
          account_type?: string
          connected_at?: string | null
          granted_scopes?: string[]
          hourly_ceiling?: number
          hourly_replies_sent?: number
          hourly_window_start?: string
          id?: string
          ig_user_id?: string
          ig_username?: string
          is_paused?: boolean
          last_error_category?: string | null
          last_error_code?: string | null
          last_webhook_received_at?: string | null
          login_product?: string
          profile_picture_url?: string | null
          status?: Database["public"]["Enums"]["ig_connection_status"]
          token_expires_at?: string | null
          updated_at?: string
          webhook_subscribed?: boolean
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_connections_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      instagram_webhook_events: {
        Row: {
          comment_created_at: string
          comment_id: string
          comment_text_redacted: string | null
          commenter_ig_id: string | null
          commenter_username: string | null
          id: string
          ig_user_id: string
          instagram_connection_id: string | null
          media_id: string | null
          processed_at: string | null
          processing_status: Database["public"]["Enums"]["ig_execution_status"]
          provider_event_id: string
          received_at: string
          retention_expires_at: string
          signature_verified: boolean
          surface_type: string
        }
        Insert: {
          comment_created_at: string
          comment_id: string
          comment_text_redacted?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          id?: string
          ig_user_id: string
          instagram_connection_id?: string | null
          media_id?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["ig_execution_status"]
          provider_event_id: string
          received_at?: string
          retention_expires_at?: string
          signature_verified?: boolean
          surface_type?: string
        }
        Update: {
          comment_created_at?: string
          comment_id?: string
          comment_text_redacted?: string | null
          commenter_ig_id?: string | null
          commenter_username?: string | null
          id?: string
          ig_user_id?: string
          instagram_connection_id?: string | null
          media_id?: string | null
          processed_at?: string | null
          processing_status?: Database["public"]["Enums"]["ig_execution_status"]
          provider_event_id?: string
          received_at?: string
          retention_expires_at?: string
          signature_verified?: boolean
          surface_type?: string
        }
        Relationships: [
          {
            foreignKeyName: "instagram_webhook_events_instagram_connection_id_fkey"
            columns: ["instagram_connection_id"]
            isOneToOne: false
            referencedRelation: "instagram_connections"
            referencedColumns: ["id"]
          },
        ]
      }
      legacy_automation_rules_v0: {
        Row: {
          button_title: string
          button_url: string | null
          created_at: string
          dm_message_text: string
          follow_prompt_text: string
          id: string
          ig_account_id: string
          is_enabled: boolean
          keywords: string[]
          media_caption: string | null
          media_id: string | null
          media_thumbnail_url: string | null
          public_replies: string[]
          require_follow: boolean
          trigger_type: Database["public"]["Enums"]["trigger_type"]
        }
        Insert: {
          button_title?: string
          button_url?: string | null
          created_at?: string
          dm_message_text: string
          follow_prompt_text?: string
          id?: string
          ig_account_id: string
          is_enabled?: boolean
          keywords?: string[]
          media_caption?: string | null
          media_id?: string | null
          media_thumbnail_url?: string | null
          public_replies?: string[]
          require_follow?: boolean
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
        }
        Update: {
          button_title?: string
          button_url?: string | null
          created_at?: string
          dm_message_text?: string
          follow_prompt_text?: string
          id?: string
          ig_account_id?: string
          is_enabled?: boolean
          keywords?: string[]
          media_caption?: string | null
          media_id?: string | null
          media_thumbnail_url?: string | null
          public_replies?: string[]
          require_follow?: boolean
          trigger_type?: Database["public"]["Enums"]["trigger_type"]
        }
        Relationships: [
          {
            foreignKeyName: "automation_rules_ig_account_id_fkey"
            columns: ["ig_account_id"]
            isOneToOne: false
            referencedRelation: "instagram_accounts"
            referencedColumns: ["id"]
          },
        ]
      }
      media_assets: {
        Row: {
          bytes: number
          cloudinary_asset_id: string | null
          cloudinary_public_id: string
          created_at: string
          delivery_type: string
          format: string
          height: number | null
          id: string
          lifecycle_state: string
          purpose: string
          resource_type: string
          secure_url: string
          updated_at: string
          uploaded_by: string | null
          width: number | null
          workspace_id: string
        }
        Insert: {
          bytes: number
          cloudinary_asset_id?: string | null
          cloudinary_public_id: string
          created_at?: string
          delivery_type?: string
          format: string
          height?: number | null
          id?: string
          lifecycle_state?: string
          purpose: string
          resource_type?: string
          secure_url: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
          workspace_id: string
        }
        Update: {
          bytes?: number
          cloudinary_asset_id?: string | null
          cloudinary_public_id?: string
          created_at?: string
          delivery_type?: string
          format?: string
          height?: number | null
          id?: string
          lifecycle_state?: string
          purpose?: string
          resource_type?: string
          secure_url?: string
          updated_at?: string
          uploaded_by?: string | null
          width?: number | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "media_assets_uploaded_by_fkey"
            columns: ["uploaded_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "media_assets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_appeals: {
        Row: {
          appeal_statement: string
          case_id: string
          created_at: string
          id: string
          resolution_notes: string | null
          resolved_at: string | null
          resolved_by: string | null
          status: string
          submitted_by: string | null
          workspace_id: string
        }
        Insert: {
          appeal_statement: string
          case_id: string
          created_at?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_by?: string | null
          workspace_id: string
        }
        Update: {
          appeal_statement?: string
          case_id?: string
          created_at?: string
          id?: string
          resolution_notes?: string | null
          resolved_at?: string | null
          resolved_by?: string | null
          status?: string
          submitted_by?: string | null
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_appeals_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "moderation_cases"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_appeals_resolved_by_fkey"
            columns: ["resolved_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_appeals_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_appeals_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      moderation_cases: {
        Row: {
          created_at: string
          decision_notes: string | null
          id: string
          reason: string
          reporter_email: string | null
          reviewed_by: string | null
          status: string
          target_id: string
          target_type: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          decision_notes?: string | null
          id?: string
          reason: string
          reporter_email?: string | null
          reviewed_by?: string | null
          status?: string
          target_id: string
          target_type: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          decision_notes?: string | null
          id?: string
          reason?: string
          reporter_email?: string | null
          reviewed_by?: string | null
          status?: string
          target_id?: string
          target_type?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "moderation_cases_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "moderation_cases_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      page_blocks: {
        Row: {
          block_type: string
          created_at: string
          description: string
          enabled: boolean
          id: string
          image_url: string
          media_url: string
          metadata: Json
          page_id: string
          parent_id: string | null
          position: number
          scheduled_at: string | null
          tab_slug: string
          title: string
          url: string
        }
        Insert: {
          block_type: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          image_url?: string
          media_url?: string
          metadata?: Json
          page_id: string
          parent_id?: string | null
          position?: number
          scheduled_at?: string | null
          tab_slug?: string
          title?: string
          url?: string
        }
        Update: {
          block_type?: string
          created_at?: string
          description?: string
          enabled?: boolean
          id?: string
          image_url?: string
          media_url?: string
          metadata?: Json
          page_id?: string
          parent_id?: string | null
          position?: number
          scheduled_at?: string | null
          tab_slug?: string
          title?: string
          url?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_blocks_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_events: {
        Row: {
          block_id: string | null
          country_code: string
          created_at: string
          device: string
          event_kind: string
          id: number
          page_id: string
          referrer_host: string
          visitor_hash: string | null
        }
        Insert: {
          block_id?: string | null
          country_code?: string
          created_at?: string
          device?: string
          event_kind: string
          id?: never
          page_id: string
          referrer_host?: string
          visitor_hash?: string | null
        }
        Update: {
          block_id?: string | null
          country_code?: string
          created_at?: string
          device?: string
          event_kind?: string
          id?: never
          page_id?: string
          referrer_host?: string
          visitor_hash?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "page_events_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      page_tabs: {
        Row: {
          label: string
          page_id: string
          position: number
          slug: string
        }
        Insert: {
          label: string
          page_id: string
          position?: number
          slug: string
        }
        Update: {
          label?: string
          page_id?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "page_tabs_page_id_fkey"
            columns: ["page_id"]
            isOneToOne: false
            referencedRelation: "creator_pages"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount_minor: number
          created_at: string
          currency: string
          id: string
          provider: string
          provider_order_id: string | null
          provider_payment_id: string
          refunded_amount_minor: number
          status: string
          subscription_id: string | null
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          amount_minor: number
          created_at?: string
          currency?: string
          id?: string
          provider: string
          provider_order_id?: string | null
          provider_payment_id: string
          refunded_amount_minor?: number
          status: string
          subscription_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          amount_minor?: number
          created_at?: string
          currency?: string
          id?: string
          provider?: string
          provider_order_id?: string | null
          provider_payment_id?: string
          refunded_amount_minor?: number
          status?: string
          subscription_id?: string | null
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "payments_subscription_id_fkey"
            columns: ["subscription_id"]
            isOneToOne: false
            referencedRelation: "subscriptions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      platform_settings: {
        Row: {
          is_public_readable: boolean
          key: string
          updated_at: string
          updated_by: string | null
          value: Json
          version: number
        }
        Insert: {
          is_public_readable?: boolean
          key: string
          updated_at?: string
          updated_by?: string | null
          value: Json
          version?: number
        }
        Update: {
          is_public_readable?: boolean
          key?: string
          updated_at?: string
          updated_by?: string | null
          value?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "platform_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      promotions: {
        Row: {
          applicable_intervals:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_plan_ids: string[] | null
          conditions: Json
          created_at: string
          created_by: string | null
          currency: string
          description: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          duration_in_months: number | null
          duration_type: Database["public"]["Enums"]["coupon_duration_type"]
          exclusivity_group: string | null
          expires_at: string | null
          id: string
          is_active: boolean
          is_stackable: boolean
          max_discount_minor: number | null
          max_redemptions_per_workspace: number
          max_redemptions_total: number | null
          name: string
          reserved_or_redeemed_total: number
          scope_type: Database["public"]["Enums"]["coupon_scope_type"]
          starts_at: string
          updated_at: string
        }
        Insert: {
          applicable_intervals?:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_plan_ids?: string[] | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_type: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value: number
          duration_in_months?: number | null
          duration_type?: Database["public"]["Enums"]["coupon_duration_type"]
          exclusivity_group?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          max_discount_minor?: number | null
          max_redemptions_per_workspace?: number
          max_redemptions_total?: number | null
          name: string
          reserved_or_redeemed_total?: number
          scope_type?: Database["public"]["Enums"]["coupon_scope_type"]
          starts_at?: string
          updated_at?: string
        }
        Update: {
          applicable_intervals?:
            | Database["public"]["Enums"]["billing_interval"][]
            | null
          applicable_plan_ids?: string[] | null
          conditions?: Json
          created_at?: string
          created_by?: string | null
          currency?: string
          description?: string | null
          discount_type?: Database["public"]["Enums"]["coupon_discount_type"]
          discount_value?: number
          duration_in_months?: number | null
          duration_type?: Database["public"]["Enums"]["coupon_duration_type"]
          exclusivity_group?: string | null
          expires_at?: string | null
          id?: string
          is_active?: boolean
          is_stackable?: boolean
          max_discount_minor?: number | null
          max_redemptions_per_workspace?: number
          max_redemptions_total?: number | null
          name?: string
          reserved_or_redeemed_total?: number
          scope_type?: Database["public"]["Enums"]["coupon_scope_type"]
          starts_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "promotions_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      provider_events: {
        Row: {
          event_type: string
          id: string
          processed_at: string | null
          processing_status: string
          provider: string
          provider_event_id: string
          received_at: string
          redacted_summary: Json
          signature_verified: boolean
          workspace_id: string | null
        }
        Insert: {
          event_type: string
          id?: string
          processed_at?: string | null
          processing_status?: string
          provider: string
          provider_event_id: string
          received_at?: string
          redacted_summary?: Json
          signature_verified?: boolean
          workspace_id?: string | null
        }
        Update: {
          event_type?: string
          id?: string
          processed_at?: string | null
          processing_status?: string
          provider?: string
          provider_event_id?: string
          received_at?: string
          redacted_summary?: Json
          signature_verified?: boolean
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "provider_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      rate_limits: {
        Row: {
          bucket_key: string
          hit_count: number
          reset_at: string
        }
        Insert: {
          bucket_key: string
          hit_count: number
          reset_at: string
        }
        Update: {
          bucket_key?: string
          hit_count?: number
          reset_at?: string
        }
        Relationships: []
      }
      refund_events: {
        Row: {
          amount_minor: number
          confirmed_at: string | null
          created_at: string
          id: string
          idempotency_key: string
          initiated_by: string | null
          payment_id: string
          provider: string
          provider_refund_id: string | null
          reason: string
          status: string
          workspace_id: string | null
        }
        Insert: {
          amount_minor: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key: string
          initiated_by?: string | null
          payment_id: string
          provider: string
          provider_refund_id?: string | null
          reason: string
          status?: string
          workspace_id?: string | null
        }
        Update: {
          amount_minor?: number
          confirmed_at?: string | null
          created_at?: string
          id?: string
          idempotency_key?: string
          initiated_by?: string | null
          payment_id?: string
          provider?: string
          provider_refund_id?: string | null
          reason?: string
          status?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "refund_events_initiated_by_fkey"
            columns: ["initiated_by"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_events_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_events_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      reserved_handles: {
        Row: {
          created_at: string
          handle: string
          reason: string
        }
        Insert: {
          created_at?: string
          handle: string
          reason?: string
        }
        Update: {
          created_at?: string
          handle?: string
          reason?: string
        }
        Relationships: []
      }
      security_events: {
        Row: {
          actor_user_id: string | null
          created_at: string
          details: Json
          endpoint: string | null
          event_type: string
          id: string
          ip_hmac: string | null
          severity: string
        }
        Insert: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          endpoint?: string | null
          event_type: string
          id?: string
          ip_hmac?: string | null
          severity?: string
        }
        Update: {
          actor_user_id?: string | null
          created_at?: string
          details?: Json
          endpoint?: string | null
          event_type?: string
          id?: string
          ip_hmac?: string | null
          severity?: string
        }
        Relationships: [
          {
            foreignKeyName: "security_events_actor_user_id_fkey"
            columns: ["actor_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      subscriptions: {
        Row: {
          base_amount_minor: number
          billing_interval: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end: boolean
          created_at: string
          currency: string
          current_period_end: string
          current_period_start: string
          discount_amount_minor: number
          final_amount_minor: number
          id: string
          last_provider_event_at: string | null
          module: Database["public"]["Enums"]["product_module"]
          plan_id: string
          plan_version: number
          provider: string
          provider_customer_id: string | null
          provider_subscription_id: string | null
          status: Database["public"]["Enums"]["subscription_status"]
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          base_amount_minor?: number
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          discount_amount_minor?: number
          final_amount_minor?: number
          id?: string
          last_provider_event_at?: string | null
          module: Database["public"]["Enums"]["product_module"]
          plan_id: string
          plan_version?: number
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          base_amount_minor?: number
          billing_interval?: Database["public"]["Enums"]["billing_interval"]
          cancel_at_period_end?: boolean
          created_at?: string
          currency?: string
          current_period_end?: string
          current_period_start?: string
          discount_amount_minor?: number
          final_amount_minor?: number
          id?: string
          last_provider_event_at?: string | null
          module?: Database["public"]["Enums"]["product_module"]
          plan_id?: string
          plan_version?: number
          provider?: string
          provider_customer_id?: string | null
          provider_subscription_id?: string | null
          status?: Database["public"]["Enums"]["subscription_status"]
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "subscriptions_plan_id_plan_version_fkey"
            columns: ["plan_id", "plan_version"]
            isOneToOne: false
            referencedRelation: "billing_plans"
            referencedColumns: ["id", "version"]
          },
          {
            foreignKeyName: "subscriptions_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      support_messages: {
        Row: {
          body: string
          created_at: string
          id: string
          sender_user_id: string | null
          ticket_id: string
          visibility: string
        }
        Insert: {
          body: string
          created_at?: string
          id?: string
          sender_user_id?: string | null
          ticket_id: string
          visibility?: string
        }
        Update: {
          body?: string
          created_at?: string
          id?: string
          sender_user_id?: string | null
          ticket_id?: string
          visibility?: string
        }
        Relationships: [
          {
            foreignKeyName: "support_messages_sender_user_id_fkey"
            columns: ["sender_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_messages_ticket_id_fkey"
            columns: ["ticket_id"]
            isOneToOne: false
            referencedRelation: "support_tickets"
            referencedColumns: ["id"]
          },
        ]
      }
      support_tickets: {
        Row: {
          assigned_admin_id: string | null
          category: string
          created_at: string
          id: string
          priority: string
          requester_email: string
          requester_name: string
          requester_user_id: string | null
          sla_due_at: string
          status: string
          subject: string
          ticket_number: string
          updated_at: string
          workspace_id: string | null
        }
        Insert: {
          assigned_admin_id?: string | null
          category: string
          created_at?: string
          id?: string
          priority?: string
          requester_email: string
          requester_name: string
          requester_user_id?: string | null
          sla_due_at?: string
          status?: string
          subject: string
          ticket_number: string
          updated_at?: string
          workspace_id?: string | null
        }
        Update: {
          assigned_admin_id?: string | null
          category?: string
          created_at?: string
          id?: string
          priority?: string
          requester_email?: string
          requester_name?: string
          requester_user_id?: string | null
          sla_due_at?: string
          status?: string
          subject?: string
          ticket_number?: string
          updated_at?: string
          workspace_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "support_tickets_assigned_admin_id_fkey"
            columns: ["assigned_admin_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_requester_user_id_fkey"
            columns: ["requester_user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "support_tickets_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      user_profiles: {
        Row: {
          account_status: string
          avatar_url: string | null
          created_at: string
          email: string
          full_name: string | null
          id: string
          last_active_at: string | null
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email: string
          full_name?: string | null
          id: string
          last_active_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          account_status?: string
          avatar_url?: string | null
          created_at?: string
          email?: string
          full_name?: string | null
          id?: string
          last_active_at?: string | null
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      workspace_entitlements: {
        Row: {
          automation_attribution_enabled: boolean
          automation_log_retention_days: number
          automation_max_active_rules: number | null
          automation_monthly_action_quota: number
          automation_monthly_actions_used: number
          automation_public_replies_enabled: boolean
          bio_analytics_retention_days: number
          bio_custom_themes: boolean
          bio_export_analytics: boolean
          bio_max_blog_posts: number | null
          bio_max_gallery_items: number | null
          bio_max_links: number | null
          bio_remove_branding: boolean
          bio_tier: Database["public"]["Enums"]["plan_tier"]
          ig_tier: Database["public"]["Enums"]["plan_tier"]
          override_expires_at: string | null
          override_reason: string | null
          projection_version: number
          quota_reset_at: string
          updated_at: string
          workspace_id: string
        }
        Insert: {
          automation_attribution_enabled?: boolean
          automation_log_retention_days?: number
          automation_max_active_rules?: number | null
          automation_monthly_action_quota?: number
          automation_monthly_actions_used?: number
          automation_public_replies_enabled?: boolean
          bio_analytics_retention_days?: number
          bio_custom_themes?: boolean
          bio_export_analytics?: boolean
          bio_max_blog_posts?: number | null
          bio_max_gallery_items?: number | null
          bio_max_links?: number | null
          bio_remove_branding?: boolean
          bio_tier?: Database["public"]["Enums"]["plan_tier"]
          ig_tier?: Database["public"]["Enums"]["plan_tier"]
          override_expires_at?: string | null
          override_reason?: string | null
          projection_version?: number
          quota_reset_at?: string
          updated_at?: string
          workspace_id: string
        }
        Update: {
          automation_attribution_enabled?: boolean
          automation_log_retention_days?: number
          automation_max_active_rules?: number | null
          automation_monthly_action_quota?: number
          automation_monthly_actions_used?: number
          automation_public_replies_enabled?: boolean
          bio_analytics_retention_days?: number
          bio_custom_themes?: boolean
          bio_export_analytics?: boolean
          bio_max_blog_posts?: number | null
          bio_max_gallery_items?: number | null
          bio_max_links?: number | null
          bio_remove_branding?: boolean
          bio_tier?: Database["public"]["Enums"]["plan_tier"]
          ig_tier?: Database["public"]["Enums"]["plan_tier"]
          override_expires_at?: string | null
          override_reason?: string | null
          projection_version?: number
          quota_reset_at?: string
          updated_at?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_entitlements_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: true
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspace_members: {
        Row: {
          created_at: string
          role: string
          status: string
          updated_at: string
          user_id: string
          workspace_id: string
        }
        Insert: {
          created_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id: string
          workspace_id: string
        }
        Update: {
          created_at?: string
          role?: string
          status?: string
          updated_at?: string
          user_id?: string
          workspace_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspace_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_members_workspace_id_fkey"
            columns: ["workspace_id"]
            isOneToOne: false
            referencedRelation: "workspaces"
            referencedColumns: ["id"]
          },
        ]
      }
      workspaces: {
        Row: {
          created_at: string
          creator_role: string
          id: string
          intended_modules: string[]
          name: string
          owner_id: string
          slug: string
          status: string
          suspended_reason: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          creator_role?: string
          id?: string
          intended_modules?: string[]
          name: string
          owner_id: string
          slug: string
          status?: string
          suspended_reason?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          creator_role?: string
          id?: string
          intended_modules?: string[]
          name?: string
          owner_id?: string
          slug?: string
          status?: string
          suspended_reason?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "workspaces_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "user_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "workspace_entitlements_workspace_id_fkey"
            columns: ["id"]
            isOneToOne: true
            referencedRelation: "workspace_entitlements"
            referencedColumns: ["workspace_id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      apply_workspace_plan_entitlements: {
        Args: {
          p_billing_interval?: string
          p_override_reason?: string
          p_plan_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      admin_override_workspace_status: {
        Args: {
          p_override_reason?: string
          p_status: string
          p_workspace_id: string
        }
        Returns: Json
      }
      can_edit_workspace: { Args: { p_workspace_id: string }; Returns: boolean }
      confirm_coupon_redemption: {
        Args: { p_redemption_id: string; p_subscription_id: string }
        Returns: boolean
      }
      consume_rate_limit: {
        Args: {
          p_bucket_key: string
          p_max_hits: number
          p_window_seconds: number
        }
        Returns: boolean
      }
      create_creator_page: {
        Args: {
          p_blocks: Json
          p_capability_hash: string
          p_profile: Json
          p_published?: boolean
          p_tabs: Json
        }
        Returns: string
      }
      creator_analytics: {
        Args: { p_page_id: string; p_range_days?: number }
        Returns: Json
      }
      gen_opaque_token: { Args: { p_num_bytes?: number }; Returns: string }
      has_admin_permission: {
        Args: { p_permission_id: string }
        Returns: boolean
      }
      is_active_workspace_member: {
        Args: { p_workspace_id: string }
        Returns: boolean
      }
      preview_coupon: {
        Args: {
          p_billing_interval: Database["public"]["Enums"]["billing_interval"]
          p_currency: string
          p_plan_id: string
          p_plan_version: number
          p_raw_code: string
          p_subtotal_minor: number
          p_user_email: string
          p_workspace_id: string
        }
        Returns: Json
      }
      provision_workspace_and_claim_handle: {
        Args: {
          p_creator_role?: string
          p_display_name: string
          p_handle: string
          p_intended_modules?: string[]
        }
        Returns: Json
      }
      publish_bio_snapshot: {
        Args: { p_expected_draft_version: number; p_workspace_id: string }
        Returns: Json
      }
      release_coupon_reservation: {
        Args: { p_redemption_id: string }
        Returns: boolean
      }
      reserve_coupon_for_checkout: {
        Args: {
          p_billing_interval: Database["public"]["Enums"]["billing_interval"]
          p_currency: string
          p_idempotency_key: string
          p_plan_id: string
          p_plan_version: number
          p_raw_code: string
          p_subtotal_minor: number
          p_user_email: string
          p_user_id: string
          p_workspace_id: string
        }
        Returns: Json
      }
      save_creator_page: {
        Args: {
          p_blocks: Json
          p_page_id: string
          p_profile: Json
          p_tabs: Json
        }
        Returns: undefined
      }
    }
    Enums: {
      billing_interval: "monthly" | "annual" | "lifetime"
      content_status: "draft" | "published" | "archived" | "soft_hidden"
      coupon_discount_type:
        | "percentage"
        | "fixed_amount"
        | "free_trial_days"
        | "bundle_upgrade"
      coupon_duration_type: "once" | "repeating" | "forever"
      coupon_scope_type: "any" | "bio_only" | "automation_only" | "bundle_only"
      dm_status: "PENDING_FOLLOW" | "SENT" | "FAILED"
      ig_connection_status:
        | "not_connected"
        | "pending_authorization"
        | "connected"
        | "degraded"
        | "expired"
        | "revoked"
        | "error"
      ig_execution_status:
        | "received"
        | "verified"
        | "deduplicated"
        | "queued"
        | "evaluating"
        | "skipped"
        | "matched"
        | "reserved"
        | "dispatching"
        | "accepted"
        | "failed_permanent"
        | "retry_scheduled"
        | "outcome_unknown"
        | "reconciled"
        | "canceled"
      ig_match_mode:
        | "exact_token"
        | "exact_comment"
        | "contains"
        | "starts_with"
        | "keyword_list"
        | "all_comments"
      ig_target_scope: "all_eligible_posts" | "specific_media"
      inquiry_status: "new" | "read" | "replied" | "archived" | "spam"
      plan_tier: "free" | "creator" | "pro" | "enterprise"
      product_module: "bio" | "instagram_automation" | "bundle"
      subscription_status:
        | "trialing"
        | "active"
        | "past_due"
        | "paused"
        | "canceled"
        | "expired"
      trigger_type: "ALL_COMMENTS" | "KEYWORD"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Database

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      billing_interval: ["monthly", "annual", "lifetime"],
      content_status: ["draft", "published", "archived", "soft_hidden"],
      coupon_discount_type: [
        "percentage",
        "fixed_amount",
        "free_trial_days",
        "bundle_upgrade",
      ],
      coupon_duration_type: ["once", "repeating", "forever"],
      coupon_scope_type: ["any", "bio_only", "automation_only", "bundle_only"],
      dm_status: ["PENDING_FOLLOW", "SENT", "FAILED"],
      ig_connection_status: [
        "not_connected",
        "pending_authorization",
        "connected",
        "degraded",
        "expired",
        "revoked",
        "error",
      ],
      ig_execution_status: [
        "received",
        "verified",
        "deduplicated",
        "queued",
        "evaluating",
        "skipped",
        "matched",
        "reserved",
        "dispatching",
        "accepted",
        "failed_permanent",
        "retry_scheduled",
        "outcome_unknown",
        "reconciled",
        "canceled",
      ],
      ig_match_mode: [
        "exact_token",
        "exact_comment",
        "contains",
        "starts_with",
        "keyword_list",
        "all_comments",
      ],
      ig_target_scope: ["all_eligible_posts", "specific_media"],
      inquiry_status: ["new", "read", "replied", "archived", "spam"],
      plan_tier: ["free", "creator", "pro", "enterprise"],
      product_module: ["bio", "instagram_automation", "bundle"],
      subscription_status: [
        "trialing",
        "active",
        "past_due",
        "paused",
        "canceled",
        "expired",
      ],
      trigger_type: ["ALL_COMMENTS", "KEYWORD"],
    },
  },
} as const
