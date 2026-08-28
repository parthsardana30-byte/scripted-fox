export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Relationship = {
  foreignKeyName: string;
  columns: string[];
  isOneToOne: boolean;
  referencedRelation: string;
  referencedColumns: string[];
};

type Table<Row, Insert, Update, Relationships extends Relationship[] = Relationship[]> = {
  Row: Row;
  Insert: Insert;
  Update: Update;
  Relationships: Relationships;
};

type BaseRow = { id: string; created_at: string };
type UserOwned = { user_id: string };
type Timestamped = { updated_at: string };

export type ProjectStatus = "idea" | "planning" | "writing" | "ready_to_record" | "complete";
export type IdeaStatus = "recommended" | "saved" | "dismissed" | "used";
export type ConnectionStatus = "connecting" | "syncing" | "connected" | "stale" | "permission_expired" | "disconnected" | "error";
export type SyncStatus = "queued" | "running" | "succeeded" | "partial" | "failed";
export type ExportStatus = "queued" | "processing" | "ready" | "failed" | "expired";
export type ExportFormat = "pdf" | "docx" | "txt" | "markdown" | "srt";
export type EvidenceSource = "channel" | "youtube_trend";
export type BillingPlanCode = "free" | "creator" | "pro" | "business" | "elite";
export type BillingStatus = "free" | "trialing" | "active" | "past_due" | "canceled" | "incomplete";

type FlexibleInsert<T extends BaseRow> = Omit<T, "id" | "created_at"> & { id?: string; created_at?: string };
type FlexibleUpdate<T> = Partial<T>;

