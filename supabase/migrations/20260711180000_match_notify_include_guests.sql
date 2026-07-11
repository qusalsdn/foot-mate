-- 매치 생성 알림에 게스트 포함 (on_match_created 재정의).
--
-- 기존 20260708220000_match_created_notify.sql 는 게스트를 제외했으나(role <> 'guest'),
-- 게스트도 초대된 매치를 조회·참석 투표하므로 매치 생성 알림을 받는 편이 자연스럽다.
-- 트리거(match_created_notify)는 그대로 두고 함수 본문만 교체한다 —
-- 이미 원격 적용된 마이그레이션 파일을 수정하는 대신 새 마이그레이션으로 재정의한다.
-- (커뮤니티 공지 알림 on_post_created 는 20260711170000 에서 게스트 포함으로 정의됨.)

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
        -- 게스트 포함 — 활성 회원 전원
        select user_id from club_members
         where club_id = new.club_id and status = 'active'
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
