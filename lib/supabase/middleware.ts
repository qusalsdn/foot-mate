import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * 매 요청마다 auth 세션(토큰)을 갱신하고 쿠키를 동기화한다.
 * middleware.ts에서 호출한다.
 *
 * 주의: createServerClient 생성 직후 반드시 supabase.auth.getUser()를 호출해야 한다.
 * 이 호출이 만료된 토큰을 갱신하기 때문이다.
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
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

  // 공개 경로: 로그인 페이지와 인증 콜백. 그 외에는 로그인 필요.
  const { pathname } = request.nextUrl;
  const isPublic =
    pathname.startsWith("/login") || pathname.startsWith("/auth");

  // 미로그인 → 보호 경로 접근 시 로그인으로
  if (!user && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  // 로그인 상태 → 로그인 페이지 접근 시 홈으로
  if (user && pathname.startsWith("/login")) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}
