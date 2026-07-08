-- 가입 신청 승인 화면에서 신청자 실명/사진을 보이게 한다.
-- 기존 "profile read" 는 shares_club_with(양쪽 active) 만 허용 → pending 신청자는
-- 아직 active 가 아니라 운영진이 프로필을 못 읽고 "축구인" 으로만 표시됐다.
-- 그 클럽 운영진(can_manage_club)이면 자기 클럽 pending 신청자의 프로필도 조회 허용.
--
-- 안전: club_members 서브쿼리는 그 테이블 자체 RLS(member read)를 그대로 적용받고,
--       can_manage_club 은 security definer 라 profiles 정책과 재귀하지 않는다.

drop policy "profile read" on profiles;
create policy "profile read" on profiles for select to authenticated
  using (
    id = auth.uid()
    or shares_club_with(id)
    or exists (
      select 1 from club_members cm
      where cm.user_id = profiles.id
        and cm.status = 'pending'
        and can_manage_club(cm.club_id)
    )
  );
