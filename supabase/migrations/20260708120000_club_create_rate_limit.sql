-- 클럽 생성 스팸 방지: 사용자당 rolling 24시간 제한 + 연속 생성 쿨다운
--
-- 클라이언트/서버 액션 체크는 secret 키·직접 API 호출로 우회 가능하므로
-- DB 트리거(security definer)에서 강제한다. clubs INSERT 정책이 이미
-- created_by = auth.uid() 를 강제하므로 new.created_by = 실제 사용자다.
-- (service_role 삽입도 이 트리거는 통과하지 못한다 = 심층 방어)

create or replace function public.enforce_club_create_rate_limit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  recent_count int;
  last_created timestamptz;
  daily_limit  constant int      := 3;             -- rolling 24h 사용자당 최대 생성 수
  cooldown     constant interval := interval '60 seconds';  -- 연속 생성 최소 간격
begin
  select count(*), max(created_at)
    into recent_count, last_created
  from clubs
  where created_by = new.created_by
    and created_at > now() - interval '24 hours';

  if recent_count >= daily_limit then
    raise exception 'club_create_rate_limit'
      using hint = '24시간 내 만들 수 있는 클럽 수를 초과했습니다. 잠시 후 다시 시도해 주세요.';
  end if;

  if last_created is not null and last_created > now() - cooldown then
    raise exception 'club_create_cooldown'
      using hint = '너무 빠르게 연속으로 생성했습니다. 잠시 후 다시 시도해 주세요.';
  end if;

  return new;
end;
$$;

drop trigger if exists club_create_rate_limit on clubs;
create trigger club_create_rate_limit
  before insert on clubs
  for each row execute function public.enforce_club_create_rate_limit();
