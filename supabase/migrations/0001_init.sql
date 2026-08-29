create extension if not exists "pgcrypto";

create table public.parties (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  host_message text not null default '',
  entry_code text not null unique,
  host_pin_hash text not null,
  status text not null default 'ready' check (status in ('ready', 'running', 'ended')),
  created_at timestamptz not null default now(),
  started_at timestamptz,
  ended_at timestamptz
);

create table public.participants (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  nickname text not null,
  password_hash text not null,
  age int check (age between 14 and 120),
  gender text,
  mbti text,
  appearance text,
  card_token text not null unique default replace(replace(encode(gen_random_bytes(12), 'base64'), '/', '_'), '+', '-'),
  created_at timestamptz not null default now(),
  unique (party_id, nickname)
);

create table public.missions (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  content text not null,
  duration_sec int not null check (duration_sec > 0),
  order_index int not null,
  kind text not null default 'scheduled' check (kind in ('scheduled', 'surprise')),
  judge_type text not null default 'self' check (judge_type in ('self', 'auto_cards')),
  auto_target int check (auto_target is null or auto_target > 0),
  status text not null default 'pending' check (status in ('pending', 'active', 'done')),
  started_at timestamptz,
  ends_at timestamptz
);
create index missions_party_order_idx on public.missions (party_id, order_index);
create unique index missions_one_active_per_party on public.missions (party_id) where status = 'active';

create table public.mission_results (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  result text not null check (result in ('success', 'fail')),
  source text not null default 'self' check (source in ('self', 'auto')),
  created_at timestamptz not null default now(),
  unique (mission_id, participant_id)
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  scanner_id uuid not null references public.participants(id) on delete cascade,
  scanned_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (scanner_id, scanned_id),
  check (scanner_id <> scanned_id)
);
create index cards_party_scanner_idx on public.cards (party_id, scanner_id);

