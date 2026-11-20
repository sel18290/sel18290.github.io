alter table public.cortex_real_entry_config
  drop constraint if exists cortex_real_entry_config_password_hash_check,
  add constraint cortex_real_entry_config_password_hash_check check (
    password_hash ~ '^[0-9a-f]{64}$' or password_hash ~ '^\$2a\$[0-9]{2}\$[./A-Za-z0-9]{53}$'
  );

create or replace function public.cortex_real_entry_verify(p_password text)
returns boolean
language sql stable security invoker set search_path = ''
as $$
  select coalesce((select case
    when password_hash like '$2a$%' then extensions.crypt(p_password, password_hash) = password_hash
    else encode(extensions.digest(salt || p_password, 'sha256'), 'hex') = password_hash
  end from public.cortex_real_entry_config where id = 1), false)
$$;

alter table public.cortex_real_entry_config enable row level security;
revoke all on public.cortex_real_entry_config from public, anon, authenticated;
grant select on public.cortex_real_entry_config to service_role;
revoke all on function public.cortex_real_entry_verify(text) from public, anon, authenticated;
grant execute on function public.cortex_real_entry_verify(text) to service_role;
