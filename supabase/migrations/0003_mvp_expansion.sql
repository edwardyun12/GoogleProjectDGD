alter table public.parties
  add column if not exists profile_questions jsonb not null default '[]'::jsonb;

alter table public.participants
  add column if not exists bio text,
  add column if not exists age_group text,
  add column if not exists appearance_tags text[] not null default '{}',
  add column if not exists custom_answers jsonb not null default '{}'::jsonb,
  add column if not exists photo_path text;

update public.participants
set age_group = case
  when age < 20 then '10대'
  when age < 25 then '20대 초반'
  when age < 30 then '20대 후반'
  when age < 35 then '30대 초반'
  when age < 40 then '30대 후반'
  when age < 50 then '40대'
  when age >= 50 then '50대 이상'
  else age_group
end
where age_group is null;

alter table public.participants drop constraint if exists participants_age_group_check;
alter table public.participants add constraint participants_age_group_check
  check (age_group is null or age_group in ('10대','20대 초반','20대 후반','30대 초반','30대 후반','40대','50대 이상','응답하지 않음'));

alter table public.missions drop constraint if exists missions_judge_type_check;
alter table public.missions add constraint missions_judge_type_check
  check (judge_type in ('self','auto_cards','matching'));

drop index if exists public.missions_one_active_per_party;
create unique index if not exists missions_one_scheduled_active_per_party
  on public.missions (party_id)
  where status = 'active' and kind = 'scheduled';

alter table public.cards add column if not exists exchange_id uuid;
update public.cards set exchange_id = gen_random_uuid() where exchange_id is null;
alter table public.cards alter column exchange_id set default gen_random_uuid();
alter table public.cards alter column exchange_id set not null;
create index if not exists cards_party_exchange_idx on public.cards (party_id, exchange_id);

create table if not exists public.card_exchanges (
  id uuid primary key default gen_random_uuid(),
  party_id uuid not null references public.parties(id) on delete cascade,
  participant_a uuid not null references public.participants(id) on delete cascade,
  participant_b uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (participant_a <> participant_b)
);
create index if not exists card_exchanges_party_created_idx on public.card_exchanges (party_id, created_at desc);
alter table public.card_exchanges enable row level security;

create table if not exists public.mission_matches (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  matched_participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mission_id, participant_id, matched_participant_id),
  check (participant_id <> matched_participant_id)
);
create index if not exists mission_matches_target_idx
  on public.mission_matches (mission_id, matched_participant_id);
alter table public.mission_matches enable row level security;

alter table public.mission_matches drop constraint if exists mission_matches_mission_id_participant_id_key;
create unique index if not exists mission_matches_unique_pair_idx
  on public.mission_matches (mission_id, participant_id, matched_participant_id);

create table if not exists public.mission_match_completions (
  id uuid primary key default gen_random_uuid(),
  mission_id uuid not null references public.missions(id) on delete cascade,
  participant_id uuid not null references public.participants(id) on delete cascade,
  matched_participant_id uuid not null references public.participants(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (mission_id, participant_id, matched_participant_id)
);
alter table public.mission_match_completions enable row level security;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('profile-photos', 'profile-photos', true, 5242880, array['image/jpeg','image/png','image/webp','image/gif'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;
