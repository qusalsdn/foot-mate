# foot-mate

여러 축구 동호회가 함께 사용하는 **멀티테넌트 SaaS 플랫폼**. 회원 관리, 매치 일정·참석 투표, 회비 정산, 커뮤니티, 알림을 제공한다.

## 기술 스택

- **Next.js** (App Router 전제)
- **Supabase** — PostgreSQL + Auth + Storage + Realtime + Edge Functions
- **인증**: Supabase Auth + **카카오 OAuth** (주 로그인 수단, 한국 사용자 타겟)
- **TailwindCSS**
- **shadcn/ui** — UI 컴포넌트. 컴포넌트는 이 라이브러리로 통일한다 (Base UI(`@base-ui/react`) 기반, Tailwind + Lucide 사용, 복사-붙여넣기 방식이라 `components/ui`에 코드가 들어옴). 컴포넌트 추가는 `pnpm dlx shadcn@latest add <name>`. 폼은 shadcn `<Form>` + `zodResolver`로 작성.
- **Lucide** (`lucide-react`) — 아이콘. 아이콘은 이 라이브러리로 통일한다.
- **날짜**: `date-fns` (+ `ko` 로케일) + `date-fns-tz`. **날짜 표시는 항상 `Asia/Seoul`로 고정한다** — DB는 UTC(`timestamptz`) 저장, SSR 서버(Vercel)는 UTC이므로 표시할 때 KST로 변환하지 않으면 서버/클라이언트 렌더가 어긋난다.
- **React Hook Form + Zod** — 폼 상태 + 스키마 검증. 폼은 이 조합으로 작성한다 (`@hookform/resolvers`의 `zodResolver` 사용). Zod 스키마는 클라이언트 검증과 서버(Route Handler / Server Action) 입력 검증에 **재사용**한다.
- **pnpm** — 패키지 관리자 (npm/yarn 명령어 사용 금지, `pnpm` / `pnpm dlx` 사용)
- **PWA + Web Push (VAPID)** — 앱 스토어 비용 없이 알림 제공. iOS는 홈 화면 추가 시에만 푸시 동작하므로 **이메일 알림을 백업**으로 둔다.
- 배포: **Vercel**, 초기에는 전부 **무료 티어**로 운영

> Supabase 무료 티어는 1주간 요청이 없으면 자동 일시정지된다 → cron 헬스체크 핑으로 우회.

## 아키텍처 원칙 (가장 중요)

**멀티테넌트 격리는 이 프로젝트의 뼈대다.** 모든 클럽 소속 데이터는 `club_id`를 가지며 **RLS(Row Level Security)로 격리**된다. RLS가 누락된 테이블은 anon key로 전부 뚫리므로 곧 데이터 유출이다.

- **새 테이블을 만들면 반드시**: (1) RLS 활성화(`enable row level security`), (2) 조회/쓰기 policy 추가. 마이그레이션에서 RLS를 명시적으로 켠다. 프로젝트의 "자동 RLS 활성화" 이벤트 트리거는 안전망으로 켜두길 권장한다. 어느 경우든 **policy는 수동으로 추가해야 한다** — policy 없는 테이블은 전면 차단(빈 결과)된다.
- 권한 판단은 아래 **헬퍼 함수**로만 한다. policy 안에서 `club_members`를 직접 조회하지 말 것(RLS 재귀). 함수는 `security definer`로 이를 회피한다.
- **키 취급**: 클라이언트에는 `publishable` 키만 노출한다. `secret` 키(구 `service_role`)는 RLS를 **완전히 우회**하므로 절대 브라우저/클라이언트 번들에 넣지 말 것 — 서버(Route Handler, Server Action, Edge Function)에서만 사용. 유출 시 RLS가 무의미해진다.

## 역할 & 권한

역할 6종 (`member_role` enum, DB는 영문 / 프론트에서 한글 라벨 매핑):

