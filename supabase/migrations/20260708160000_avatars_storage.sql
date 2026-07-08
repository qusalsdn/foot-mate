-- 프로필 사진 저장소: avatars 버킷.
-- 공개 읽기(프로필 사진은 같은 클럽 회원 등에게 노출) + 본인 폴더에만 쓰기.
-- 업로드 경로 규칙: "{auth.uid()}/{파일명}" → 첫 폴더 세그먼트가 본인 uid 여야 한다.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  2 * 1024 * 1024,                         -- 2MB 제한
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do nothing;

-- storage.objects 는 기본 RLS가 켜져 있으므로 policy만 추가한다.

-- 읽기: avatars 버킷 전체 공개
create policy "avatar public read"
  on storage.objects for select
  using (bucket_id = 'avatars');

-- 업로드: 본인 uid 폴더에만
create policy "avatar self insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 교체: 본인 폴더 내에서만 (upsert 대응)
create policy "avatar self update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- 삭제: 본인 폴더 내에서만
create policy "avatar self delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
