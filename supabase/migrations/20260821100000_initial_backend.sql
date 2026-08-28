begin;

create extension if not exists pgcrypto with schema extensions;
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create type public.project_status as enum ('idea', 'planning', 'writing', 'ready_to_record', 'complete');
create type public.idea_status as enum ('recommended', 'saved', 'dismissed', 'used');
create type public.connection_status as enum ('connecting', 'syncing', 'connected', 'stale', 'permission_expired', 'disconnected', 'error');
create type public.sync_status as enum ('queued', 'running', 'succeeded', 'partial', 'failed');
create type public.export_status as enum ('queued', 'processing', 'ready', 'failed', 'expired');
create type public.export_format as enum ('pdf', 'docx', 'txt', 'markdown', 'srt');
create type public.evidence_source as enum ('channel', 'youtube_trend');

create function public.set_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text check (char_length(display_name) <= 80),
  avatar_url text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.user_preferences (
  user_id uuid primary key references auth.users(id) on delete cascade,
  content_languages text[] not null default array['en', 'hi'],
  target_markets text[] not null default array['IN', 'GLOBAL'],
  default_script_preferences jsonb not null default '{}'::jsonb,
  export_defaults jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.usage_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  operation text not null check (char_length(operation) between 1 and 80),
  provider text check (char_length(provider) <= 40),
  model text check (char_length(model) <= 80),
  input_units integer check (input_units >= 0),
  output_units integer check (output_units >= 0),
  cost_microunits bigint check (cost_microunits >= 0),
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.youtube_connections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  channel_id text unique,
  channel_title text,
  channel_thumbnail_url text,
  status public.connection_status not null default 'connecting',
  scopes text[] not null default '{}',
  token_expires_at timestamptz,
  last_synced_at timestamptz,
  last_error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table private.youtube_credentials (
  connection_id uuid primary key references public.youtube_connections(id) on delete cascade,
  refresh_token_ciphertext bytea not null,
  encryption_version smallint not null default 1 check (encryption_version > 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);
revoke all on table private.youtube_credentials from public, anon, authenticated;

create table public.channel_snapshots (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null,
  period_start date not null,
  period_end date not null,
  metrics jsonb not null,
  captured_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz,
  check (period_end >= period_start),
  foreign key (connection_id, user_id) references public.youtube_connections(id, user_id) on delete cascade
);

create table public.video_metrics (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null,
  youtube_video_id text not null,
  title text not null,
  published_at timestamptz,
  metrics jsonb not null,
  captured_at timestamptz not null default timezone('utc', now()),
  unique (connection_id, youtube_video_id, captured_at),
  foreign key (connection_id, user_id) references public.youtube_connections(id, user_id) on delete cascade
);

create table public.creator_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null,
  version integer not null check (version > 0),
  summary jsonb not null,
  source_snapshot_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  unique (user_id, version),
  foreign key (connection_id, user_id) references public.youtube_connections(id, user_id) on delete cascade
);

create table public.trend_snapshots (
  id uuid primary key default gen_random_uuid(),
  source text not null,
  market text not null,
  language text not null,
  niche text not null,
  window_start timestamptz not null,
  window_end timestamptz not null,
  evidence jsonb not null,
  confidence numeric(4,3) check (confidence between 0 and 1),
  captured_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null,
  check (window_end >= window_start),
  unique (source, market, language, niche, window_start, window_end)
);

create table public.sync_runs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid,
  kind text not null,
  status public.sync_status not null default 'queued',
  started_at timestamptz,
  finished_at timestamptz,
  error_code text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (connection_id, user_id) references public.youtube_connections(id, user_id) on delete cascade
);

create table public.ideas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  angle text not null check (char_length(angle) between 1 and 1000),
  format text not null check (char_length(format) between 1 and 120),
  reason text not null check (char_length(reason) between 1 and 2000),
  status public.idea_status not null default 'recommended',
  recommendation_batch_id uuid,
  creator_profile_version integer,
  generation_version text,
  dismissed_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id)
);

create table public.idea_evidence (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  idea_id uuid not null,
  source public.evidence_source not null,
  label text not null,
  value text not null,
  explanation text,
  source_snapshot_id uuid,
  captured_at timestamptz not null,
  created_at timestamptz not null default timezone('utc', now()),
  foreign key (idea_id, user_id) references public.ideas(id, user_id) on delete cascade
);

