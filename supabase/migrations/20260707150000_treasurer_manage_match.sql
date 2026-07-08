-- 총무(treasurer)도 매치 관리 권한을 갖도록 can_manage_match 확장.
-- 기존: 회장·감독·코치 → 변경: 회장·총무·감독·코치.
-- 함수 본문의 in (...) 목록만 수정하면 이 함수를 쓰는 모든 정책(matches/results/stats)이 함께 반영된다.

create or replace function public.can_manage_match(_club_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from club_members
    where club_id = _club_id and user_id = auth.uid()
      and status = 'active'
      and role in ('president', 'treasurer', 'manager', 'coach'));
$$;
