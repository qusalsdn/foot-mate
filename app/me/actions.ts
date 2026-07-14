"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { profileSchema } from "@/lib/schemas/profile";

export type UpdateProfileResult = { ok?: true; error?: string };

/**
 * 내 프로필(이름·휴대폰·사진 URL) 수정.
 * Zod로 서버 재검증 후 본인 profiles 행만 update (RLS "profile self write"가 격리).
 * 아바타 파일 업로드는 클라이언트에서 Storage로 직접 처리하고, 여기선 결과 URL만 저장한다.
 */
export async function updateProfile(
  values: unknown,
): Promise<UpdateProfileResult> {
  const parsed = profileSchema.safeParse(values);
  if (!parsed.success) {
    return { error: "입력값을 확인해주세요" };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      name: parsed.data.name,
      phone: parsed.data.phone || null,
      avatar_url: parsed.data.avatarUrl || null,
    })
    .eq("id", user.id);

  if (error) {
    return { error: error.message };
  }

  // 홈 헤더/인사말과 내 프로필 화면의 캐시 갱신
  revalidatePath("/");
  revalidatePath("/me");
  return { ok: true };
}

export type SignOutOthersResult = { ok?: true; error?: string };

/**
 * 다른 기기 모두 로그아웃 — 현재 기기 세션은 유지하고 나머지 세션의
 * 리프레시 토큰만 폐기한다(`scope: "others"`). 기기 분실·공용 PC 로그인
 * 방치 시 사용자가 직접 전 기기를 정리하는 용도.
 *
 * `others`는 로컬 세션 쿠키를 건드리지 않으므로 현재 브라우저는 그대로
 * 로그인 상태를 유지한다(전체 로그아웃은 `/auth/signout`).
 */
export async function signOutOtherDevices(): Promise<SignOutOthersResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { error: "로그인이 필요합니다" };
  }

  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) {
    return { error: error.message };
  }

  return { ok: true };
}
