-- 쿼터별 팀 점수: match_quarter_scores
-- 팀 경기(자체전/친선)에서 쿼터별로 점수를 나눠 기록. 최종 팀 점수(match_team_scores)는
-- 쿼터 합계로 저장하므로 순위·읽기는 기존대로 match_team_scores 를 쓰고, 이 테이블은 쿼터 상세.
-- 쿼터 기록을 안 쓰면 이 테이블은 비어 있다(단일 점수만 match_team_scores).
-- RLS 는 다른 매치 하위 테이블과 동일: 조회=클럽 회원, 쓰기=매치 관리 권한.

create table match_quarter_scores (
  match_id uuid     not null references matches(id) on delete cascade,
  quarter  smallint not null check (quarter between 1 and 8),
  team     smallint not null check (team between 1 and 4),
  score    int      not null default 0 check (score >= 0),
  primary key (match_id, quarter, team)
);
create index on match_quarter_scores (match_id);

alter table match_quarter_scores enable row level security;

create policy "quarter score read" on match_quarter_scores for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));

create policy "quarter score write" on match_quarter_scores for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));
