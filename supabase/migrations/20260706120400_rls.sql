-- 멀티테넌트 권한 함수 + 전 테이블 RLS 정책
-- 권한 요약:
--   is_club_member   조회 (게스트 포함, active 회원)
--   is_full_member   민감 조회 (게스트 제외)
--   can_manage_match 매치/편성/결과/기록  → 회장·감독·코치
--   can_manage_club  회원/회비/공지 관리   → 회장·총무
--   is_club_owner    클럽 설정/삭제        → 회장

-- ── 권한 헬퍼 함수 (security definer: RLS 재귀 방지) ──────────────

create or replace function public.is_club_member(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid() and status = 'active');
$$;

create or replace function public.is_full_member(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid()
      and status = 'active' and role <> 'guest');
$$;

create or replace function public.can_manage_match(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid()
      and status = 'active' and role in ('president', 'manager', 'coach'));
$$;

create or replace function public.can_manage_club(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid()
      and status = 'active' and role in ('president', 'treasurer'));
$$;

create or replace function public.is_club_owner(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid()
      and status = 'active' and role = 'president');
$$;

-- 같은 클럽에 함께 속해 있는지 (프로필 조회용)
create or replace function public.shares_club_with(_user uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from club_members a
    join club_members b on a.club_id = b.club_id
    where a.user_id = auth.uid() and b.user_id = _user
      and a.status = 'active' and b.status = 'active');
$$;

-- ── RLS 활성화 ────────────────────────────────────────────────

alter table profiles           enable row level security;
alter table clubs              enable row level security;
alter table club_members       enable row level security;
alter table matches            enable row level security;
alter table match_attendances  enable row level security;
alter table match_results      enable row level security;
alter table match_stats        enable row level security;
alter table payments           enable row level security;
alter table posts              enable row level security;
alter table comments           enable row level security;
alter table push_subscriptions enable row level security;
alter table notifications      enable row level security;

-- ── profiles ─────────────────────────────────────────────────
create policy "profile read" on profiles for select to authenticated
  using (id = auth.uid() or shares_club_with(id));
create policy "profile self write" on profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

-- ── clubs (디렉터리: 목록/검색은 전체 공개, 관리는 회장) ─────────
create policy "club read"   on clubs for select to authenticated using (true);
create policy "club create" on clubs for insert to authenticated with check (created_by = auth.uid());
create policy "club update" on clubs for update to authenticated using (is_club_owner(id));
create policy "club delete" on clubs for delete to authenticated using (is_club_owner(id));

-- ── club_members ─────────────────────────────────────────────
create policy "member read" on club_members for select to authenticated
  using (is_full_member(club_id) or user_id = auth.uid());
-- 가입 신청: 본인만, member/guest 역할로 pending 상태만 (회장 자가임명 차단)
create policy "member join" on club_members for insert to authenticated
  with check (user_id = auth.uid() and role in ('member', 'guest') and status = 'pending');
-- 승인/역할변경: 회장·총무
create policy "member manage" on club_members for update to authenticated
  using (can_manage_club(club_id)) with check (can_manage_club(club_id));
-- 탈퇴(본인) 또는 강퇴(회장·총무)
create policy "member remove" on club_members for delete to authenticated
  using (user_id = auth.uid() or can_manage_club(club_id));

-- ── matches ──────────────────────────────────────────────────
create policy "match read"  on matches for select to authenticated using (is_club_member(club_id));
create policy "match write" on matches for all to authenticated
  using (can_manage_match(club_id)) with check (can_manage_match(club_id));

-- ── match_attendances (조회: 소속회원 / 쓰기: 본인 투표) ─────────
create policy "attend read" on match_attendances for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));
create policy "attend self" on match_attendances for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ── match_results ────────────────────────────────────────────
create policy "result read" on match_results for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));
create policy "result write" on match_results for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));

-- ── match_stats ──────────────────────────────────────────────
create policy "stats read" on match_stats for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));
create policy "stats write" on match_stats for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));

-- ── payments (관리: 회장·총무 / 조회: 본인 것, 게스트 제외) ───────
create policy "pay admin" on payments for all to authenticated
  using (can_manage_club(club_id)) with check (can_manage_club(club_id));
create policy "pay self" on payments for select to authenticated
  using (user_id = auth.uid() and is_full_member(club_id));

-- ── posts (조회: 소속회원 / 작성: 회원, notice는 운영진만) ────────
create policy "post read" on posts for select to authenticated using (is_club_member(club_id));
create policy "post write" on posts for insert to authenticated with check (
  is_club_member(club_id) and author_id = auth.uid()
  and (category <> 'notice' or can_manage_club(club_id) or can_manage_match(club_id))
);
create policy "post own" on posts for update to authenticated
  using (author_id = auth.uid() or can_manage_club(club_id));
create policy "post delete" on posts for delete to authenticated
  using (author_id = auth.uid() or can_manage_club(club_id));

-- ── comments ─────────────────────────────────────────────────
create policy "comment read" on comments for select to authenticated
  using (is_club_member((select club_id from posts p where p.id = post_id)));
create policy "comment write" on comments for insert to authenticated with check (
  author_id = auth.uid()
  and is_club_member((select club_id from posts p where p.id = post_id))
);
create policy "comment own" on comments for delete to authenticated
  using (author_id = auth.uid()
    or can_manage_club((select club_id from posts p where p.id = post_id)));

-- ── notifications / push_subscriptions (무조건 본인 것) ──────────
create policy "noti own" on notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "push own" on push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
