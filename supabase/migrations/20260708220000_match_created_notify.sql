-- 매치 신규 등록 → 클럽 회원 전원에게 알림.
--
-- 매치 생성 경로가 여럿일 수 있어(서버 액션 등) 누락 없이 잡으려면 트리거가 안전하다.
-- 이 프로젝트가 이미 트리거로 부수효과를 처리하는 패턴(handle_new_user, 회장 등록 등)과 일관.
--
-- security definer 이유: 트리거는 매치를 만든 사용자(운영진) 권한으로 도는데,
-- '남의 user_id' 로 notifications insert 는 "noti own" 정책에 막힌다. definer 로 RLS 를
-- 우회하는 notify_users 를 호출하되(그 함수 execute 권한도 회수돼 있어 definer 안에서만 호출됨),
-- 대상·본문은 트리거가 정한다. 게스트는 매치 초대 대상만 보므로 제외(회원·운영진에게만).

create or replace function public.on_match_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 알림 실패가 매치 생성 자체를 롤백시키지 않도록 방어한다(부수효과일 뿐)
  begin
    perform notify_users(
      array(
        select user_id from club_members
         where club_id = new.club_id and status = 'active' and role <> 'guest'
      ),
      new.club_id,
      'match_created',
      '새 매치가 등록됐어요',
      new.title || ' · '
        || to_char(new.match_date at time zone 'Asia/Seoul', 'FMMM월 FMDD일 HH24:MI'),
      '/clubs/' || new.club_id || '/matches/' || new.id
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger match_created_notify
  after insert on matches
  for each row execute function public.on_match_created();