create table public.projects (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  source_idea_id uuid,
  title text not null check (char_length(title) between 1 and 180),
  status public.project_status not null default 'idea',
  archived_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  foreign key (source_idea_id, user_id) references public.ideas(id, user_id) on delete set null (source_idea_id)
);

create table public.video_plans (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null unique,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (project_id, user_id) references public.projects(id, user_id) on delete cascade
);

create table public.scripts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null unique,
  active_version integer not null default 1 check (active_version > 0),
  word_count integer not null default 0 check (word_count >= 0),
  estimated_duration_seconds integer check (estimated_duration_seconds >= 0),
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (id, user_id),
  foreign key (project_id, user_id) references public.projects(id, user_id) on delete cascade
);

create table public.script_sections (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null,
  position integer not null check (position >= 0),
  heading text not null check (char_length(heading) between 1 and 160),
  body text not null default '',
  kind text not null default 'section',
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  unique (script_id, position),
  foreign key (script_id, user_id) references public.scripts(id, user_id) on delete cascade
);

create table public.script_versions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  script_id uuid not null,
  version integer not null check (version > 0),
  label text not null,
  snapshot jsonb not null,
  origin text not null check (origin in ('user', 'ai', 'autosave', 'restore')),
  created_at timestamptz not null default timezone('utc', now()),
  unique (script_id, version),
  foreign key (script_id, user_id) references public.scripts(id, user_id) on delete cascade
);

create table public.recording_notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null unique,
  content jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (project_id, user_id) references public.projects(id, user_id) on delete cascade
);

create table public.exports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  project_id uuid not null,
  format public.export_format not null,
  status public.export_status not null default 'queued',
  options jsonb not null default '{}'::jsonb,
  storage_path text,
  error_code text,
  expires_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  foreign key (project_id, user_id) references public.projects(id, user_id) on delete cascade
);

create index usage_events_user_created_idx on public.usage_events(user_id, created_at desc);
create index channel_snapshots_user_captured_idx on public.channel_snapshots(user_id, captured_at desc);
create index video_metrics_user_published_idx on public.video_metrics(user_id, published_at desc);
create index trend_snapshots_lookup_idx on public.trend_snapshots(market, language, niche, captured_at desc);
create index sync_runs_user_created_idx on public.sync_runs(user_id, created_at desc);
create index ideas_user_status_created_idx on public.ideas(user_id, status, created_at desc);
create index idea_evidence_idea_idx on public.idea_evidence(idea_id);
create index projects_user_updated_idx on public.projects(user_id, updated_at desc);
create index script_sections_script_position_idx on public.script_sections(script_id, position);
create index script_versions_script_version_idx on public.script_versions(script_id, version desc);
create index exports_user_created_idx on public.exports(user_id, created_at desc);

create trigger profiles_set_updated_at before update on public.profiles for each row execute function public.set_updated_at();
create trigger preferences_set_updated_at before update on public.user_preferences for each row execute function public.set_updated_at();
create trigger connections_set_updated_at before update on public.youtube_connections for each row execute function public.set_updated_at();
create trigger ideas_set_updated_at before update on public.ideas for each row execute function public.set_updated_at();
create trigger projects_set_updated_at before update on public.projects for each row execute function public.set_updated_at();
create trigger plans_set_updated_at before update on public.video_plans for each row execute function public.set_updated_at();
create trigger scripts_set_updated_at before update on public.scripts for each row execute function public.set_updated_at();
create trigger sections_set_updated_at before update on public.script_sections for each row execute function public.set_updated_at();
create trigger notes_set_updated_at before update on public.recording_notes for each row execute function public.set_updated_at();
create trigger exports_set_updated_at before update on public.exports for each row execute function public.set_updated_at();
create trigger credentials_set_updated_at before update on private.youtube_credentials for each row execute function public.set_updated_at();

create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.usage_events enable row level security;
alter table public.youtube_connections enable row level security;
alter table public.channel_snapshots enable row level security;
alter table public.video_metrics enable row level security;
alter table public.creator_profiles enable row level security;
alter table public.trend_snapshots enable row level security;
alter table public.sync_runs enable row level security;
alter table public.ideas enable row level security;
alter table public.idea_evidence enable row level security;
alter table public.projects enable row level security;
alter table public.video_plans enable row level security;
alter table public.scripts enable row level security;
alter table public.script_sections enable row level security;
alter table public.script_versions enable row level security;
alter table public.recording_notes enable row level security;
alter table public.exports enable row level security;

