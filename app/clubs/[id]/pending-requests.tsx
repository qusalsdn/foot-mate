"use client";

import { useTransition } from "react";
import { Check, Loader2, UserRoundCheck, X } from "lucide-react";
import { roleLabel } from "@/lib/constants/roles";
import { approveMember, rejectMember } from "./actions";

export type PendingMember = {
  user_id: string;
  role: string;
  joined_at: string;
  name: string;
  avatar_url: string | null;
};

/** 회장·총무에게만 노출되는 가입 신청 승인 대기 목록 */
export function PendingRequests({
  clubId,
  members,
}: {
  clubId: string;
  members: PendingMember[];
}) {
  if (members.length === 0) return null;

  return (
    <section className="mt-6">
      <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
        <UserRoundCheck className="size-4 text-[#65a30d]" />
        가입 신청
        <span className="rounded-full bg-[#84cc16]/15 px-2 py-0.5 text-xs font-semibold text-[#4d7c0f]">
          {members.length}
        </span>
      </h2>
      <ul className="grid gap-2">
        {members.map((m) => (
          <PendingRow key={m.user_id} clubId={clubId} member={m} />
        ))}
      </ul>
    </section>
  );
}

function PendingRow({
  clubId,
  member,
}: {
  clubId: string;
  member: PendingMember;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-xl">
      {member.avatar_url ? (
        // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={member.avatar_url}
          alt={member.name}
          referrerPolicy="no-referrer"
          className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
        />
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]">
          {member.name.charAt(0)}
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-slate-700">
          {member.name}
        </p>
        <p className="truncate text-xs text-slate-400">
          {roleLabel(member.role)} 신청
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1.5">
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => approveMember(clubId, member.user_id))
          }
          aria-label={`${member.name} 승인`}
          className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-full bg-[#84cc16] px-3.5 text-sm font-semibold text-[#1a2e05] shadow-sm shadow-[#84cc16]/30 transition-all hover:-translate-y-0.5 hover:bg-[#77b514] disabled:pointer-events-none disabled:opacity-60"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Check className="size-4" />
          )}
          승인
        </button>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            startTransition(() => rejectMember(clubId, member.user_id))
          }
          aria-label={`${member.name} 거절`}
          className="inline-flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-500 disabled:pointer-events-none disabled:opacity-60"
        >
          <X className="size-4" />
        </button>
      </div>
    </li>
  );
}
