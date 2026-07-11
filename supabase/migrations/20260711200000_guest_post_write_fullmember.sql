-- 게스트 커뮤니티 권한 축소: 글 작성은 정회원만(게스트 제외)으로 좁힌다.
-- 조회(post read)·댓글(comment read/write)은 그대로 게스트 포함(is_club_member) — 게스트는
-- 커뮤니티를 읽고 댓글은 달 수 있으나 글은 못 쓴다.
--
-- 기존 정책은 20260706120400_rls.sql 에서 is_club_member 로 정의됐다(이미 원격 적용). 그 파일을
-- 수정하는 대신 여기서 drop & recreate 한다. notice 분기는 그대로(운영진만) — 운영진은 정회원이라
-- is_full_member 를 이미 만족한다.

drop policy if exists "post write" on posts;
create policy "post write" on posts for insert to authenticated with check (
  is_full_member(club_id) and author_id = auth.uid()
  and (category <> 'notice' or can_manage_club(club_id) or can_manage_match(club_id))
);
