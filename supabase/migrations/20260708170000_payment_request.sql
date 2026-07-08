-- 회원 '납부 완료 요청' → 운영진 승인 흐름.
--
-- payments.status(unpaid/paid) 확정은 운영진(can_manage_club)만 한다("pay admin" 정책).
-- 회원은 본인 미납 항목에 "입금했어요" 표시(requested_at)만 남길 수 있고,
-- 실제 납부 확정(status=paid)은 운영진이 입금을 확인한 뒤 처리한다.
--
-- 왜 RPC(security definer)인가:
--   payments 의 "pay self" 정책은 SELECT 전용이라 회원에겐 UPDATE 권한이 없다.
--   요청 표시는 본인 행의 requested_at 만 건드리므로, security definer 로 RLS 를 우회하되
--   함수 안에서 본인 소유(user_id = auth.uid())·미납(status='unpaid') 조건을 직접 강제한다.

alter table payments add column if not exists requested_at timestamptz;

-- 회원: 본인 미납 항목에 납부 완료 요청
create or replace function public.request_payment(_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
     set requested_at = now()
   where id = _payment_id
     and user_id = auth.uid()
     and status = 'unpaid';
  if not found then
    raise exception '납부 완료 요청을 할 수 없습니다';
  end if;
end;
$$;

-- 회원: 납부 완료 요청 취소
create or replace function public.withdraw_payment_request(_payment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update payments
     set requested_at = null
   where id = _payment_id
     and user_id = auth.uid()
     and status = 'unpaid';
  if not found then
    raise exception '요청을 취소할 수 없습니다';
  end if;
end;
$$;

-- authenticated 롤에 실행 권한 (security definer 라 내부 로직은 소유자 권한으로 실행)
grant execute on function public.request_payment(uuid) to authenticated;
grant execute on function public.withdraw_payment_request(uuid) to authenticated;
