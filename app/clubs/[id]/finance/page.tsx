import { notFound, redirect } from "next/navigation";
import {
  CircleDollarSign,
  Receipt,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { PageBackBar } from "@/components/page-back-bar";
import { kstYearMonth } from "@/lib/date";
import {
  formatPeriod,
  formatWon,
  OTHER_PERIOD_KEY,
  paymentStatusLabel,
  paymentTypeLabel,
  PAYMENT_STATUS_BADGE,
} from "@/lib/constants/finance";
import { ChargeForm } from "./charge-form";
import {
  PaymentManager,
  type PayRow,
  type PeriodGroup,
} from "./payment-manager";
import { RequestButton } from "./request-button";

const ADMIN_ROLES = new Set(["president", "treasurer"]);

// payments + profiles 조인 원본 행
type RawPay = {
  id: string;
  user_id: string;
  type: string;
  period: string | null;
  amount: number;
  status: string;
  requested_at: string | null;
  profiles: { name: string; avatar_url: string | null } | null;
};

// 회원 본인 내역 행 (프로필 조인 없음)
type MyPay = {
  id: string;
  type: string;
  period: string | null;
  amount: number;
  status: string;
  requested_at: string | null;
};

/** 기간(period) 기준으로 묶는다. period 없는 행(매치비·기타)은 한 묶음으로 모은다. */
function groupByPeriod(rows: RawPay[]): PeriodGroup[] {
  const map = new Map<string, PeriodGroup>();
  for (const r of rows) {
    const key = r.period ?? OTHER_PERIOD_KEY;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        period: r.period,
        label: r.period ? formatPeriod(r.period)! : "매치비 · 기타",
        rows: [],
        totalAmount: 0,
        paidAmount: 0,
        unpaidCount: 0,
      };
      map.set(key, g);
    }
    const row: PayRow = {
      id: r.id,
      userId: r.user_id,
      name: r.profiles?.name ?? "알 수 없음",
      avatarUrl: r.profiles?.avatar_url ?? null,
      type: r.type,
      period: r.period,
      amount: r.amount,
      status: r.status,
      requestedAt: r.requested_at,
    };
    g.rows.push(row);
    g.totalAmount += r.amount;
    if (r.status === "paid") g.paidAmount += r.amount;
    else g.unpaidCount += 1;
  }
  return [...map.values()];
}

function BgDecor() {
  return (
    <>
      <div
        aria-hidden
        className="pointer-events-none absolute -top-48 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-25 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -right-32 top-40 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-[0.18] blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-40 [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_top,#000_20%,transparent_70%)]"
      />
    </>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  tone = "neutral",
}: {
  icon: typeof Wallet;
  label: string;
  value: string;
  tone?: "neutral" | "lime" | "amber";
}) {
  const toneClass =
    tone === "lime"
      ? "text-[#4d7c0f]"
      : tone === "amber"
        ? "text-amber-600"
        : "text-slate-800";
  return (
    <div className="rounded-2xl border border-slate-900/[0.06] bg-white/80 p-4 shadow-sm backdrop-blur-xl">
      <span className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
        <Icon className="size-3.5" />
        {label}
      </span>
      <p className={`mt-1.5 text-lg font-bold tabular-nums ${toneClass}`}>
        {value}
      </p>
    </div>
  );
}

