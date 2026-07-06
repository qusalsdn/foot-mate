-- 회비 · 커뮤니티 · 알림: payments / posts / comments / push_subscriptions / notifications

create table payments (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  type       payment_type   not null,
  match_id   uuid references matches(id) on delete set null,  -- match_fee일 때
  period     text,           -- 월회비: '2026-07'
  amount     int not null,
  status     payment_status not null default 'unpaid',
  paid_at    timestamptz,
  created_by uuid not null references profiles(id),
  created_at timestamptz not null default now()
);
create index on payments (club_id, status);
create index on payments (user_id);

create table posts (
  id         uuid primary key default gen_random_uuid(),
  club_id    uuid not null references clubs(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  category   post_category not null default 'free',
  title      text not null,
  content    text,
  created_at timestamptz not null default now()
);
create index on posts (club_id, created_at desc);

create table comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references posts(id) on delete cascade,
  author_id  uuid not null references profiles(id) on delete cascade,
  content    text not null,
  created_at timestamptz not null default now()
);
create index on comments (post_id);

create table push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  created_at timestamptz not null default now()
);

create table notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references profiles(id) on delete cascade,
  club_id    uuid references clubs(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text,
  link       text,
  read_at    timestamptz,
  created_at timestamptz not null default now()
);
create index on notifications (user_id, read_at);
