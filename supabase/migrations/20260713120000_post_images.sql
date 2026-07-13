-- 게시글 이미지 첨부 배선: posts.images 컬럼 + post-images 스토리지 버킷.
--
-- 사진은 별도 '갤러리 게시판'이 아니라 **어떤 글에나 붙는 선택 첨부**다(공지·자유 공통, 0장 허용).
-- 데이터 모델: 별도 post_images 정션 테이블 대신 posts 에 text[] 컬럼을 둔다.
--   - 이미지 경로는 게시글에 종속(별도 RLS 불필요 — posts RLS 가 조회/쓰기를 그대로 지배).
--   - FK 2개짜리 정션 테이블 추가로 인한 PostgREST 임베드 모호성(댓글 목록이 조용히 사라졌던 그 함정)을
--     원천 회피한다. 순서는 배열 순서, 다중 이미지는 배열로 표현.
--   - 저장값은 버킷 내 '경로'(예: "{uid}/169..-ab.jpg"). 공개 URL 은 렌더 시 NEXT_PUBLIC_SUPABASE_URL 로 조립.
-- 목록의 "사진" 필터는 images <> '{}' 로 이미지 보유 글만 모아본다(post_category enum 의 gallery 값은
-- 미사용으로 남겨둔다 — Postgres enum 값 삭제는 고통스럽고 안 쓰면 무해).

alter table posts add column if not exists images text[] not null default '{}';

-- ── post-images 버킷 ─────────────────────────────────────────
-- 공개 읽기(같은 클럽 회원이 조회) + 본인 uid 폴더에만 쓰기. avatars 버킷과 동일 규칙.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'post-images',
  'post-images',
  true,
  5 * 1024 * 1024,                         -- 5MB 제한 (사진은 아바타보다 여유)
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- storage.objects 는 기본 RLS가 켜져 있으므로 policy만 추가한다.

-- 읽기: post-images 버킷 전체 공개
create policy "post image public read"
  on storage.objects for select
  using (bucket_id = 'post-images');

-- 업로드: 본인 uid 폴더에만 (업로드 경로 첫 세그먼트 = auth.uid())
create policy "post image self insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 교체: 본인 폴더 내에서만
create policy "post image self update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 폴더 내에서만 (게시글 삭제 시 앱이 best-effort 로 정리)
create policy "post image self delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'post-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
