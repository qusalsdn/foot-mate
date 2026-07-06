import { createBrowserClient } from "@supabase/ssr";

/**
 * 클라이언트 컴포넌트("use client")에서 사용하는 Supabase 클라이언트.
 * anon 키만 사용한다 (RLS로 보호됨).
 */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  );
}
