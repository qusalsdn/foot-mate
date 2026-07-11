-- 쿼터별 개인 기록: match_quarter_stats
-- 팀 경기(자체전/친선)에서 참석자 골·도움을 쿼터별로 기록. match_stats 는 매치 합계를 유지
-- (리더보드·집계는 그대로), 이 테이블은 쿼터 상세. 쿼터 기록을 안 쓰면 비어 있다.
-- RLS 는 다른 매치 하위 테이블과 동일: 조회=클럽 회원, 쓰기=매치 관리 권한.

create table match_quarter_stats (
  match_id uuid     not null references matches(id) on delete cascade,
  user_id  uuid     not null references profiles(id) on delete cascade,
  quarter  smallint not null check (quarter between 1 and 8),
  goals    int      not null default 0 check (goals >= 0),
  assists  int      not null default 0 check (assists >= 0),
  primary key (match_id, user_id, quarter)
);
create index on match_quarter_stats (match_id);

alter table match_quarter_stats enable row level security;

create policy "quarter stat read" on match_quarter_stats for select to authenticated
  using (is_club_member((select club_id from matches m where m.id = match_id)));

create policy "quarter stat write" on match_quarter_stats for all to authenticated
  using (can_manage_match((select club_id from matches m where m.id = match_id)))
  with check (can_manage_match((select club_id from matches m where m.id = match_id)));
