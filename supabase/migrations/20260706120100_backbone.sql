-- 신원 · 테넌트 백본: profiles / clubs / club_members
-- + auth.users 가입 시 profiles 자동 생성
-- + clubs 생성 시 생성자를 회장(president)으로 자동 등록

create table profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text not null,
  avatar_url text,
  phone      text,
  created_at timestamptz not null default now()
);

create table clubs (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  description text,
  logo_url    text,
  region      text,
  join_policy text not null default 'approval',   -- 'approval' | 'open'
  created_by  uuid not null references profiles(id),
  created_at  timestamptz not null default now()
);

create table club_members (
  id             uuid primary key default gen_random_uuid(),
  club_id        uuid not null references clubs(id) on delete cascade,
  user_id        uuid not null references profiles(id) on delete cascade,
  role           member_role   not null default 'member',
  status         member_status not null default 'pending',
  jersey_number  int,
  position       text,          -- 'FW' | 'MF' | 'DF' | 'GK'
  preferred_foot text,          -- 'L' | 'R' | 'B'
  joined_at      timestamptz not null default now(),
  unique (club_id, user_id)
);
create index on club_members (user_id);
create index on club_members (club_id, status);

-- 신규 auth 유저 → profiles 자동 생성
-- 카카오 OAuth 대응: 이메일이 없을 수 있고(선택 동의), 이름은 name/full_name/nickname 중 하나로 들어옴.
-- name이 null이면 not-null 위반으로 가입 전체가 롤백되므로 최종 fallback('축구인')까지 둔다.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, name, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data->>'name',
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'nickname',
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      '축구인'
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 클럽 생성 → 생성자를 회장(active)으로 자동 등록
create or replace function public.handle_new_club()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.club_members (club_id, user_id, role, status)
  values (new.id, new.created_by, 'president', 'active');
  return new;
end;
$$;

create trigger on_club_created
  after insert on clubs
  for each row execute function public.handle_new_club();
