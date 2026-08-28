begin;

insert into auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
) values
  ('00000000-0000-0000-0000-000000000000', '10000000-0000-0000-0000-000000000001', 'authenticated', 'authenticated', 'rls-a@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now()),
  ('00000000-0000-0000-0000-000000000000', '20000000-0000-0000-0000-000000000002', 'authenticated', 'authenticated', 'rls-b@example.test', '', now(), '{}'::jsonb, '{}'::jsonb, now(), now());

set local role authenticated;
select set_config('request.jwt.claim.sub', '10000000-0000-0000-0000-000000000001', true);

insert into public.projects (id, user_id, title)
values ('30000000-0000-0000-0000-000000000003', '10000000-0000-0000-0000-000000000001', 'User A project');

select set_config('request.jwt.claim.sub', '20000000-0000-0000-0000-000000000002', true);

do $$
begin
  if exists (
    select 1 from public.projects
    where id = '30000000-0000-0000-0000-000000000003'
  ) then
    raise exception 'RLS failure: user B can read user A project';
  end if;
end;
$$;

do $$
begin
  begin
    insert into public.scripts (user_id, project_id)
    values ('20000000-0000-0000-0000-000000000002', '30000000-0000-0000-0000-000000000003');
    raise exception 'Ownership failure: user B attached a script to user A project';
  exception
    when foreign_key_violation then null;
  end;
end;
$$;

rollback;
