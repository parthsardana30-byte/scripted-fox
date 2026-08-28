create function public.store_youtube_credentials(
  p_connection_id uuid,
  p_ciphertext_base64 text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;

  insert into private.youtube_credentials (connection_id, refresh_token_ciphertext)
  values (p_connection_id, decode(p_ciphertext_base64, 'base64'))
  on conflict (connection_id) do update
    set refresh_token_ciphertext = excluded.refresh_token_ciphertext,
        encryption_version = 1,
        updated_at = timezone('utc', now());
end;
$$;

revoke all on function public.store_youtube_credentials(uuid, text) from public, anon, authenticated;
grant execute on function public.store_youtube_credentials(uuid, text) to service_role;

create function public.read_youtube_credentials(p_connection_id uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  result text;
begin
  if (select auth.role()) <> 'service_role' then
    raise exception 'insufficient privilege' using errcode = '42501';
  end if;

  select encode(refresh_token_ciphertext, 'base64')
  into result
  from private.youtube_credentials
  where connection_id = p_connection_id;

  return result;
end;
$$;

revoke all on function public.read_youtube_credentials(uuid) from public, anon, authenticated;
grant execute on function public.read_youtube_credentials(uuid) to service_role;