/** 본인 회비 목록 (회원 뷰 + 운영진 '내 회비' 섹션 공용). 빈 내역이면 안내를 렌더한다. */
function MyDuesList({ rows, clubId }: { rows: MyPay[]; clubId: string }) {
  if (rows.length === 0) {
    return (
      <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-14 text-center backdrop-blur-sm">
        <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
          <Wallet className="size-7" />
        </span>
        <p className="mt-4 text-sm font-medium text-slate-600">
          아직 회비 내역이 없어요
        </p>
        <p className="mt-1 text-sm text-slate-400">
          운영진이 회비를 부과하면 여기에 표시돼요.
        </p>
      </div>
    );
  }
  return (
    <ul className="grid gap-2">
      {rows.map((p) => {
        const periodLabel = formatPeriod(p.period);
        return (
          <li
            key={p.id}
            className="flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-white/80 px-4 py-3 shadow-sm backdrop-blur-xl"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-[#84cc16]/12 text-[#4d7c0f]">
              <Wallet className="size-4.5" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-slate-800">
                {periodLabel
                  ? `${periodLabel} ${paymentTypeLabel(p.type)}`
                  : paymentTypeLabel(p.type)}
              </p>
              <p className="text-xs text-slate-400">{formatWon(p.amount)}</p>
            </div>
            {p.status === "paid" ? (
              <span
                className={`shrink-0 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${PAYMENT_STATUS_BADGE.paid}`}
              >
                {paymentStatusLabel("paid")}
              </span>
            ) : (
              <RequestButton
                clubId={clubId}
                paymentId={p.id}
                requested={!!p.requested_at}
              />
            )}
          </li>
        );
      })}
    </ul>
  );
}

export default async function FinancePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  // 클럽 · 멤버십은 서로 독립 → 병렬. 가드는 아래에서 순서대로.
  const [{ data: club }, { data: membership }] = await Promise.all([
    supabase.from("clubs").select("id, name").eq("id", id).single(),
    supabase.from("club_members").select("role, status").eq("club_id", id).eq("user_id", user.id).maybeSingle(),
  ]);
  if (!club) notFound();

  // 게스트·비활성 회원은 회비 차단 (회원 목록·통계와 동일 기준) → 클럽으로 되돌린다
  if (membership?.status !== "active" || membership.role === "guest") {
    redirect(`/clubs/${id}`);
  }
  const canManage = ADMIN_ROLES.has(membership.role);

  const backLink = (
    <PageBackBar href={`/clubs/${id}`} label={club.name} userId={user.id} />
  );

  const header = (
    <div className="mb-7">
      <h1 className="flex items-center gap-2 text-2xl font-bold tracking-tight sm:text-3xl">
        <Wallet className="size-6 text-[#65a30d]" />
        회비
      </h1>
      <p className="mt-1 text-sm text-slate-500">
        {canManage
          ? "월회비를 부과하고 납부 현황을 관리하세요."
          : "내 회비 납부 내역을 확인하세요."}
      </p>
    </div>
  );

  // ── 회원 본인 뷰 (총무·회장 아님) ──────────────────────────────
  if (!canManage) {
    const { data } = await supabase
      .from("payments")
      .select("id, type, period, amount, status, requested_at")
      .eq("club_id", id)
      .order("period", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false });
    const mine = data ?? [];
    const unpaidTotal = mine
      .filter((p) => p.status === "unpaid")
      .reduce((sum, p) => sum + p.amount, 0);

    return (
      <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
        <BgDecor />
        <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
          {backLink}
          {header}

          <div className="mb-6 grid grid-cols-2 gap-3">
            <StatCard
              icon={Receipt}
              label="전체 내역"
              value={`${mine.length}건`}
            />
            <StatCard
              icon={CircleDollarSign}
              label="미납액"
              value={formatWon(unpaidTotal)}
              tone={unpaidTotal > 0 ? "amber" : "lime"}
            />
          </div>

          <MyDuesList rows={mine} clubId={id} />
        </div>
      </div>
    );
  }

  // ── 운영진 뷰 (회장·총무) ─────────────────────────────────────
  const { data: payData } = await supabase
    .from("payments")
    .select("id, user_id, type, period, amount, status, requested_at")
    .eq("club_id", id)
    .order("period", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });
  const payRows = payData ?? [];

  // 프로필(이름·아바타)은 별도 조회 후 매핑한다.
  // payments엔 profiles로 가는 FK가 둘(user_id·created_by)이라 profiles(...) 임베드가
  // 모호(ambiguous)해서 쿼리 자체가 실패한다 → 임베드 대신 수동 조인.
  const userIds = [...new Set(payRows.map((r) => r.user_id))];
  const profileMap = new Map<
    string,
    { name: string; avatar_url: string | null }
  >();
  if (userIds.length > 0) {
    const { data: profs } = await supabase
      .from("profiles")
      .select("id, name, avatar_url")
      .in("id", userIds);
    for (const p of (profs ?? []) as {
      id: string;
      name: string;
      avatar_url: string | null;
    }[]) {
      profileMap.set(p.id, { name: p.name, avatar_url: p.avatar_url });
    }
  }
  const rows: RawPay[] = payRows.map((r) => ({
    ...r,
    profiles: profileMap.get(r.user_id) ?? null,
  }));
  const groups = groupByPeriod(rows);

  const totalPaid = rows
    .filter((r) => r.status === "paid")
    .reduce((s, r) => s + r.amount, 0);
  const totalUnpaid = rows
    .filter((r) => r.status === "unpaid")
    .reduce((s, r) => s + r.amount, 0);
  const unpaidCount = rows.filter((r) => r.status === "unpaid").length;

  // 운영진 본인 회비 — 전체 payments에서 내 행만 뽑는다(추가 쿼리 불필요).
  // 관리 콘솔에 섞여 있으면 자기 회비가 안 보인다는 혼란을 없애기 위해 별도 섹션으로 노출.
  const myRows: MyPay[] = rows
    .filter((r) => r.user_id === user.id)
    .map((r) => ({
      id: r.id,
      type: r.type,
      period: r.period,
      amount: r.amount,
      status: r.status,
      requested_at: r.requested_at,
    }));
  const myUnpaid = myRows
    .filter((p) => p.status === "unpaid")
    .reduce((sum, p) => sum + p.amount, 0);

  const { year, month } = kstYearMonth(new Date());
  const defaultPeriod = `${year}-${String(month).padStart(2, "0")}`;

  return (
    <div className="relative min-h-dvh overflow-hidden bg-[#f6f8f4] text-slate-900">
      <BgDecor />
      <div className="relative mx-auto w-full max-w-2xl px-4 py-8 sm:py-10">
        {backLink}
        {header}

        {/* 요약 */}
        <div className="mb-6 grid grid-cols-3 gap-3">
          <StatCard
            icon={TrendingUp}
            label="걷힌 회비"
            value={formatWon(totalPaid)}
            tone="lime"
          />
          <StatCard
            icon={CircleDollarSign}
            label="미납액"
            value={formatWon(totalUnpaid)}
            tone={totalUnpaid > 0 ? "amber" : "neutral"}
          />
          <StatCard
            icon={Receipt}
            label="미납 건수"
            value={`${unpaidCount}건`}
          />
        </div>

        {/* 내 회비 (운영진도 본인 납부 현황을 바로 확인) */}
        {myRows.length > 0 && (
          <section className="mb-6">
            <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
              <Wallet className="size-4 text-[#65a30d]" />
              내 회비
              {myUnpaid > 0 ? (
                <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-xs font-semibold text-amber-600">
                  미납 {formatWon(myUnpaid)}
                </span>
              ) : (
                <span className="rounded-full border border-[#84cc16]/30 bg-[#84cc16]/12 px-2 py-0.5 text-xs font-semibold text-[#4d7c0f]">
                  완납
                </span>
              )}
            </h2>
            <MyDuesList rows={myRows} clubId={id} />
          </section>
        )}

        {/* 월회비 부과 */}
        <section className="mb-6 rounded-3xl border border-slate-900/[0.06] bg-white/80 p-5 shadow-sm backdrop-blur-xl sm:p-6">
          <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-slate-700">
            <CircleDollarSign className="size-4 text-[#65a30d]" />
            월회비 부과
          </h2>
          <ChargeForm clubId={id} defaultPeriod={defaultPeriod} />
        </section>

        {/* 정산 관리 */}
        <section>
          <h2 className="mb-3 flex items-center gap-2 px-1 text-sm font-bold text-slate-700">
            <Receipt className="size-4 text-[#65a30d]" />
            정산 현황
            {groups.length > 0 && (
              <span className="rounded-full bg-slate-900/[0.06] px-2 py-0.5 text-xs font-semibold text-slate-500">
                {groups.length}
              </span>
            )}
          </h2>
          {groups.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-slate-900/15 bg-white/60 px-6 py-14 text-center backdrop-blur-sm">
              <span className="mx-auto flex size-14 items-center justify-center rounded-2xl bg-[#84cc16]/12 text-[#4d7c0f]">
                <Receipt className="size-7" />
              </span>
              <p className="mt-4 text-sm font-medium text-slate-600">
                아직 부과된 회비가 없어요
              </p>
              <p className="mt-1 text-sm text-slate-400">
                위에서 이번 달 월회비를 부과해보세요.
              </p>
            </div>
          ) : (
            <PaymentManager clubId={id} groups={groups} />
          )}
        </section>
      </div>
    </div>
  );
}
