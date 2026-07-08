-- 버그 수정: set_payment_status(20260708190000)의 enum 캐스팅.
--
-- `case when _paid then 'paid' else 'unpaid' end` 는 문자열 리터럴이 모두 unknown 이라
-- 결과 타입이 text 로 확정된다. 그런데 payments.status 는 payment_status enum 이고
-- text→enum 자동(assignment) 캐스팅이 없어 호출 시점에 에러가 난다
-- ("column ... is of type payment_status but expression is of type text").
-- CASE 결과를 명시적으로 payment_status 로 캐스팅해 해결한다.
--
-- 이미 190000 이 적용됐어도 이 create or replace 로 함수 본문이 교체된다.

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
      coalesce(_period || ' 월회비 · ', '') || _amount || '원',
      '/clubs/' || _club_id || '/finance'
    );
  end if;
end;
$$;