| enum | 한글 | 권한 영역 |
|------|------|-----------|
| `president` | 회장 | 클럽 설정·삭제 + 아래 전부 |
| `treasurer` | 총무 | 회원 승인·역할변경, 회비/정산, 공지, 매치 관리 |
| `manager` | 감독 | 매치 생성·편성, 경기 결과·기록, 공지 |
| `coach` | 코치 | 감독과 동일 (매치 영역) |
| `member` | 회원 | 조회, 참석 투표, 자유글 |
| `guest` | 게스트 | 초대된 매치 조회·참석 투표만 (회비·회원목록·통계 차단) |

권한 헬퍼 함수 (`supabase/migrations/*_rls.sql`):

- `is_club_member(club_id)` — 조회 (게스트 포함, active 회원)
- `is_full_member(club_id)` — 민감 조회 (게스트 제외)
- `can_manage_match(club_id)` — 매치/편성/결과/기록 → 회장·총무·감독·코치
- `can_manage_club(club_id)` — 회원/회비/공지 → 회장·총무
- `is_club_owner(club_id)` — 클럽 설정/삭제 → 회장
- `shares_club_with(user_id)` — 프로필 조회용 (같은 클럽 소속 여부)

역할이 늘거나 권한이 바뀌면 이 함수들의 `in (...)` 목록만 수정한다.

**회장 역할 보호** (`*_rls_hardening.sql`): `president` 역할의 부여/회수/강퇴는 **회장만** 가능하다(총무의 권한 상승 차단). 또한 트리거로 **클럽에 회장이 최소 1명** 유지된다(마지막 회장 강등/탈퇴/삭제 불가). 회장 이양은 새 회장 승격 후 본인 강등으로 가능.

## 데이터베이스

- 마이그레이션: `supabase/migrations/` (타임스탬프 순 실행). enum → 백본 → 도메인 → RLS 순서 의존성.
- 컨벤션: enum/컬럼은 영문 snake_case. 한글 라벨은 프론트에서 매핑.
- `payments` 통합 테이블: 월회비·매치비·기타를 `type`으로 구분 (정산/미납 쿼리가 여기 집중).
- `clubs.join_policy` (`'approval' | 'open'`, 기본 `approval`): 가입 방식. 클럽 상세에서 "승인제 가입 / 누구나 가입" 라벨로 노출. `joinClub` 액션은 정책을 서버에서 재조회해 반영한다 — `open`이면 즉시 `active`, `approval`이면 `pending`. RLS `member join` 정책도 동일 조건을 강제(open 클럽에서만 active insert 허용)하므로 클라이언트가 위조해도 DB에서 거부된다.
- 자동 트리거: 회원가입 → `profiles` 생성, 클럽 생성 → 생성자를 `president(active)`로 등록, `club_members` 변경 시 마지막 회장 보호(`protect_last_president`).
- INSERT 시 `created_by = auth.uid()` 강제 (`matches`, `payments`). UPDATE 정책은 `with check`로 변경 후 상태도 격리 검증(크로스-테넌트 이동 차단).
- 주요 테이블: `profiles, clubs, club_members, matches, match_attendances, match_results, match_stats, match_teams, match_team_defs, match_team_scores, match_quarter_scores, match_quarter_stats, payments, posts, comments, push_subscriptions, notifications`
  - 매치 하위 테이블(`match_team*`, `match_quarter*`) RLS: 조회=`is_club_member`(게스트 포함), 쓰기=`can_manage_match`. 상세는 아래 "매치 도메인" 참고.

## Supabase 클라이언트 (`@supabase/ssr`)

용도별로 3종을 구분해서 쓴다. 섞어 쓰면 세션이 깨진다.

- `lib/supabase/client.ts` → `createClient()` — **클라이언트 컴포넌트**(`"use client"`)용. 동기 함수.
- `lib/supabase/server.ts` → `await createClient()` — **서버 컴포넌트 / Route Handler / Server Action**용. `cookies()`가 async라 **반드시 await**.
- `lib/supabase/middleware.ts` → `updateSession()` — 루트 `proxy.ts`에서 호출. 매 요청마다 세션 토큰 갱신. `createServerClient` 직후 `getUser()` 호출이 토큰을 갱신하므로 **제거하지 말 것**.

