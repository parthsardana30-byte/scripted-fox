begin;

create type public.billing_plan_code as enum ('free', 'creator', 'pro', 'business');
create type public.billing_status as enum ('free', 'trialing', 'active', 'past_due', 'canceled', 'incomplete');

create table public.billing_accounts (
  user_id uuid primary key references auth.users(id) on delete cascade,
  plan_code public.billing_plan_code not null default 'free',
  status public.billing_status not null default 'free',
  provider text check (provider is null or char_length(provider) between 1 and 40),
  provider_customer_id text,
  provider_subscription_id text,
  trial_ends_at timestamptz,
  current_period_end timestamptz,
  cancel_at_period_end boolean not null default false,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now()),
  check ((provider is null and provider_customer_id is null and provider_subscription_id is null) or provider is not null)
);

create unique index billing_provider_customer_unique on public.billing_accounts(provider, provider_customer_id)
  where provider is not null and provider_customer_id is not null;
create unique index billing_provider_subscription_unique on public.billing_accounts(provider, provider_subscription_id)
  where provider is not null and provider_subscription_id is not null;

create table private.billing_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null check (char_length(provider) between 1 and 40),
  provider_event_id text not null,
  event_type text not null,
  payload_sha256 text not null,
  processed_at timestamptz,
  error_code text,
  created_at timestamptz not null default timezone('utc', now()),
  unique (provider, provider_event_id)
);
revoke all on table private.billing_events from public, anon, authenticated;

create trigger billing_accounts_set_updated_at before update on public.billing_accounts
  for each row execute function public.set_updated_at();

insert into public.billing_accounts (user_id) select id from auth.users on conflict (user_id) do nothing;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name, avatar_url)
  values (new.id, new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'avatar_url');
  insert into public.user_preferences (user_id) values (new.id);
  insert into public.billing_accounts (user_id) values (new.id);
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

alter table public.billing_accounts enable row level security;
create policy billing_accounts_select_own on public.billing_accounts for select to authenticated
  using ((select auth.uid()) = user_id);

-- No client write policies: only a future verified billing webhook may change access.
commit;
