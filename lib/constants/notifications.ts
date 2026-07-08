import {
  BadgeCheck,
  Bell,
  CalendarPlus,
  Wallet,
  type LucideIcon,
} from "lucide-react";

/**
 * 알림 type(text) → 아이콘·강조색 매핑. DB의 type 문자열은 알림을 만드는 쪽(RPC 등)이 정한다.
 * 새 알림 종류가 생기면 여기에 한 줄 추가한다. 없는 type은 기본(종) 아이콘.
 */
const NOTIFICATION_META: Record<string, { icon: LucideIcon; accent: string }> = {
  payment_request: {
    icon: Wallet,
    accent: "bg-[#84cc16]/12 text-[#4d7c0f]",
  },
  payment_paid: {
    icon: BadgeCheck,
    accent: "bg-[#84cc16]/12 text-[#4d7c0f]",
  },
  match_created: {
    icon: CalendarPlus,
    accent: "bg-[#84cc16]/12 text-[#4d7c0f]",
  },
};

const FALLBACK = {
  icon: Bell,
  accent: "bg-slate-900/[0.04] text-slate-500",
};

export function notificationMeta(type: string): {
  icon: LucideIcon;
  accent: string;
} {
  return NOTIFICATION_META[type] ?? FALLBACK;
}