export interface Database {
  public: {
    Tables: {
      profiles: Table<{ id: string; display_name: string | null; avatar_url: string | null; created_at: string; updated_at: string }, { id: string; display_name?: string | null; avatar_url?: string | null; created_at?: string; updated_at?: string }, FlexibleUpdate<{ display_name: string | null; avatar_url: string | null; updated_at: string }>>;
      user_preferences: Table<{ user_id: string; content_languages: string[]; target_markets: string[]; default_script_preferences: Json; export_defaults: Json; created_at: string; updated_at: string }, { user_id: string; content_languages?: string[]; target_markets?: string[]; default_script_preferences?: Json; export_defaults?: Json; created_at?: string; updated_at?: string }, FlexibleUpdate<{ content_languages: string[]; target_markets: string[]; default_script_preferences: Json; export_defaults: Json; updated_at: string }>>;
      usage_events: Table<BaseRow & UserOwned & { operation: string; provider: string | null; model: string | null; input_units: number | null; output_units: number | null; cost_microunits: number | null; metadata: Json }, FlexibleInsert<BaseRow & UserOwned & { operation: string; provider: string | null; model: string | null; input_units: number | null; output_units: number | null; cost_microunits: number | null; metadata: Json }>, FlexibleUpdate<UserOwned & { operation: string; provider: string | null; model: string | null; input_units: number | null; output_units: number | null; cost_microunits: number | null; metadata: Json }>>;
      billing_accounts: Table<{ user_id: string; plan_code: BillingPlanCode; status: BillingStatus; provider: string | null; provider_customer_id: string | null; provider_subscription_id: string | null; trial_ends_at: string | null; current_period_end: string | null; cancel_at_period_end: boolean; created_at: string; updated_at: string }, { user_id: string; plan_code?: BillingPlanCode; status?: BillingStatus; provider?: string | null; provider_customer_id?: string | null; provider_subscription_id?: string | null; trial_ends_at?: string | null; current_period_end?: string | null; cancel_at_period_end?: boolean; created_at?: string; updated_at?: string }, FlexibleUpdate<{ plan_code: BillingPlanCode; status: BillingStatus; provider: string | null; provider_customer_id: string | null; provider_subscription_id: string | null; trial_ends_at: string | null; current_period_end: string | null; cancel_at_period_end: boolean; updated_at: string }>>;
      youtube_connections: Table<BaseRow & UserOwned & Timestamped & { channel_id: string | null; channel_title: string | null; channel_thumbnail_url: string | null; status: ConnectionStatus; scopes: string[]; token_expires_at: string | null; last_synced_at: string | null; last_error_code: string | null }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { channel_id: string | null; channel_title: string | null; channel_thumbnail_url: string | null; status: ConnectionStatus; scopes: string[]; token_expires_at: string | null; last_synced_at: string | null; last_error_code: string | null }>, FlexibleUpdate<UserOwned & Timestamped & { channel_id: string | null; channel_title: string | null; channel_thumbnail_url: string | null; status: ConnectionStatus; scopes: string[]; token_expires_at: string | null; last_synced_at: string | null; last_error_code: string | null }>>;
      channel_snapshots: Table<BaseRow & UserOwned & { connection_id: string; period_start: string; period_end: string; metrics: Json; captured_at: string; expires_at: string | null }, FlexibleInsert<BaseRow & UserOwned & { connection_id: string; period_start: string; period_end: string; metrics: Json; captured_at: string; expires_at: string | null }>, FlexibleUpdate<UserOwned & { connection_id: string; period_start: string; period_end: string; metrics: Json; captured_at: string; expires_at: string | null }>>;
      video_metrics: Table<BaseRow & UserOwned & { connection_id: string; youtube_video_id: string; title: string; published_at: string | null; metrics: Json; captured_at: string }, FlexibleInsert<BaseRow & UserOwned & { connection_id: string; youtube_video_id: string; title: string; published_at: string | null; metrics: Json; captured_at: string }>, FlexibleUpdate<UserOwned & { connection_id: string; youtube_video_id: string; title: string; published_at: string | null; metrics: Json; captured_at: string }>>;
      creator_profiles: Table<BaseRow & UserOwned & { connection_id: string; version: number; summary: Json; source_snapshot_at: string }, FlexibleInsert<BaseRow & UserOwned & { connection_id: string; version: number; summary: Json; source_snapshot_at: string }>, FlexibleUpdate<UserOwned & { connection_id: string; version: number; summary: Json; source_snapshot_at: string }>>;
      trend_snapshots: Table<BaseRow & { source: string; market: string; language: string; niche: string; window_start: string; window_end: string; evidence: Json; confidence: number | null; captured_at: string; expires_at: string }, FlexibleInsert<BaseRow & { source: string; market: string; language: string; niche: string; window_start: string; window_end: string; evidence: Json; confidence: number | null; captured_at: string; expires_at: string }>, FlexibleUpdate<{ source: string; market: string; language: string; niche: string; window_start: string; window_end: string; evidence: Json; confidence: number | null; captured_at: string; expires_at: string }>>;
      sync_runs: Table<BaseRow & UserOwned & { connection_id: string | null; kind: string; status: SyncStatus; started_at: string | null; finished_at: string | null; error_code: string | null; details: Json }, FlexibleInsert<BaseRow & UserOwned & { connection_id: string | null; kind: string; status: SyncStatus; started_at: string | null; finished_at: string | null; error_code: string | null; details: Json }>, FlexibleUpdate<UserOwned & { connection_id: string | null; kind: string; status: SyncStatus; started_at: string | null; finished_at: string | null; error_code: string | null; details: Json }>>;
      ideas: Table<BaseRow & UserOwned & Timestamped & { title: string; angle: string; format: string; reason: string; status: IdeaStatus; recommendation_batch_id: string | null; creator_profile_version: number | null; generation_version: string | null; dismissed_at: string | null }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { title: string; angle: string; format: string; reason: string; status: IdeaStatus; recommendation_batch_id: string | null; creator_profile_version: number | null; generation_version: string | null; dismissed_at: string | null }>, FlexibleUpdate<UserOwned & Timestamped & { title: string; angle: string; format: string; reason: string; status: IdeaStatus; recommendation_batch_id: string | null; creator_profile_version: number | null; generation_version: string | null; dismissed_at: string | null }>>;
      idea_evidence: Table<BaseRow & UserOwned & { idea_id: string; source: EvidenceSource; label: string; value: string; explanation: string | null; source_snapshot_id: string | null; captured_at: string }, FlexibleInsert<BaseRow & UserOwned & { idea_id: string; source: EvidenceSource; label: string; value: string; explanation: string | null; source_snapshot_id: string | null; captured_at: string }>, FlexibleUpdate<UserOwned & { idea_id: string; source: EvidenceSource; label: string; value: string; explanation: string | null; source_snapshot_id: string | null; captured_at: string }>>;
      projects: Table<BaseRow & UserOwned & Timestamped & { source_idea_id: string | null; title: string; status: ProjectStatus; archived_at: string | null }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { source_idea_id: string | null; title: string; status: ProjectStatus; archived_at: string | null }>, FlexibleUpdate<UserOwned & Timestamped & { source_idea_id: string | null; title: string; status: ProjectStatus; archived_at: string | null }>>;
      video_plans: Table<BaseRow & UserOwned & Timestamped & { project_id: string; content: Json }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { project_id: string; content: Json }>, FlexibleUpdate<UserOwned & Timestamped & { project_id: string; content: Json }>>;
      scripts: Table<BaseRow & UserOwned & Timestamped & { project_id: string; active_version: number; word_count: number; estimated_duration_seconds: number | null }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { project_id: string; active_version: number; word_count: number; estimated_duration_seconds: number | null }>, FlexibleUpdate<UserOwned & Timestamped & { project_id: string; active_version: number; word_count: number; estimated_duration_seconds: number | null }>>;
      script_sections: Table<BaseRow & UserOwned & Timestamped & { script_id: string; position: number; heading: string; body: string; kind: string }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { script_id: string; position: number; heading: string; body: string; kind: string }>, FlexibleUpdate<UserOwned & Timestamped & { script_id: string; position: number; heading: string; body: string; kind: string }>>;
      script_versions: Table<BaseRow & UserOwned & { script_id: string; version: number; label: string; snapshot: Json; origin: string }, FlexibleInsert<BaseRow & UserOwned & { script_id: string; version: number; label: string; snapshot: Json; origin: string }>, FlexibleUpdate<UserOwned & { script_id: string; version: number; label: string; snapshot: Json; origin: string }>>;
      recording_notes: Table<BaseRow & UserOwned & Timestamped & { project_id: string; content: Json }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { project_id: string; content: Json }>, FlexibleUpdate<UserOwned & Timestamped & { project_id: string; content: Json }>>;
      exports: Table<BaseRow & UserOwned & Timestamped & { project_id: string; format: ExportFormat; status: ExportStatus; options: Json; storage_path: string | null; error_code: string | null; expires_at: string | null }, FlexibleInsert<BaseRow & UserOwned & Timestamped & { project_id: string; format: ExportFormat; status: ExportStatus; options: Json; storage_path: string | null; error_code: string | null; expires_at: string | null }>, FlexibleUpdate<UserOwned & Timestamped & { project_id: string; format: ExportFormat; status: ExportStatus; options: Json; storage_path: string | null; error_code: string | null; expires_at: string | null }>>;
    };
    Views: Record<string, never>;
    Functions: {
      store_youtube_credentials: {
        Args: { p_connection_id: string; p_ciphertext_base64: string };
        Returns: undefined;
      };
      read_youtube_credentials: {
        Args: { p_connection_id: string };
        Returns: string | null;
      };
    };
    Enums: {
      project_status: ProjectStatus;
      idea_status: IdeaStatus;
      connection_status: ConnectionStatus;
      sync_status: SyncStatus;
      export_status: ExportStatus;
      export_format: ExportFormat;
      evidence_source: EvidenceSource;
      billing_plan_code: BillingPlanCode;
      billing_status: BillingStatus;
    };
    CompositeTypes: Record<string, never>;
  };
}