create policy profiles_select_own on public.profiles for select to authenticated using ((select auth.uid()) = id);
create policy profiles_update_own on public.profiles for update to authenticated using ((select auth.uid()) = id) with check ((select auth.uid()) = id);
create policy preferences_select_own on public.user_preferences for select to authenticated using ((select auth.uid()) = user_id);
create policy preferences_update_own on public.user_preferences for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);

create policy usage_events_select_own on public.usage_events for select to authenticated using ((select auth.uid()) = user_id);
create policy usage_events_insert_own on public.usage_events for insert to authenticated with check ((select auth.uid()) = user_id);
create policy youtube_connections_select_own on public.youtube_connections for select to authenticated using ((select auth.uid()) = user_id);
create policy channel_snapshots_select_own on public.channel_snapshots for select to authenticated using ((select auth.uid()) = user_id);
create policy video_metrics_select_own on public.video_metrics for select to authenticated using ((select auth.uid()) = user_id);
create policy creator_profiles_select_own on public.creator_profiles for select to authenticated using ((select auth.uid()) = user_id);
create policy trend_snapshots_select_authenticated on public.trend_snapshots for select to authenticated using (true);
create policy sync_runs_select_own on public.sync_runs for select to authenticated using ((select auth.uid()) = user_id);

create policy ideas_select_own on public.ideas for select to authenticated using ((select auth.uid()) = user_id);
create policy ideas_insert_own on public.ideas for insert to authenticated with check ((select auth.uid()) = user_id);
create policy ideas_update_own on public.ideas for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy ideas_delete_own on public.ideas for delete to authenticated using ((select auth.uid()) = user_id);
create policy idea_evidence_select_own on public.idea_evidence for select to authenticated using ((select auth.uid()) = user_id);
create policy idea_evidence_insert_own on public.idea_evidence for insert to authenticated with check ((select auth.uid()) = user_id);
create policy idea_evidence_update_own on public.idea_evidence for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy idea_evidence_delete_own on public.idea_evidence for delete to authenticated using ((select auth.uid()) = user_id);
create policy projects_select_own on public.projects for select to authenticated using ((select auth.uid()) = user_id);
create policy projects_insert_own on public.projects for insert to authenticated with check ((select auth.uid()) = user_id);
create policy projects_update_own on public.projects for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy projects_delete_own on public.projects for delete to authenticated using ((select auth.uid()) = user_id);
create policy video_plans_select_own on public.video_plans for select to authenticated using ((select auth.uid()) = user_id);
create policy video_plans_insert_own on public.video_plans for insert to authenticated with check ((select auth.uid()) = user_id);
create policy video_plans_update_own on public.video_plans for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy video_plans_delete_own on public.video_plans for delete to authenticated using ((select auth.uid()) = user_id);
create policy scripts_select_own on public.scripts for select to authenticated using ((select auth.uid()) = user_id);
create policy scripts_insert_own on public.scripts for insert to authenticated with check ((select auth.uid()) = user_id);
create policy scripts_update_own on public.scripts for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy scripts_delete_own on public.scripts for delete to authenticated using ((select auth.uid()) = user_id);
create policy script_sections_select_own on public.script_sections for select to authenticated using ((select auth.uid()) = user_id);
create policy script_sections_insert_own on public.script_sections for insert to authenticated with check ((select auth.uid()) = user_id);
create policy script_sections_update_own on public.script_sections for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy script_sections_delete_own on public.script_sections for delete to authenticated using ((select auth.uid()) = user_id);
create policy script_versions_select_own on public.script_versions for select to authenticated using ((select auth.uid()) = user_id);
create policy script_versions_insert_own on public.script_versions for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recording_notes_select_own on public.recording_notes for select to authenticated using ((select auth.uid()) = user_id);
create policy recording_notes_insert_own on public.recording_notes for insert to authenticated with check ((select auth.uid()) = user_id);
create policy recording_notes_update_own on public.recording_notes for update to authenticated using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
create policy recording_notes_delete_own on public.recording_notes for delete to authenticated using ((select auth.uid()) = user_id);
create policy exports_select_own on public.exports for select to authenticated using ((select auth.uid()) = user_id);
create policy exports_insert_own on public.exports for insert to authenticated with check ((select auth.uid()) = user_id);
create policy exports_delete_own on public.exports for delete to authenticated using ((select auth.uid()) = user_id);

commit;
