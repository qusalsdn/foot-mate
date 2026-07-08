-- 회장 이양 RPC. 새 회장 승격 → 기존 회장 강등을 한 트랜잭션에서 원자적으로 처리한다.
-- 순서가 핵심: 먼저 대상을 president 로 올려 클럽에 회장이 2명이 된 뒤 기존 회장을 강등해야
-- 마지막 회장 보호 트리거(protect_last_president)를 통과한다. 두 UPDATE 를 클라이언트에서
-- 나눠 하면 원자성이 깨져(중간 실패 시 회장 2명 잔존) 위험하므로 definer 함수로 묶는다.
--
-- 권한: security definer 로 RLS 를 우회하되, 함수 안에서 호출자가 active 회장인지 직접 검증한다.

create or replace function public.transfer_presidency(_club_id uuid, _to_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _caller uuid := auth.uid();
begin
  -- 호출자가 이 클럽의 active 회장이어야 한다
  if not exists (
    select 1 from club_members
    where club_id = _club_id and user_id = _caller
      and role = 'president' and status = 'active'
  ) then
    raise exception '회장만 회장직을 이양할 수 있습니다';
  end if;

  if _to_user = _caller then
    raise exception '본인에게는 이양할 수 없습니다';
  end if;

  -- 이양 대상은 이 클럽의 active 정회원(게스트 제외)이어야 한다
  if not exists (
    select 1 from club_members
    where club_id = _club_id and user_id = _to_user
      and status = 'active' and role <> 'guest'
  ) then
    raise exception '이양 대상은 이 클럽의 정회원이어야 합니다';
  end if;

  -- 1) 새 회장 승격 (먼저 → 회장 2명 → 마지막 회장 보호 통과)
  update club_members set role = 'president'
    where club_id = _club_id and user_id = _to_user;

  -- 2) 기존 회장(호출자) 강등
  update club_members set role = 'member'
    where club_id = _club_id and user_id = _caller;
end;
$$;

grant execute on function public.transfer_presidency(uuid, uuid) to authenticated;
