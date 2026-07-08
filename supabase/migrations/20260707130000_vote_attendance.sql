-- 참석 투표 RPC: 정원 초과 시 대기자 자동 배정 + 취소 시 대기 1번 자동 승격
--
-- 왜 RPC(security definer)인가:
--   match_attendances 의 "attend self" 정책은 본인 행(user_id = auth.uid())만 수정 가능하다.
--   대기자 승격은 "남의 행"의 is_waitlist 를 바꿔야 하므로 일반 회원 권한으론 불가능.
--   security definer 로 RLS 를 우회하되, 함수 안에서 소속(is_club_member)·상태를 직접 검증한다.
--   또한 upsert + 대기열 재정렬을 한 트랜잭션(단일 함수 호출)으로 묶어 동시성 안전성을 높인다.

create or replace function public.vote_attendance(_match_id uuid, _status attend_status)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id   uuid;
  _m_status  match_status;
  _cap       int;
begin
  select club_id, status, capacity
    into _club_id, _m_status, _cap
    from matches where id = _match_id;

  if _club_id is null then
    raise exception '매치를 찾을 수 없습니다';
  end if;
  -- 소속 회원(게스트 포함)만 투표 가능
  if not is_club_member(_club_id) then
    raise exception '이 클럽의 회원만 참석 투표를 할 수 있습니다';
  end if;
  -- 모집중일 때만 투표/변경 가능 (마감·종료·취소 시 잠금)
  if _m_status <> 'scheduled' then
    raise exception '참석 투표가 마감되었습니다';
  end if;

  -- 내 응답 upsert. 상태가 실제로 바뀔 때만 responded_at 갱신 → 대기열 순번(선착순) 유지
  insert into match_attendances (match_id, user_id, status, is_waitlist, responded_at)
    values (_match_id, auth.uid(), _status, false, now())
  on conflict (match_id, user_id) do update
    set status       = excluded.status,
        responded_at = case
                         when match_attendances.status is distinct from excluded.status
                         then now() else match_attendances.responded_at
                       end;

  -- 대기열 재정렬: 참석(attending) 중 responded_at 선착순 상위 _cap 명만 확정, 나머지는 대기
  if _cap is null then
    -- 정원 무제한 → 전원 확정
    update match_attendances
      set is_waitlist = false
      where match_id = _match_id and status = 'attending' and is_waitlist;
  else
    with ranked as (
      select id, row_number() over (order by responded_at, id) as rn
        from match_attendances
        where match_id = _match_id and status = 'attending'
    )
    update match_attendances a
      set is_waitlist = (r.rn > _cap)
      from ranked r
      where a.id = r.id
        and a.is_waitlist is distinct from (r.rn > _cap);
  end if;
end;
$$;

-- authenticated 롤에 실행 권한 (security definer 라 내부 로직은 소유자 권한으로 실행)
grant execute on function public.vote_attendance(uuid, attend_status) to authenticated;
