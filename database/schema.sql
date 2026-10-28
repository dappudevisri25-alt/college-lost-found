-- Run this in Supabase SQL Editor.
create extension if not exists pgcrypto;

create table if not exists public.items (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  type text not null check (type in ('lost','found')),
  title varchar(90) not null,
  category text not null check (category in ('Electronics','Books & Notes','Clothing','Accessories','Keys & Cards','Other')),
  location varchar(120) not null,
  item_date date not null,
  description varchar(1000) not null default '',
  contact varchar(160) not null,
  status text not null default 'active' check (status in ('active','resolved','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists items_active_created_idx on public.items(status, created_at desc);
create index if not exists items_user_idx on public.items(user_id, created_at desc);
create index if not exists items_category_idx on public.items(category);
create index if not exists items_type_idx on public.items(type);

create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at=now(); return new; end; $$;
drop trigger if exists items_updated_at on public.items;
create trigger items_updated_at before update on public.items
for each row execute function public.set_updated_at();

-- API uses a server-only service role key and enforces ownership/admin checks.
-- RLS remains enabled as defense in depth; browser clients cannot access this table directly.
alter table public.items enable row level security;
revoke all on public.items from anon, authenticated;
