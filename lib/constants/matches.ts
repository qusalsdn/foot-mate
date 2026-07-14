/**
 * 매치 도메인 enum ↔ 한글 라벨 매핑 (DB는 영문 enum, UI는 한글).
 * 역할 라벨(lib/constants/roles.ts)과 같은 패턴.
 */

/** match_type: 경기 성격. 리터럴 튜플이라 z.enum(MATCH_TYPES)이 유니온을 그대로 추론한다. */
export const MATCH_TYPES = ["internal", "friendly", "league"] as const;
export type MatchType = (typeof MATCH_TYPES)[number];
export const MATCH_TYPE_LABELS: Record<MatchType, string> = {
  internal: "자체전",
  friendly: "친선경기",
  league: "리그",
};
export function matchTypeLabel(t: string): string {
  return MATCH_TYPE_LABELS[t as MatchType] ?? t;
}

/** match_status: 진행 상태 */
export const MATCH_STATUS_LABELS = {
  scheduled: "모집중",
  closed: "모집마감",
  finished: "경기종료",
  canceled: "취소됨",
} as const;
export type MatchStatus = keyof typeof MATCH_STATUS_LABELS;
export function matchStatusLabel(s: string): string {
  return MATCH_STATUS_LABELS[s as MatchStatus] ?? s;
}

/** 상태별 뱃지 색 (모집중 = 라임 강조, 종료/취소는 중립·경고) */
export const MATCH_STATUS_BADGE: Record<string, string> = {
  scheduled: "border-[#84cc16]/30 bg-[#84cc16]/12 text-[#4d7c0f]",
  closed: "border-amber-500/25 bg-amber-500/10 text-amber-600",
  finished: "border-slate-900/10 bg-slate-900/[0.04] text-slate-500",
  canceled: "border-red-500/20 bg-red-500/[0.07] text-red-500",
};

/**
 * 표시용 매치 상태 — DB status + 경기 시각(now)으로 렌더 시점에 계산.
 * DB status 는 사람이 명시한 사실(마감/취소/결과입력)만 담고, "진행중"처럼
 * 시간에 따라 바뀌는 상태는 여기서 파생한다(자동 전이·cron 불필요).
 *
 * - canceled            → 취소됨
 * - finished(결과 입력)  → 경기종료
 * - 시작시각 지남         → 진행중  (결과 미입력)
 * - 시작 전 & closed     → 모집마감
 * - 시작 전 & scheduled  → 모집중
 */
export type MatchViewKey =
  | "recruiting"
  | "closed"
  | "ongoing"
  | "finished"
  | "canceled";

export function getMatchView(
  status: string,
  matchDate: string | Date,
  now: Date = new Date(),
): { key: MatchViewKey; label: string; badge: string } {
  if (status === "canceled") {
    return { key: "canceled", label: "취소됨", badge: MATCH_STATUS_BADGE.canceled };
  }
  if (status === "finished") {
    return { key: "finished", label: "경기종료", badge: MATCH_STATUS_BADGE.finished };
  }
  const started = new Date(matchDate).getTime() <= now.getTime();
  if (started) {
    return {
      key: "ongoing",
      label: "진행중",
      badge: "border-sky-500/25 bg-sky-500/10 text-sky-600",
    };
  }
  if (status === "closed") {
    return { key: "closed", label: "모집마감", badge: MATCH_STATUS_BADGE.closed };
  }
  return { key: "recruiting", label: "모집중", badge: MATCH_STATUS_BADGE.scheduled };
}

/** attend_status: 참석 응답 */
export const ATTEND_LABELS = {
  attending: "참석",
  absent: "불참",
  maybe: "미정",
} as const;
export type AttendStatus = keyof typeof ATTEND_LABELS;
export function attendLabel(s: string): string {
  return ATTEND_LABELS[s as AttendStatus] ?? s;
}

/**
 * 자체전 팀 편성(match_teams). team 번호는 1~4.
 * 라벨은 팀 수와 무관하게 항상 `N팀`으로 통일.
 * 팀별 뱃지·점 색은 참석 명단 accent 팔레트와 결이 맞게 구성.
 */
