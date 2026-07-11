-- 자체전 팀별 점수: match_team_scores
-- match_results 는 "우리:상대" 2면 스코어라 3~4팀 자체전을 담을 수 없다.
-- 자체전은 팀마다 점수 1개를 기록(라운드로빈 합산 등) → 2·3·4팀을 균일하게 처리.
-- (자체전의 note·결과 존재 여부는 match_results 행을 재사용, our/opponent 는 0 고정)
-- RLS 는 match_teams 와 동일: 조회=클럽 회원, 쓰기=매치 관리 권한.

create table match_team_scores (
  match_id uuid     not null references matches(id) on delete cascade,
  team     smallint not null check (team between 1 and 4),
  score    int      not null default 0 check (score >= 0),
  primary key (match_id, team)
);

alter table match_team_scores enable row level security;

create policy "team score read" on match_team_scores for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));

create policy "team score write" on match_team_scores for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));
