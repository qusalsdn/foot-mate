-- 인앱 알림 도메인 (1단계). Web Push(2단계)는 이 notifications 행을 '배송'만 하므로,
-- 여기서 세운 '알림 생성'이 진실의 원천이 된다.
--
-- notifications 의 "noti own" 정책은 본인 것(user_id = auth.uid())만 insert 가능하다.
-- 따라서 '남에게' 알림을 보내려면 RLS 를 우회하는 security definer 함수가 필요하다.
-- notify_users 가 그 통로 — 단, authenticated 에 직접 노출하면 아무 유저에게나
-- 임의 알림을 심는 스팸 벡터가 되므로 실행 권한을 회수하고(내부 전용),
-- 다른 security definer 함수(request_payment 등)에서만 호출한다.

create or replace function public.notify_users(
  _user_ids uuid[],
  _club_id  uuid,
  _type     text,
  _title    text,
  _body     text,
  _link     text
) returns void
language sql
security definer
set search_path = public
as $$
  insert into notifications (user_id, club_id, type, title, body, link)
  select uid, _club_id, _type, _title, _body, _link
  from unnest(_user_ids) as uid
  where uid <> auth.uid();   -- 본인 행동으로 본인에게 알림은 보내지 않는다
$$;

-- 내부 전용: 아무에게도 직접 실행 권한을 주지 않는다(소유자=정의자 권한으로만 호출됨)
revoke all on function public.notify_users(uuid[], uuid, text, text, text, text)
  from public;

-- request_payment 재정의: 요청을 남긴 뒤 클럽 운영진(회장·총무)에게 알림을 fan-out 한다.
-- (기본 동작은 20260708170000 에서 정의, 여기서 알림 부수효과를 추가 — 알림 도메인의 첫 소비자)
create or replace function public.request_payment(_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _period  text;
  _amount  int;
  _name    text;
begin
  update payments
     set requested_at = now()
   where id = _payment_id
     and user_id = auth.uid()
     and status = 'unpaid'
   returning club_id, period, amount into _club_id, _period, _amount;
  if not found then
    raise exception '납부 완료 요청을 할 수 없습니다';
  end if;

  select name into _name from profiles where id = auth.uid();

  perform notify_users(
    array(
      select user_id from club_members
       where club_id = _club_id and status = 'active'
         and role in ('president', 'treasurer')
    ),
    _club_id,
    'payment_request',
    coalesce(_name, '회원') || ' 님이 납부 완료를 요청했어요',
    coalesce(_period || ' 월회비 · ', '') || _amount || '원',
    '/clubs/' || _club_id || '/finance'
  );
end;
$$;
