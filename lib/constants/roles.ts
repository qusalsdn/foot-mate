/** member_role enum ↔ 한글 라벨 매핑 (DB는 영문 enum, UI는 한글) */
export const ROLE_LABELS = {
  president: "회장",
  treasurer: "총무",
  manager: "감독",
  coach: "코치",
  member: "회원",
  guest: "게스트",
} as const;

export type MemberRole = keyof typeof ROLE_LABELS;

export function roleLabel(role: string): string {
  return ROLE_LABELS[role as MemberRole] ?? role;
}

/**
 * 역할별 뱃지 색 (회장·총무 = 라임 강조, 나머지는 중립 폴백).
 * 홈·클럽 상세·회원 관리 UI가 공유한다. 미지정 역할은 호출부에서 중립 폴백 처리.
 */
export const ROLE_BADGE: Record<string, string> = {
  president: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
  treasurer: "border-[#84cc16]/30 bg-[#84cc16]/10 text-[#4d7c0f]",
};

/**
 * 역할 변경(changeMemberRole)으로 지정 가능한 역할 화이트리스트.
 * president 제외 — 회장직은 회장 이양(transferPresidency)으로만 넘긴다.
 * guest 제외 — 게스트는 매치 초대 전용이라 역할 드롭다운으로 임명하지 않는다.
 * ("use server" 파일은 async 함수만 export 가능하므로 이 상수는 여기에 둔다)
 */
export const ASSIGNABLE_ROLES = [
  "treasurer",
  "manager",
  "coach",
  "member",
] as const;
export type AssignableRole = (typeof ASSIGNABLE_ROLES)[number];

/**
 * 로스터 표시 그룹. 운영진 = 회장·총무·감독·코치(관리 권한 보유자), 나머지는 회원/게스트.
 * 클럽 상세의 읽기 전용 명단·회장/총무 관리 UI가 공유한다.
 */
export const STAFF_ROLES: readonly string[] = [
  "president",
  "treasurer",
  "manager",
  "coach",
];

export type MemberGroup = "staff" | "member" | "guest";

export function memberGroupOf(role: string): MemberGroup {
  if (role === "guest") return "guest";
  if (STAFF_ROLES.includes(role)) return "staff";
  return "member";
}

const MEMBER_GROUP_LABEL: Record<MemberGroup, string> = {
  staff: "운영진",
  member: "회원",
  guest: "게스트",
};

/** 정렬된 로스터를 표시 그룹별로 분할한다(순서 유지, 빈 그룹 제외). */
export function groupRoster<T extends { role: string }>(
  rows: T[],
): { group: MemberGroup; label: string; members: T[] }[] {
  const order: MemberGroup[] = ["staff", "member", "guest"];
  return order
    .map((group) => ({
      group,
      label: MEMBER_GROUP_LABEL[group],
      members: rows.filter((r) => memberGroupOf(r.role) === group),
    }))
    .filter((g) => g.members.length > 0);
}
