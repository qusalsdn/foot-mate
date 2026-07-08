-- 투표 마감 시각: 경기 전 특정 시각에 참석 투표를 자동으로 닫는다.
-- null 이면 자동 마감 없음(수동 '모집 마감'만) — 기존 매치는 그대로 동작.

alter table matches add column if not exists vote_deadline timestamptz;

-- vote_attendance RPC 재정의: 수동 마감(status)에 더해 마감 시각도 검증한다.
-- (기존 동작 + `now() > vote_deadline` 차단 한 줄 추가)
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
  _deadline  timestamptz;
  _kickoff   timestamptz;
begin
  select club_id, status, capacity, vote_deadline, match_date
    into _club_id, _m_status, _cap, _deadline, _kickoff
    from matches where id = _match_id;

  if _club_id is null then
    raise exception '매치를 찾을 수 없습니다';
  end if;
  if not is_club_member(_club_id) then
    raise exception '이 클럽의 회원만 참석 투표를 할 수 있습니다';
  end if;
  -- 수동 마감(모집중 아님) / 마감 시각 경과 / 킥오프 경과 시 잠금
  if _m_status <> 'scheduled' then
    raise exception '참석 투표가 마감되었습니다';
  end if;
  if _deadline is not null and now() > _deadline then
    raise exception '참석 투표가 마감되었습니다';
  end if;
  if now() >= _kickoff then
    raise exception '경기가 시작되어 참석 투표가 마감되었습니다';
  end if;

  insert into match_attendances (match_id, user_id, status, is_waitlist, responded_at)
    values (_match_id, auth.uid(), _status, false, now())
  on conflict (match_id, user_id) do update
    set status       = excluded.status,
        responded_at = case
                         when match_attendances.status is distinct from excluded.status
                         then now() else match_attendances.responded_at
                       end;

  if _cap is null then
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
