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
