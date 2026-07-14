import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import type { Database } from "./database.types";

/**
 * 매 요청마다 auth 세션(토큰)을 갱신하고 쿠키를 동기화한다.
 * middleware.ts에서 호출한다.
 *
 * 주의: createServerClient 생성 직후 반드시 supabase.auth.getUser()를 호출해야 한다.
 * 이 호출이 만료된 토큰을 갱신하기 때문이다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  // 공개 경로: 로그인 페이지·인증 콜백, 그리고 푸시 발송 라우트(외부 웹훅이 세션 없이 호출 —
  // 자체 시크릿으로 보호됨). 그 외에는 로그인 필요.
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth") ||
    pathname.startsWith("/api/push");

  // getUser()가 토큰을 회전시켰다면 그 갱신 쿠키가 supabaseResponse에 담긴다.
  // 리다이렉트는 새 response 객체라 쿠키를 자동 상속하지 않으므로, 여기서
  // 명시적으로 복사해야 회전된 리프레시 토큰이 유실되지 않는다(유실 시 브라우저가
  // 소비된 옛 토큰을 계속 들고 있다가 다음 갱신에 실패 → 로그아웃).
  const redirectTo = (to: string) => {
    const url = request.nextUrl.clone();
    url.pathname = to;
    const res = NextResponse.redirect(url);
    supabaseResponse.cookies.getAll().forEach((c) => res.cookies.set(c));
    return res;
  };

  // 미로그인 → 보호 경로 접근 시 로그인으로
  if (!user && !isPublic) {
    return redirectTo("/login");
  }

  // 로그인 상태 → 로그인 페이지 접근 시 홈으로
  if (user && pathname.startsWith("/login")) {
    return redirectTo("/");
  }

  return supabaseResponse;
}
