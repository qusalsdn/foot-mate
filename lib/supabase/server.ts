import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "./database.types";

/**
 * 서버 컴포넌트 / Route Handler / Server Action 에서 사용하는 Supabase 클라이언트.
 * Next.js 16의 cookies()는 async이므로 이 함수도 async.
 */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options),
            );
          } catch {
            // 서버 컴포넌트에서 호출된 경우 set이 무시된다.
            // 세션 갱신은 middleware가 담당하므로 안전하게 무시한다.
          }
        },
      },
    },
  );
}
