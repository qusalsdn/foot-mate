-- 자체전 팀 편성: match_teams
-- 참석 확정자를 1~4팀으로 수동 배정(청백전 등). 미배정 회원은 행 없음.
-- match_results/match_stats 와 동일한 RLS 패턴: 조회는 클럽 회원 전체, 쓰기는 운영진.
-- 팀 개수는 별도 컬럼 없이 배정된 team 번호에서 프론트가 파생(기본 2, 최대 4).

create table match_teams (
  match_id uuid     not null references matches(id) on delete cascade,
  user_id  uuid     not null references profiles(id) on delete cascade,
  team     smallint not null check (team between 1 and 4),
  primary key (match_id, user_id)
);
create index on match_teams (match_id);

alter table match_teams enable row level security;

-- 조회: 같은 클럽 회원(게스트 포함) 전체
create policy "team read" on match_teams for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));

-- 쓰기(배정/변경/삭제): 매치 관리 권한(회장·총무·감독·코치)
create policy "team write" on match_teams for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));
