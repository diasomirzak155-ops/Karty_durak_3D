-- Persistent state store for Durak Online Link Edition
create table if not exists public.durak_state (
  id text primary key check (id = 'main'),
  data jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.durak_state enable row level security;
revoke all on table public.durak_state from anon, authenticated;
grant all on table public.durak_state to service_role;
