-- 매치 영상: 단일 video_url(text) → videos(jsonb, {label,url} 배열)로 이관.
--
-- 팀마다 방식이 달라(풀 영상 1개 vs 쿼터별 여러 개) 단일 링크로는 부족 → 라벨 붙은 목록으로 담는다.
-- 20260713130000_match_media.sql 이 먼저 적용된 환경(video_url 보유)을 위한 forward 마이그레이션.
-- 신규 환경은 130000 이 이미 videos 를 만들므로 아래는 idempotent 하게 no-op 이 된다.
--
-- ⚠️ video_url 에 담겼던 링크는 라벨 없는 videos 항목으로 보존한다(데이터 유실 방지).

alter table matches add column if not exists videos jsonb not null default '[]';

-- 기존 video_url 값이 있으면 {label:"", url:<기존>} 한 항목으로 옮긴다.
update matches
set videos = jsonb_build_array(jsonb_build_object('label', '', 'url', video_url))
where video_url is not null
  and video_url <> ''
  and videos = '[]'::jsonb;

alter table matches drop column if exists video_url;
