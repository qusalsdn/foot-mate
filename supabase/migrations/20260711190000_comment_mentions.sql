-- 댓글 사용자 멘션(@언급). 댓글 본문의 `@이름` 토큰이 가리키는 실제 사용자를 id로 기록한다.
-- (이름은 카카오 닉네임이라 유일하지 않아 텍스트 매칭만으로는 대상을 특정할 수 없다 → id 저장.)

create table comment_mentions (
  comment_id uuid not null references comments(id) on delete cascade,
  user_id    uuid not null references profiles(id) on delete cascade,
  primary key (comment_id, user_id)
);
create index on comment_mentions (user_id);

alter table comment_mentions enable row level security;

-- 조회: 댓글이 속한 글의 클럽 소속 회원(게스트 포함). 멘션된 이름은 이미 댓글 본문에 노출되므로
--       본문을 볼 수 있는 회원이 멘션 행을 보는 것도 동일 수준이다.
create policy "cm read" on comment_mentions for select to authenticated
  using (
    is_club_member((
      select p.club_id
        from comments c
        join posts p on p.id = c.post_id
       where c.id = comment_id
    ))
  );

-- 쓰기: 그 댓글의 작성자 본인만, 그리고 멘션 대상이 같은 클럽의 활성 회원일 때만.
--       (외부인·비활성 회원을 멘션해 알림을 심는 것을 DB에서 차단한다.)
create policy "cm write" on comment_mentions for insert to authenticated
  with check (
    exists (
      select 1 from comments c
       where c.id = comment_id and c.author_id = auth.uid()
    )
    and exists (
      select 1
        from comments c
        join posts p on p.id = c.post_id
        join club_members m on m.club_id = p.club_id
       where c.id = comment_id
         and m.user_id = comment_mentions.user_id
         and m.status = 'active'
    )
  );

-- 삭제 정책은 두지 않는다 — 댓글 삭제 시 on delete cascade 로 함께 지워진다.

-- ── 멘션 → 대상에게 알림 ──────────────────────────────────────
-- match/post 알림과 동일한 패턴(security definer + notify_users). notify_users 가 내부적으로
-- auth.uid() 수신자를 제외하므로 본인 자신을 멘션해도 알림은 생기지 않는다.
-- 글 작성자는 이미 comment_added 알림을 받으므로, 그 사람을 멘션했을 땐 중복 알림을 피한다.
create or replace function public.on_comment_mention()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _post_id uuid;
  _author  uuid;
  _title   text;
begin
  select p.club_id, p.id, p.author_id, p.title
    into _club_id, _post_id, _author, _title
    from comments c
    join posts p on p.id = c.post_id
   where c.id = new.comment_id;

  -- 글 작성자는 comment_added 로 이미 알림 받음 → 멘션 중복 알림 생략
  if new.user_id = _author then
    return new;
  end if;

  begin
    perform notify_users(
      array[new.user_id],
      _club_id,
      'comment_mention',
      '댓글에서 나를 언급했어요',
      _title,
      '/clubs/' || _club_id || '/community/' || _post_id
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger comment_mention_notify
  after insert on comment_mentions
  for each row execute function public.on_comment_mention();
