-- 매치 도메인: matches / match_attendances / match_results / match_stats

create table matches (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references clubs(id) on delete cascade,
  title         text not null,
  match_date    timestamptz not null,
  location_name text,
  location_lat  double precision,
  location_lng  double precision,
  opponent      text,           -- 자체전이면 null
  type          match_type   not null default 'internal',
  capacity      int,            -- 정원 (초과 시 대기)
  fee           int not null default 0,
  status        match_status not null default 'scheduled',
  created_by    uuid not null references profiles(id),
  created_at    timestamptz not null default now()
);
create index on matches (club_id, match_date desc);

create table match_attendances (
  id           uuid primary key default gen_random_uuid(),
  match_id     uuid not null references matches(id) on delete cascade,
  user_id      uuid not null references profiles(id) on delete cascade,
  status       attend_status not null,
  is_waitlist  boolean not null default false,
  responded_at timestamptz not null default now(),
  unique (match_id, user_id)
);

create table match_results (
  match_id       uuid primary key references matches(id) on delete cascade,
  our_score      int not null default 0,
  opponent_score int not null default 0,
  note           text
);

create table match_stats (
  id       uuid primary key default gen_random_uuid(),
  match_id uuid not null references matches(id) on delete cascade,
  user_id  uuid not null references profiles(id) on delete cascade,
  goals    int not null default 0,
  assists  int not null default 0,
  unique (match_id, user_id)
);
create index on match_stats (user_id);
