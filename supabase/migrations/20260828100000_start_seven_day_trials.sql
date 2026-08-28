begin;

-- Existing pre-launch accounts receive the same trial as new accounts.
update public.billing_accounts
set
  plan_code = 'pro',
  status = 'trialing',
  trial_ends_at = timezone('utc', now()) + interval '7 days',
  updated_at = timezone('utc', now())
where status = 'free';

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
  insert into public.billing_accounts (user_id, plan_code, status, trial_ends_at)
  values (new.id, 'pro', 'trialing', timezone('utc', now()) + interval '7 days');
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
