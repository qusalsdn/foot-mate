"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

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
      },
    });
    if (error) {
      setError(error.message);
      setLoading(false);
    }
    // 성공 시 카카오로 리다이렉트되므로 별도 처리 불필요
  }

  return (
    <div className="flex min-h-dvh items-center justify-center px-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">foot-mate</CardTitle>
          <CardDescription>
            축구 동호회 관리, 카카오로 간편하게 시작하세요
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-3">
          <Button
            onClick={signInWithKakao}
            disabled={loading}
            className="w-full bg-[#FEE500] text-[#191600] hover:bg-[#FADA00]"
          >
            {loading ? "이동 중…" : "카카오로 시작하기"}
          </Button>
          {error && <p className="text-destructive text-sm text-center">{error}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
