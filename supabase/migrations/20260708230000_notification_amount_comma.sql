-- 알림 본문 금액에 천 단위 콤마 적용 ("30000원" → "30,000원").
-- 알림은 SQL RPC 에서 본문을 만들므로(앱의 formatWon 과 무관), to_char 로 포맷한다.
-- to_char(n, 'FM999,999,999') → 앞 공백/0 제거 + 천 단위 콤마 (최대 9자리, amount 상한 1천만 커버).
-- 이미 적용된 함수들을 create or replace 로 교체(본문 금액 표기만 변경).

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
    coalesce(_period || ' 월회비 · ', '')
      || to_char(_amount, 'FM999,999,999') || '원',
    '/clubs/' || _club_id || '/finance'
  );
end;
$$;

create or replace function public.set_payment_status(_payment_id uuid, _paid boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _user_id uuid;
  _period  text;
  _amount  int;
begin
  select club_id, user_id, period, amount
    into _club_id, _user_id, _period, _amount
    from payments where id = _payment_id;
  if _club_id is null then
    raise exception '항목을 찾을 수 없습니다';
  end if;
  if not can_manage_club(_club_id) then
    raise exception '권한이 없습니다';
  end if;

  update payments
     set status       = (case when _paid then 'paid' else 'unpaid' end)::payment_status,
         paid_at      = case when _paid then now() else null end,
         requested_at = null
   where id = _payment_id;

  if _paid then
    perform notify_users(
      array[_user_id],
      _club_id,
      'payment_paid',
      '회비 납부가 확인됐어요',
      coalesce(_period || ' 월회비 · ', '')
        || to_char(_amount, 'FM999,999,999') || '원',
      '/clubs/' || _club_id || '/finance'
    );
  end if;
end;
$$;
