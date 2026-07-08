-- 알림 실시간(2단계 아님, B): notifications 테이블 변경을 Supabase Realtime 으로 브로드캐스트.
--
-- postgres_changes 구독은 구독자(브라우저=authenticated)의 RLS 를 그대로 적용하므로,
-- "noti own"(user_id = auth.uid()) 정책 덕에 각 사용자는 '본인 알림'의 변경만 수신한다.
-- 앱은 이 이벤트를 받아 router.refresh() 로 벨 뱃지·목록을 다시 그린다(payload 는 안 읽음).
--
-- REPLICA IDENTITY FULL: UPDATE/DELETE 이벤트에서도 user_id 필터가 정확히 매칭되도록
-- 이전 행 전체를 WAL 에 싣는다(알림 테이블은 소량이라 부담 없음).

alter table notifications replica identity full;

-- 기본 발행(supabase_realtime)에 테이블 추가 (이미 있으면 건너뜀 — 재적용 안전)
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table notifications;
  end if;
end $$;
