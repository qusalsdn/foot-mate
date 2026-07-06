-- RLS/무결성 보강
-- 1) 회장 역할의 부여/회수는 회장만 (총무 권한 상승 차단)
-- 2) UPDATE 정책에 with check 추가 (크로스-테넌트 이동 차단)
-- 3) 마지막 회장 보호 트리거
-- 4) INSERT 시 created_by = auth.uid() 강제

-- ── 1) club_members: 회장 역할 보호 ───────────────────────────
-- 총무(can_manage_club)는 회원 관리 가능하지만,
--   - 현재 president인 row는 수정/삭제 불가 (회장만)
--   - 어떤 row든 president로 승격 불가 (회장만)
drop policy "member manage" on club_members;
create policy "member manage" on club_members for update to authenticated
  using (
    can_manage_club(club_id)
    and (role <> 'president' or is_club_owner(club_id))   -- 대상(기존) row 기준
  )
  with check (
    can_manage_club(club_id)
    and (role <> 'president' or is_club_owner(club_id))   -- 변경 후 row 기준
  );

drop policy "member remove" on club_members;
create policy "member remove" on club_members for delete to authenticated
  using (
    user_id = auth.uid()                                  -- 본인 탈퇴
    or (can_manage_club(club_id)
        and (role <> 'president' or is_club_owner(club_id)))  -- 회장 강퇴는 회장만
  );

-- ── 2) UPDATE 정책 with check 보강 ────────────────────────────
-- posts: 수정 후에도 본인 소속 클럽 안에 머물러야 함 (club_id 바꿔치기 차단)
drop policy "post own" on posts;
create policy "post own" on posts for update to authenticated
  using (author_id = auth.uid() or can_manage_club(club_id))
  with check (
    (author_id = auth.uid() and is_club_member(club_id))
    or can_manage_club(club_id)
  );

-- clubs: 수정 후에도 회장이어야 함
drop policy "club update" on clubs;
create policy "club update" on clubs for update to authenticated
  using (is_club_owner(id)) with check (is_club_owner(id));

-- ── 3) 마지막 회장 보호 트리거 ────────────────────────────────
-- active president가 삭제/강등/비활성화되어 클럽에 회장이 0명이 되는 것을 차단
create or replace function public.protect_last_president()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  remaining int;
begin
  if OLD.role = 'president' and OLD.status = 'active' then
    if TG_OP = 'DELETE'
       or NEW.role <> 'president'
       or NEW.status <> 'active' then
      select count(*) into remaining
      from club_members
      where club_id = OLD.club_id
        and role = 'president' and status = 'active'
        and id <> OLD.id;
      if remaining = 0 then
        raise exception '클럽에 최소 1명의 회장이 있어야 합니다';
      end if;
    end if;
  end if;
  if TG_OP = 'DELETE' then return OLD; else return NEW; end if;
end;
$$;

create trigger trg_protect_last_president
  before update or delete on club_members
  for each row execute function public.protect_last_president();

-- ── 4) INSERT 시 created_by = auth.uid() 강제 ─────────────────
-- matches: for all → insert/update/delete 분리 (created_by는 insert에만 강제)
drop policy "match write" on matches;
create policy "match insert" on matches for insert to authenticated
  with check (can_manage_match(club_id) and created_by = auth.uid());
create policy "match modify" on matches for update to authenticated
  using (can_manage_match(club_id)) with check (can_manage_match(club_id));
create policy "match delete" on matches for delete to authenticated
  using (can_manage_match(club_id));

-- payments: for all → 분리. 운영진 전체 조회(pay admin read)는 유지
drop policy "pay admin" on payments;
create policy "pay admin read" on payments for select to authenticated
  using (can_manage_club(club_id));
create policy "pay insert" on payments for insert to authenticated
  with check (can_manage_club(club_id) and created_by = auth.uid());
create policy "pay modify" on payments for update to authenticated
  using (can_manage_club(club_id)) with check (can_manage_club(club_id));
create policy "pay delete" on payments for delete to authenticated
  using (can_manage_club(club_id));