export const MAX_TEAMS = 4;

export function teamLabel(team: number): string {
  return `${team}팀`;
}

/**
 * 매치 사진·영상 (matches.images / matches.video_url).
 * 사진은 게시글(post-images)과 같은 모델 — 별도 버킷에 '경로'만 저장하고 공개 URL 은 렌더 시 조립.
 * 영상은 자체 저장 대신 외부 링크(유튜브 등)만 저장하고 상세에서 임베드.
 */
export const MATCH_IMAGE_BUCKET = "match-images";
export const MAX_MATCH_IMAGES = 20;

/** 경로 → 공개 URL (공개 버킷 규칙 고정: /storage/v1/object/public/<bucket>/<path>). */
export function matchImageUrl(path: string): string {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
  return `${base}/storage/v1/object/public/${MATCH_IMAGE_BUCKET}/${path}`;
}

/**
 * 유튜브 링크(watch·youtu.be·shorts·embed) → 임베드 URL. 인식 못 하면 null(그땐 링크만 노출).
 * 영상 ID 는 11자 [A-Za-z0-9_-]. 자체 저장을 피하려는 결정상 유튜브만 임베드한다.
 */
export function youtubeEmbedUrl(url: string): string | null {
  const m = url.match(
    /(?:youtube\.com\/(?:watch\?(?:.*&)?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/,
  );
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/**
 * 매치 영상 = 라벨 붙은 외부 링크(matches.videos jsonb 배열).
 * 팀마다 방식이 달라(풀 영상 1개 vs 쿼터별 여러 개) 단일 컬럼 대신 목록으로 담는다.
 * label 은 선택(비면 캡션 없음), 자유 입력이되 아래 프리셋을 추천한다.
 */
export type MatchVideo = { label: string; url: string };
export const MAX_MATCH_VIDEOS = 12;

/** 라벨 자동완성 추천값(datalist). 자유 입력이라 이 외 값도 허용. */
export const MATCH_VIDEO_LABEL_PRESETS = [
  "전체 경기",
  "전반",
  "후반",
  "1쿼터",
  "2쿼터",
  "3쿼터",
  "4쿼터",
] as const;

/**
 * matches.videos(jsonb, Json 타입) → MatchVideo[] 정규화.
 * DB/네트워크로 넘어온 느슨한 Json 을 방어적으로 파싱한다(비배열·잘못된 항목·빈 url 제거).
 */
export function parseMatchVideos(raw: unknown): MatchVideo[] {
  if (!Array.isArray(raw)) return [];
  const out: MatchVideo[] = [];
  for (const item of raw) {
    if (item && typeof item === "object" && "url" in item) {
      const url = String((item as { url: unknown }).url ?? "").trim();
      if (!url) continue;
      const label = String((item as { label?: unknown }).label ?? "").trim();
      out.push({ label, url });
    }
  }
  return out;
}

/** 팀별 색: dot(점), badge(테두리+배경+텍스트), swatch(버튼 강조) */
export const TEAM_STYLES: Record<
  number,
  { dot: string; badge: string; swatch: string }
> = {
  1: {
    dot: "bg-sky-500",
    badge: "border-sky-500/25 bg-sky-500/10 text-sky-600",
    swatch: "border-sky-500/40 bg-sky-500/12 text-sky-600",
  },
  2: {
    dot: "bg-slate-400",
    badge: "border-slate-900/12 bg-slate-900/[0.05] text-slate-600",
    swatch: "border-slate-400/50 bg-slate-500/10 text-slate-600",
  },
  3: {
    dot: "bg-[#84cc16]",
    badge: "border-[#84cc16]/30 bg-[#84cc16]/12 text-[#4d7c0f]",
    swatch: "border-[#84cc16]/40 bg-[#84cc16]/12 text-[#4d7c0f]",
  },
  4: {
    dot: "bg-amber-400",
    badge: "border-amber-500/25 bg-amber-500/10 text-amber-600",
    swatch: "border-amber-500/40 bg-amber-500/12 text-amber-600",
  },
};
