"use client";

import { useState } from "react";
import Image from "next/image";
import { CalendarDays, Users, Wallet } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

const FEATURES = [
  { icon: CalendarDays, label: "매치 일정 · 참석 투표" },
  { icon: Wallet, label: "회비 정산 · 미납 관리" },
  { icon: Users, label: "회원 · 커뮤니티 · 알림" },
] as const;

export default function LoginPage() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function signInWithKakao() {
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "kakao",
      options: {
        redirectTo: `${location.origin}/auth/callback`,
        // 이메일(account_email)은 비즈 앱 필요 → 요청하지 않음.
        // 닉네임·프로필사진만 받는다 (카카오 콘솔 동의항목과 일치해야 함).
        scopes: "profile_nickname profile_image",
        // prompt=login: 카카오 세션이 남아 있어도 매번 로그인 화면을 다시 띄운다.
        // (없으면 로그아웃 후 재로그인 시 카카오 세션으로 자동 통과됨)
        queryParams: { prompt: "login" },
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 성공 시 카카오로 리다이렉트되므로 별도 처리 불필요
  }

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden bg-[#f6f8f4] px-5 py-10 text-slate-900">
      {/* 배경: 떠다니는 그라디언트 오브 */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-40 left-1/2 h-[42rem] w-[42rem] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,#a3e635_0%,transparent_65%)] opacity-30 blur-3xl [animation:footmate-drift_16s_ease-in-out_infinite]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -bottom-32 -right-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,#34d399_0%,transparent_65%)] opacity-20 blur-3xl [animation:footmate-drift_20s_ease-in-out_infinite_reverse]"
      />

      {/* 배경: 미세한 그리드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.5] [background-image:linear-gradient(#0f172a0d_1px,transparent_1px),linear-gradient(90deg,#0f172a0d_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(ellipse_at_center,#000_30%,transparent_72%)]"
      />
      {/* 배경: 위·아래 페이드 */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,#f6f8f4_0%,transparent_22%,transparent_78%,#f6f8f4_100%)]"
      />

      {/* 카드 */}
      <div className="relative w-full max-w-sm rounded-3xl border border-slate-900/[0.06] bg-white/80 p-8 shadow-[0_20px_60px_-15px_rgba(15,23,42,0.2)] backdrop-blur-xl">
        {/* 카드 상단 하이라이트 라인 */}
        <div
          aria-hidden
          className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-[#84cc16]/70 to-transparent"
        />

        <div className="flex flex-col items-center">
          {/* 로고 */}
          <div className="relative mb-6 [animation:footmate-float_6s_ease-in-out_infinite]">
            <div
              aria-hidden
              className="absolute inset-0 rounded-[28%] bg-[#a3e635] blur-2xl [animation:footmate-glow_4s_ease-in-out_infinite]"
            />
            <Image
              src="/app-icon-192.png"
              alt="foot-mate"
              width={88}
              height={88}
              priority
              className="relative rounded-[28%] shadow-xl shadow-slate-900/20 ring-1 ring-slate-900/10"
            />
          </div>

          {/* 워드마크 */}
          <h1 className="text-[2rem] font-bold leading-none tracking-tight text-slate-900">Foot Mate</h1>
          <p className="mt-3 text-center text-sm leading-relaxed text-slate-500">
            우리 축구 동호회를 한곳에서.
            <br />
            카카오로 3초 만에 시작하세요.
          </p>
        </div>

        {/* 기능 하이라이트 */}
        <ul className="mt-7 grid gap-2">
          {FEATURES.map(({ icon: Icon, label }) => (
            <li
              key={label}
              className="group flex items-center gap-3 rounded-2xl border border-slate-900/[0.06] bg-slate-900/[0.015] px-3.5 py-2.5 text-sm text-slate-600 transition-colors hover:border-[#84cc16]/40 hover:bg-[#84cc16]/[0.06]"
            >
              <span className="flex size-8 shrink-0 items-center justify-center rounded-xl bg-[#84cc16]/12 text-[#4d7c0f] transition-transform group-hover:scale-110">
                <Icon className="size-4" />
              </span>
              {label}
            </li>
          ))}
        </ul>

        {/* 카카오 로그인 */}
        <Button
          onClick={signInWithKakao}
          disabled={loading}
          className="relative mt-7 h-12 w-full gap-2 overflow-hidden rounded-2xl bg-[#FEE500] text-base font-semibold text-[#191600] shadow-lg shadow-[#FEE500]/30 transition-transform hover:bg-[#FADA00] hover:not-disabled:-translate-y-0.5"
        >
          {loading ? (
            "이동 중…"
          ) : (
            <>
              {/* 광택 스윕 */}
              <span
                aria-hidden
                className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 skew-x-[-20deg] bg-white/50 blur-md [animation:footmate-shimmer_3.5s_ease-in-out_infinite]"
              />
              <svg viewBox="0 0 24 24" className="size-5" fill="currentColor" aria-hidden>
                <path d="M12 3C6.48 3 2 6.48 2 10.8c0 2.76 1.86 5.19 4.66 6.57-.15.53-.96 3.3-.99 3.52 0 0-.02.17.09.23.11.07.24.02.24.02.32-.04 3.68-2.41 4.26-2.82.56.08 1.14.12 1.74.12 5.52 0 10-3.48 10-7.66C22.34 6.48 17.52 3 12 3z" />
              </svg>
              카카오로 시작하기
            </>
          )}
        </Button>

        {error && <p className="mt-3 text-center text-sm text-red-500">{error}</p>}

        <p className="mt-6 text-center text-xs leading-relaxed text-slate-400">
          로그인하면 서비스 이용약관 및 개인정보처리방침에
          <br />
          동의하는 것으로 간주됩니다.
        </p>
      </div>

      {/* 하단 브랜딩 */}
      <p className="relative mt-8 text-center text-xs font-medium tracking-wide text-slate-400">동호회 운영, 이제 앱 하나로.</p>
    </div>
  );
}
