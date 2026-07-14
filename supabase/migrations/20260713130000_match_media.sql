-- 매치 사진·영상 배선: matches.images(경로 배열) + matches.videos(라벨 붙은 외부 링크 목록) + match-images 버킷.
--
-- 게시글 사진(posts.images)과 같은 모델: 별도 정션 테이블 없이 컬럼에 담는다.
--   - FK 2개짜리 정션 추가로 인한 PostgREST 임베드 모호성(댓글이 조용히 사라졌던 그 함정)을 원천 회피.
--   - 사진: text[] 에 '경로'만 저장, 공개 URL 은 렌더 시 NEXT_PUBLIC_SUPABASE_URL 로 조립(matchImageUrl).
-- 영상은 자체 저장(스토리지/대역폭 비용) 대신 유튜브 등 외부 링크만 저장 — 상세에서 임베드.
--   - 팀마다 "풀 영상 1개"·"쿼터별 여러 개" 방식이 달라, 단일 컬럼 대신 { label, url } 배열(jsonb)로 담는다.
--     예: [{"label":"전체 경기","url":"..."}] 또는 [{"label":"1쿼터","url":"..."}, {"label":"2쿼터","url":"..."}].
-- 쓰기 권한은 기존 matches RLS(UPDATE = can_manage_match)가 그대로 지배 → 운영진만 사진/영상 관리.
-- 조회는 matches SELECT(is_club_member, 게스트 포함)가 지배 → 활성 회원 전원 열람.

alter table matches add column if not exists images text[] not null default '{}';
alter table matches add column if not exists videos jsonb not null default '[]';

-- ── match-images 버킷 ────────────────────────────────────────
-- 공개 읽기 + 본인 uid 폴더에만 쓰기. avatars·post-images 버킷과 동일 규칙.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'match-images',
  'match-images',
  true,
  5 * 1024 * 1024,                         -- 5MB 제한
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- storage.objects 는 기본 RLS가 켜져 있으므로 policy만 추가한다.

-- 읽기: match-images 버킷 전체 공개
create policy "match image public read"
  on storage.objects for select
  using (bucket_id = 'match-images');

-- 업로드: 본인 uid 폴더에만 (업로드 경로 첫 세그먼트 = auth.uid())
create policy "match image self insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'match-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 교체: 본인 폴더 내에서만
create policy "match image self update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'match-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'match-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 폴더 내에서만 (매치 미디어 갱신/삭제 시 앱이 best-effort 로 정리)
create policy "match image self delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'match-images'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
