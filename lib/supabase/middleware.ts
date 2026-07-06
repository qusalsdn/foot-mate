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

  // 비로그인 사용자를 보호된 경로에서 로그인으로 보내는 로직은 여기에 추가.
  // 예: if (!user && !request.nextUrl.pathname.startsWith("/login")) { ... }
  void user;

  return supabaseResponse;
}
