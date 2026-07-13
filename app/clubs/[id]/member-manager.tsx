"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { AlertTriangle, Crown, Loader2, UserMinus, X } from "lucide-react";
import {
  ASSIGNABLE_ROLES,
  groupRoster,
  roleLabel,
  ROLE_BADGE,
  type AssignableRole,
} from "@/lib/constants/roles";
import {
  changeMemberRole,
  removeMember,
  transferPresidency,
} from "./actions";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalPortal } from "@/components/ui/modal-portal";

export type RosterMember = {
  user_id: string;
  role: string;
  name: string;
  avatar_url: string | null;
};

type Confirm =
  | { type: "kick"; member: RosterMember }
  | { type: "transfer"; member: RosterMember };

/**
 * 회장·총무용 회원 관리 로스터. 각 회원의 역할 변경·강퇴, 회장 이양(회장만)을 제공한다.
 * 권한 밖 동작은 RLS/트리거가 서버에서 막지만, UI에서도 미리 노출 자체를 제한한다.
 */
export function MemberManager({
  clubId,
  currentUserId,
  iAmOwner,
  members,
}: {
  clubId: string;
  currentUserId: string;
  iAmOwner: boolean;
  members: RosterMember[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<Confirm | null>(null);

  function runConfirm() {
    if (!confirm) return;
    const { type, member } = confirm;
    startTransition(async () => {
      if (type === "kick") await removeMember(clubId, member.user_id);
      else await transferPresidency(clubId, member.user_id);
      setConfirm(null);
    });
  }

  const renderRow = (m: RosterMember) => {
    const isSelf = m.user_id === currentUserId;
          const isPresident = m.role === "president";
          const isGuest = m.role === "guest";
          // 역할 드롭다운: 본인·회장·게스트 제외 (게스트는 매치 초대 전용)
          const canEditRole = !isSelf && !isPresident && !isGuest;
          // 강퇴: 본인·회장 제외 (회장은 이양으로만 물러남)
          const canKick = !isSelf && !isPresident;
          // 회장 이양: 현 회장이, 본인 아닌 정회원(게스트 제외)에게만
          const canTransfer = iAmOwner && !isSelf && !isGuest && !isPresident;

          return (
            <li
              key={m.user_id}
              className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/70 px-3.5 py-2.5 shadow-sm backdrop-blur-xl transition-colors hover:border-[#84cc16]/40"
            >
              <Link
                href={`/clubs/${clubId}/members/${m.user_id}`}
                className="flex min-w-0 flex-1 items-center gap-3"
              >
                {m.avatar_url ? (
                  // 카카오 CDN 호스트가 유동적이라 next/image 대신 일반 img 사용
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={m.avatar_url}
                    alt={m.name}
                    referrerPolicy="no-referrer"
                    className="size-9 shrink-0 rounded-full object-cover ring-1 ring-slate-900/10"
                  />
                ) : (
                  <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#84cc16]/15 text-sm font-bold text-[#4d7c0f]">
                    {m.name.charAt(0)}
                  </span>
                )}

                <span className="min-w-0 flex-1 truncate text-sm font-medium text-slate-700">
                  {m.name}
                  {isSelf && (
                    <span className="ml-1.5 text-xs font-normal text-slate-400">
                      (나)
                    </span>
                  )}
                </span>
              </Link>

              {/* 역할: 편집 가능하면 드롭다운, 아니면 뱃지 */}
              {canEditRole ? (
                <Select
                  value={m.role}
                  disabled={pending}
                  onValueChange={(v) =>
                    startTransition(() =>
                      changeMemberRole(clubId, m.user_id, v as AssignableRole),
                    )
                  }
                >
                  <SelectTrigger
                    aria-label={`${m.name} 역할`}
                    className="h-8 w-auto shrink-0 gap-1 rounded-full border-slate-900/10 bg-white pl-3 pr-2.5 text-xs font-semibold text-slate-600"
                  >
                    <SelectValue>
                      {(v: string) => roleLabel(v as AssignableRole)}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    {ASSIGNABLE_ROLES.map((r) => (
                      <SelectItem key={r} value={r}>
                        {roleLabel(r)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <span
                  className={`shrink-0 rounded-full border px-2 py-0.5 text-xs font-semibold ${
                    ROLE_BADGE[m.role] ??
                    "border-slate-900/10 bg-slate-900/[0.04] text-slate-500"
                  }`}
                >
                  {roleLabel(m.role)}
                </span>
              )}

              {/* 회장 이양 (회장만) */}
              {canTransfer && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirm({ type: "transfer", member: m })}
                  aria-label={`${m.name}에게 회장 이양`}
                  title="회장 이양"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-[#84cc16]/25 bg-[#84cc16]/[0.06] text-[#4d7c0f] transition-colors hover:bg-[#84cc16]/15 disabled:pointer-events-none disabled:opacity-50"
                >
                  <Crown className="size-4" />
                </button>
              )}

              {/* 강퇴 */}
              {canKick && (
                <button
                  type="button"
                  disabled={pending}
                  onClick={() => setConfirm({ type: "kick", member: m })}
                  aria-label={`${m.name} 내보내기`}
                  title="내보내기"
                  className="inline-flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-full border border-slate-900/10 bg-white text-slate-400 transition-colors hover:border-red-500/30 hover:bg-red-500/[0.06] hover:text-red-500 disabled:pointer-events-none disabled:opacity-50"
                >
                  <UserMinus className="size-4" />
                </button>
              )}
            </li>
    );
  };

  return (
    <>
      <div className="space-y-5">
        {groupRoster(members).map((g) => (
          <div key={g.group}>
            <p
              className={`mb-2 flex items-center gap-1.5 px-1 text-xs font-semibold ${
                g.group === "staff" ? "text-[#4d7c0f]" : "text-slate-500"
              }`}
            >
              {g.label}
              <span
                className={`rounded-full px-1.5 py-0.5 text-[11px] font-semibold ${
                  g.group === "staff"
                    ? "bg-[#84cc16]/15 text-[#4d7c0f]"
                    : "bg-slate-900/[0.06] text-slate-500"
                }`}
              >
                {g.members.length}
              </span>
            </p>
            <ul className="grid gap-2">{g.members.map(renderRow)}</ul>
          </div>
        ))}
      </div>

      {confirm && (
        <ConfirmDialog
          confirm={confirm}
          pending={pending}
          onCancel={() => setConfirm(null)}
          onConfirm={runConfirm}
        />
      )}
    </>
  );
}

function ConfirmDialog({
  confirm,
  pending,
  onCancel,
  onConfirm,
}: {
  confirm: Confirm;
  pending: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const isTransfer = confirm.type === "transfer";
  const name = confirm.member.name;

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
          onClick={onCancel}
          aria-hidden
        />
        <div
          role="dialog"
          aria-modal="true"
          className="relative w-full max-w-md rounded-3xl border border-slate-900/[0.08] bg-white p-6 shadow-2xl"
        >
          <button
            type="button"
            onClick={onCancel}
            className="absolute right-4 top-4 flex size-8 cursor-pointer items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-900/5 hover:text-slate-700"
            aria-label="닫기"
          >
            <X className="size-4" />
          </button>

          <span
            className={`flex size-12 items-center justify-center rounded-2xl ${
              isTransfer
                ? "bg-[#84cc16]/12 text-[#4d7c0f]"
                : "bg-red-500/10 text-red-600"
            }`}
          >
            {isTransfer ? (
              <Crown className="size-6" />
            ) : (
              <AlertTriangle className="size-6" />
            )}
          </span>

          <h2 className="mt-4 text-lg font-bold text-slate-900">
            {isTransfer ? "회장직을 이양할까요?" : "회원을 내보낼까요?"}
          </h2>
          <p className="mt-1.5 text-sm leading-relaxed text-slate-500">
            {isTransfer ? (
              <>
                <b className="font-semibold text-slate-700">{name}</b> 님을 새 회장으로
                세우고, 나는 <b className="font-semibold text-slate-700">회원</b>으로
                내려갑니다. 되돌리려면 새 회장이 다시 이양해야 해요.
              </>
            ) : (
              <>
                <b className="font-semibold text-slate-700">{name}</b> 님을 클럽에서
                내보냅니다. 다시 들어오려면 새로 가입해야 해요.
              </>
            )}
          </p>

          <div className="mt-5 flex gap-2.5">
            <button
              type="button"
              onClick={onCancel}
              disabled={pending}
              className="h-11 flex-1 cursor-pointer rounded-2xl border border-slate-900/10 bg-white text-[15px] font-semibold text-slate-600 transition-colors hover:bg-slate-900/[0.03] disabled:opacity-50"
            >
              취소
            </button>
            <button
              type="button"
              onClick={onConfirm}
              disabled={pending}
              className={`inline-flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-2xl text-[15px] font-semibold transition-all disabled:pointer-events-none disabled:opacity-60 ${
                isTransfer
                  ? "bg-[#84cc16] text-[#1a2e05] shadow-md shadow-[#84cc16]/30 hover:-translate-y-0.5 hover:bg-[#77b514]"
                  : "bg-red-500 text-white shadow-md shadow-red-500/25 hover:-translate-y-0.5 hover:bg-red-600"
              }`}
            >
              {pending && <Loader2 className="size-4 animate-spin" />}
              {isTransfer ? "이양하기" : "내보내기"}
            </button>
          </div>
        </div>
      </div>
    </ModalPortal>
  );
}
