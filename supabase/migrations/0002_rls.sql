alter table public.parties enable row level security;
alter table public.participants enable row level security;
alter table public.missions enable row level security;
alter table public.mission_results enable row level security;
alter table public.cards enable row level security;

-- 참가자 앱의 Realtime 구독에 필요한 공개 읽기 전용 정책이다.
drop policy if exists "missions are publicly readable" on public.missions;
create policy "missions are publicly readable"
on public.missions for select
to anon, authenticated
using (true);

do $$
begin
  if not exists (
    select 1
    from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'missions'
  ) then
    alter publication supabase_realtime add table public.missions;
  end if;
end $$;