Next.js 16은 `middleware.ts` 대신 **`proxy.ts`** 규칙을 쓴다(함수명도 `proxy`). 보호 경로 리다이렉트 로직은 `updateSession` 안에 있다(공개 경로: `/login`, `/auth/*`).

환경변수: `.env.local` (git 제외), 템플릿은 `.env.example` (커밋됨). `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`. Supabase 새 키 방식(`sb_publishable_...` / `sb_secret_...`)을 쓴다. `secret` 키(구 `service_role`)는 서버 전용, `NEXT_PUBLIC_` 금지.

## 라우트 / 화면

- `/login` — 카카오 로그인 (공개). `signInWithOAuth('kakao')`, scope는 `profile_nickname profile_image`만 요청(이메일 제외 = 비즈앱 회피, `handle_new_user`가 이메일 없이도 동작). 로그인 상태로 접근하면 홈으로 리다이렉트.
- `/auth/callback` — OAuth 코드 → 세션 교환 후 리다이렉트.
- `/auth/signout` — POST, 로그아웃.
- `/` — 홈. 내 클럽 목록 + 클럽 둘러보기(이름 검색 `q` + 지역 필터 `sido`/`gu`, JS 없이 GET 폼·링크로 동작). 필터 파라미터는 상수(`SIDO_LIST`/`districtsOf`)에 존재하는 값만 신뢰(URL 임의값 차단). 미로그인 시 `/login`.
- `/clubs/new` — 클럽 생성 (RHF+Zod, Server Action `createClub`). 생성자는 트리거로 회장 등록.
- `/clubs/[id]` — 클럽 상세 + 가입(`joinClub`: open 즉시 / approval 승인대기). 회원 명단(로스터)은 **정회원(`is_full_member`)에게만** 조회·표시(게스트·비회원은 RLS로 빈 결과). **회장·총무(`can_manage_club`)에게는 회원 관리 UI 노출**: 가입 신청 승인/거절(`approveMember`/`rejectMember`), 역할 변경(`changeMemberRole`, president·guest 제외 화이트리스트)·강퇴(`removeMember`), **회장 이양**(`transferPresidency` → security definer RPC로 승격·강등 원자 처리). 액션은 `app/clubs/[id]/actions.ts`, 관리 UI는 `pending-requests.tsx`·`member-manager.tsx`(회장 이양·강퇴는 확인 다이얼로그).

폼 패턴: `components/ui/form.tsx`(Base UI 셋업에 맞춰 직접 작성, Radix Slot 없이 `cloneElement` 사용) + `zodResolver`. 스키마는 `lib/schemas/`에 두고 클라이언트·서버 액션이 공유. 역할 한글 라벨은 `lib/constants/roles.ts`.

지역: `lib/constants/regions.ts` — 시/도 → 시·군·구 2단계 계층 상수(DB enum 대신 상수, 마이그레이션 고통 회피). `region` 컬럼은 text 하나에 `"서울 강남구"`처럼 결합 저장(구 미선택 시 `"서울"`만). 헬퍼: `formatRegion`/`parseRegion`(결합↔분해), `districtsOf`, `sidoOrder`, 검증용 `VALID_REGIONS`(폼·서버 액션·검색 필터가 공유). 시/도가 없어 하위 구가 없으면(세종 등) 빈 배열.

## 매치 도메인 (팀 편성 / 결과)

매치 `type`(internal/friendly/league)에 따라 **팀 구성·결과 기록 방식이 다르다**. 팀은 **생성/수정 시 이름과 함께 선언**한다(`matchSchema.teams` → `match_team_defs`, `createMatch`/`updateMatch`가 저장·전체교체·고아정리). `teams` 필드 의미는 유형별로 다르니 `matchSchema` refine이 유형별 개수를 강제한다.

