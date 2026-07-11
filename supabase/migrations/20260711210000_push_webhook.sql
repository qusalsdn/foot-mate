-- Web Push 발송 배선을 대시보드 수동 Database Webhook 에서 SQL 마이그레이션으로 이관한다.
--
-- 배경: 지금까지 "notifications INSERT → POST /api/push/send" 연결이 Supabase 대시보드의
-- Database Webhook UI 에만 손으로 설정돼 있어(레포에 없음) 프로젝트 이전/재생성 시 조용히
-- 푸시만 죽는 함정이 있었다. 대시보드 웹훅은 내부적으로 pg_net 트리거일 뿐이므로 여기서
-- 직접 트리거로 못 박아 버전 관리로 끌어온다.
--
-- ⚠️ 적용 시 주의:
--   1) 이 마이그레이션 적용과 동시에 기존 대시보드 Database Webhook(notifications INSERT)을
--      반드시 비활성화할 것. 둘 다 살아있으면 푸시가 두 번 발송된다.
--   2) URL·시크릿은 git 에 커밋하지 않는다. Vault 에 환경별로 1회 주입한다(아래 참고).
--      Vault 미주입 상태(로컬 등)에서는 발송을 스킵하며 알림 생성 자체는 정상 동작한다.
--
-- Vault 주입(환경별 1회, 대시보드 SQL Editor 또는 psql 에서 실행 — 커밋 금지):
--   select vault.create_secret('https://<앱도메인>/api/push/send', 'push_webhook_url');
--   select vault.create_secret('<PUSH_WEBHOOK_SECRET 값>',        'push_webhook_secret');
--   -- 값 교체 시: select vault.update_secret((select id from vault.secrets where name='push_webhook_url'), '새 URL');

-- HTTP 요청용(비동기 큐) + 시크릿 보관
create extension if not exists pg_net;
create extension if not exists supabase_vault;

/**
 * notifications 새 행 → /api/push/send 로 POST(비동기).
 * security definer: vault.decrypted_secrets 조회 권한이 필요.
 * 방어: (1) Vault 미설정이면 no-op, (2) 어떤 예외도 삼켜 알림 INSERT 트랜잭션을 깨지 않는다
 *       (푸시는 best-effort — 인앱 알림이 진실의 원천).
 */
create or replace function public.notify_push_webhook()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _url    text;
  _secret text;
begin
  select decrypted_secret into _url
    from vault.decrypted_secrets where name = 'push_webhook_url';
  select decrypted_secret into _secret
    from vault.decrypted_secrets where name = 'push_webhook_secret';

  -- Vault 미주입(로컬/신규 환경) → 발송 스킵. 알림 생성은 계속 진행.
  if _url is null or _secret is null then
    return new;
  end if;

  perform net.http_post(
    url     := _url,
    headers := jsonb_build_object(
      'Content-Type',    'application/json',
      'x-webhook-secret', _secret
    ),
    body    := jsonb_build_object('record', to_jsonb(new))
  );
  return new;
exception
  when others then
    -- 발송 배선 실패가 알림 생성 트랜잭션을 롤백시키지 않도록 삼킨다.
    return new;
end;
$$;

-- 내부 전용 트리거 함수 — 직접 실행 권한 회수
revoke all on function public.notify_push_webhook() from public;

drop trigger if exists on_notification_push on public.notifications;
create trigger on_notification_push
  after insert on public.notifications
  for each row execute function public.notify_push_webhook();
