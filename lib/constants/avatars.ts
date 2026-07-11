/**
 * 클럽 아바타 그라디언트 — id 해시 → 안정적인 파스텔 그라디언트 매핑.
 * 홈·클럽 상세가 공유한다(동일 팔레트). Tailwind `bg-gradient-to-br ${gradientFor(id)}` 형태로 사용.
 */
export const AVATAR_GRADIENTS = [
  "from-[#a3e635] to-[#22c55e]",
  "from-[#34d399] to-[#0ea5e9]",
  "from-[#facc15] to-[#84cc16]",
  "from-[#38bdf8] to-[#6366f1]",
  "from-[#fb923c] to-[#f43f5e]",
  "from-[#c084fc] to-[#6366f1]",
];

/** id(클럽 id 등) → 안정적인 그라디언트 클래스. 같은 id는 항상 같은 색. */
export function gradientFor(id: string): string {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_GRADIENTS[h % AVATAR_GRADIENTS.length];
}