- **자체전(internal)**: `match_team_defs` team 1..N = 우리 인원을 나눈 내부 팀(2~4). 상세에서 참석 확정자를 팀에 배정(`match_teams`, 액션 `saveTeams`, UI `team-editor.tsx`의 `TeamEditor`). "우리팀" 개념 없음.
- **친선전(friendly)**: team 1 = **우리팀(클럽명 자동 삽입)** + team 2.. = 상대팀(1~3). 폼엔 상대팀만 입력(우리팀 자동), 개인 배정 없음.
- **리그(league)**: 팀 정의 없음. `matches.opponent`(단일 텍스트) + `match_results.our_score/opponent_score`(2면 스코어).
- `teamMode`(팀별 점수로 기록) = 자체전·친선. 리그는 우리:상대 2면 스코어.

**결과 기록**: 팀 경기(자체전·친선)는 **쿼터 필수**(액션 `saveInternalResult`). 최종 = 쿼터 합계. `match_team_scores`=팀 최종 점수, `match_quarter_scores`=쿼터별 상세. 개인 골/도움도 쿼터별: `match_stats`=매치 합계(리더보드 집계용 유지), `match_quarter_stats`=쿼터 상세. note·결과 존재표시는 `match_results` 재사용(팀 경기는 our/opponent=0). 리그는 `saveResult`(2면 스코어 + 매치 단위 `match_stats`).

**표시**(상세 `[matchId]/page.tsx`): 팀 경기=순위표(2팀 승/무/패, 3팀+ 순위)+쿼터 상세 표. 친선전은 **우리팀(team 1) 행만 우리 결과 색으로 강조**(승=라임/패=빨강/무·중위=중립 — 초록은 실제 승리 때만). 리그는 우리:상대 스코어보드. 편집기 `result-editor.tsx`(mode `external`|`internal`, internal은 쿼터 탭). 라벨·팀색·승패 상수는 `lib/constants/matches.ts`(`teamLabel`=`N팀` 폴백, `TEAM_STYLES`), 스키마는 `lib/schemas/match.ts`(`matchSchema`/`resultSchema`/`internalResultSchema`).

## 디자인 / UI 컨벤션

앱 디자인 언어는 **"밝은 톤 + 라임 포인트 + 글래스모피즘"** 으로 전 화면을 통일한다(로그인·홈·클럽 생성/상세 동일 팔레트). 신규 화면도 이 언어를 따른다.

- ⚠️ **shadcn CSS 변수(`globals.css`의 `--primary` 등)는 기본 회색조 그대로 방치돼 있고, 실제 화면은 이 토큰을 쓰지 않는다.** 페이지들은 아래 팔레트를 **Tailwind arbitrary value로 하드코딩**(`bg-[#84cc16]`)한다. 신규 화면에서 `bg-primary` 같은 시맨틱 토큰을 쓰면 회색이 나오니 하드코딩 팔레트를 따를 것.
- **팔레트**: 배경 `#f6f8f4`, 본문 텍스트 `slate-900`(보조 `slate-500/400`). 라임 포인트 = 주 `#84cc16`(CTA), 짙은 텍스트/아이콘 `#65a30d`·`#4d7c0f`, 밝은 오브 `#a3e635`·`#34d399`.
- **글래스 카드 레시피**: `rounded-3xl`(또는 `2xl`) + `border-slate-900/[0.06]` + `bg-white/80` + `backdrop-blur-xl` + `shadow-sm`. hover는 `-translate-y-0.5` + 라임 그림자.
- **배경 장식**: 떠다니는 그라디언트 오브 + 미세 그리드. 항상 `aria-hidden`·`pointer-events-none`. 애니메이션은 `globals.css`의 keyframes(`footmate-glow`/`float`/`drift`/`shimmer`)를 arbitrary value(`[animation:footmate-drift_16s_...]`)로 물린다.
- **아바타/뱃지**: 클럽 아바타는 id 해시 → `AVATAR_GRADIENTS`(6종 파스텔 그라디언트) 안정 매핑, 역할 뱃지는 `ROLE_BADGE`(회장·총무만 라임 강조, 나머지 중립). ※ 현재 이 헬퍼(`gradientFor`/`AVATAR_GRADIENTS`/`ROLE_BADGE`)가 홈·클럽상세에 **복붙 중복** — 재사용 시 공용 모듈로 추출할 것.
- **커서**: 클릭 가능한 모든 버튼(`<button>`, submit, 아이콘 버튼, 클릭 핸들러 붙은 요소)에는 반드시 `cursor-pointer`를 넣는다. Tailwind Preflight가 `button`의 기본 커서를 `default`로 되돌리므로 명시하지 않으면 손가락 커서가 안 나온다. `<Link>`/`<a>`는 기본이 pointer라 불필요.

