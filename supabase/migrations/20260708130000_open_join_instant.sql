-- 누구나 가입(open) 클럽: 신청 없이 즉시 active 회원으로 가입.
-- 기존 "member join" 정책은 status='pending' insert 만 허용했다(승인제 전제).
-- open 정책 클럽에 한해 본인을 role='member', status='active' 로 바로 넣는 것을 허용한다.
--
-- 안전장치:
--   - 승인제(approval) 클럽은 여전히 pending 만 허용 → 즉시 가입 차단
--   - active 즉시 가입은 role='member' 로 한정 (게스트/운영진 자가임명 차단)
--   - clubs 는 RLS "club read" 가 using(true) 라 서브쿼리로 join_policy 조회 가능
--   - president 자가임명은 기존과 동일하게 role 화이트리스트로 차단

drop policy "member join" on club_members;
create policy "member join" on club_members for insert to authenticated
  with check (
    user_id = auth.uid()
    and (
      -- 승인제/게스트: 승인 대기(pending) 로만
      (status = 'pending' and role in ('member', 'guest'))
      -- 누구나 가입(open): 즉시 정회원(active)
      or (
        status = 'active'
        and role = 'member'
        and (select join_policy from clubs c where c.id = club_id) = 'open'
      )
    )
  );
