-- 커뮤니티 알림: 공지 글 등록 → 회원 전원 / 새 댓글 → 글 작성자.
--
-- match_created_notify 와 동일한 패턴(트리거 + security definer + notify_users).
-- security definer 이유: 트리거는 글/댓글을 쓴 사용자 권한으로 도는데, '남의 user_id' 로
-- notifications insert 는 "noti own" 정책에 막힌다. definer 로 RLS 를 우회하는 notify_users 를
-- 호출하되(그 함수 execute 권한도 회수돼 있어 definer 안에서만 호출됨), 대상·본문은 트리거가 정한다.
-- notify_users 는 내부적으로 auth.uid() 수신자를 제외하므로 본인 행동 → 본인 알림은 생기지 않는다.

-- ── 공지 글 등록 → 클럽 회원 전원(게스트 포함) ─────────────────
create or replace function public.on_post_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- 공지(notice)만 전체 알림. 자유·갤러리는 스팸 방지 위해 알림하지 않는다.
  if new.category = 'notice' then
    -- 알림 실패가 글 작성 자체를 롤백시키지 않도록 방어한다(부수효과일 뿐)
    begin
      perform notify_users(
        array(
          -- 게스트도 커뮤니티를 조회할 수 있어(RLS is_club_member) 공지 알림 대상에 포함한다
          select user_id from club_members
           where club_id = new.club_id and status = 'active'
        ),
        new.club_id,
        'post_notice',
        '새 공지가 등록됐어요',
        new.title,
        '/clubs/' || new.club_id || '/community/' || new.id
      );
    exception when others then
      null;
    end;
  end if;
  return new;
end;
$$;

create trigger post_created_notify
  after insert on posts
  for each row execute function public.on_post_created();

-- ── 새 댓글 → 글 작성자에게 알림 ──────────────────────────────
create or replace function public.on_comment_created()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  _club_id uuid;
  _author  uuid;
  _title   text;
begin
  select club_id, author_id, title
    into _club_id, _author, _title
    from posts where id = new.post_id;

  begin
    -- 대상은 글 작성자 1명. 본인이 자기 글에 단 댓글이면 notify_users 가 알아서 제외한다.
    perform notify_users(
      array[_author],
      _club_id,
      'comment_added',
      '내 글에 댓글이 달렸어요',
      _title,
      '/clubs/' || _club_id || '/community/' || new.post_id
    );
  exception when others then
    null;
  end;
  return new;
end;
$$;

create trigger comment_created_notify
  after insert on comments
  for each row execute function public.on_comment_created();
