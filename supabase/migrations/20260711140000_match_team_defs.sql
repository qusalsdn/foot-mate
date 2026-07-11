-- 매치 팀 정의: match_team_defs
-- 팀은 매치 생성/수정 시 이름과 함께 선언한다(예: 빨강팀·파랑팀). team 번호(1~4)가
-- match_teams(배정)·match_team_scores(점수)의 조인 키. 정의된 팀이 2개 이상이면 "팀 경기".
-- 자체전은 팀 필수, 친선전은 선택(팀 추가 시 팀 경기), 리그는 팀 없음(폼에서 강제).
-- RLS 는 다른 매치 하위 테이블과 동일: 조회=클럽 회원, 쓰기=매치 관리 권한.

create table match_team_defs (
  match_id uuid     not null references matches(id) on delete cascade,
  team     smallint not null check (team between 1 and 4),
  name     text     not null,
  primary key (match_id, team)
);

alter table match_team_defs enable row level security;

create policy "team def read" on match_team_defs for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));

create policy "team def write" on match_team_defs for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));