## 명령어

```bash
pnpm dev                          # 개발 서버 (포트 4000 → Supabase URL Configuration에 http://localhost:4000/** 등록 필요)
pnpm install                      # 의존성 설치
pnpm dlx supabase db push         # 마이그레이션 원격 적용 (FootMate 프로젝트 link 완료: ezvurwzfvcgxkhbntqxb)
pnpm dlx shadcn@latest add <name> # UI 컴포넌트 추가
```

> ⚠️ `supabase init --force`는 커밋 안 된 `supabase/migrations/`를 날릴 수 있다. 마이그레이션 작업 후에는 바로 커밋할 것.

## 아직 안 만든 것 (TODO)

- 기능 페이지 (미구현): 커뮤니티(게시판·댓글). ※ 로그인·클럽 생성/목록/상세/가입, **매치(일정·참석 투표·팀 편성·결과·쿼터 기록)**, 회비/정산, 알림은 구현 완료
- 매치 라우트: `/clubs/[id]/matches`(목록) · `/new`(생성, 회장·총무·감독·코치) · `/[matchId]`(상세+참석투표+팀 편성+결과·기록) · `/[matchId]/edit`(수정). 날짜는 `lib/date.ts`(KST 고정), 라벨은 `lib/constants/matches.ts`, 스키마는 `lib/schemas/match.ts`. 참석 투표는 `vote_attendance` RPC(정원·대기자 자동 처리) 경유. 팀 편성·결과 모델은 위 "매치 도메인" 섹션 참고.
- DB 타입 생성 (`supabase gen types typescript`) → 클라이언트에 제네릭으로 물려 쿼리 타입 안전성 확보 (현재 쿼리는 untyped, `as unknown as` 캐스팅 사용 중)
- ~~PWA 배선~~ → 완료. `manifest.webmanifest` + 서비스워커 등록(`components/push/service-worker-register`) + `layout.tsx`의 apple-touch-icon link. 아이콘은 `public/app-icon-*` · `apple-touch-icon.png`(네온 다크).
- 스플래시 스크린: Android는 manifest(`background_color` + 512 아이콘)만으로 자동 생성돼 이미 동작한다. **iOS는 manifest를 안 읽으므로** 기기별 `apple-touch-startup-image`가 필요하고, 없으면 홈 화면 실행 시 흰 화면이 뜬다(현재 상태).
- ~~정원 초과 시 대기자 처리 + 취소 시 대기 자동 승격 RPC~~ → `vote_attendance`(`*_vote_attendance.sql`)로 구현. security definer로 대기열을 원자적으로 재정렬(선착순). 완전한 동시성 보장은 아니지만 실사용 충분.
- Web Push 발송 Edge Function (`notifications` insert → `push_subscriptions` 조회 → 전송). 발송 라이브러리 필요 (Edge Function은 Deno이므로 `web-push` npm 대신 Deno 호환 방식 또는 Next.js Node 라우트에서 발송)
- 구장 위치 지도: 카카오맵 SDK (npm 아님, 스크립트 로드)
- 카카오 실제 연동 후 `raw_user_meta_data` 실제 payload 확인: `handle_new_user`는 `name`→`full_name`→`nickname`→email앞부분→`'축구인'`, 사진은 `avatar_url`→`picture` fallback으로 이미 대응됨. 실제 카카오 응답 키가 다르면 이 목록만 조정
