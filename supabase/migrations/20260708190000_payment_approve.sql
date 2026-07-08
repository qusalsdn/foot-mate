-- 납부 확정(운영진) → 회원에게 '납부 확인' 알림 (요청 흐름의 대칭).
--
-- 지금까지 납부 상태 변경은 클라이언트의 직접 update + "pay admin" 정책으로 처리했다.
-- 하지만 회원에게 알림을 남기려면 '남의 user_id' 로 notifications 를 insert 해야 하고,
-- 이는 "noti own" 정책상 클라이언트로는 불가능하다. 그래서 상태 변경을 security definer
-- RPC 로 옮기고(권한은 함수 안에서 can_manage_club 로 직접 검증), 확정 시 회원에게 알린다.

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
  -- 권한: 회장·총무만 (security definer 라 RLS 를 우회하므로 여기서 직접 검증)
  if not can_manage_club(_club_id) then
    raise exception '권한이 없습니다';
  end if;

  update payments
     set status       = case when _paid then 'paid' else 'unpaid' end,
         paid_at      = case when _paid then now() else null end,
         requested_at = null   -- 확정/되돌리면 회원의 요청 표시는 소진
   where id = _payment_id;

  -- 납부로 확정할 때만 해당 회원에게 알림 (본인이 스스로 확정하면 notify_users 가 걸러냄)
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

grant execute on function public.set_payment_status(uuid, boolean) to authenticated;
