import { createClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

/**
 * 서버 전용 관리자 클라이언트 — service_role(secret) 키로 RLS 를 우회한다.
 * 절대 클라이언트 번들에 들어가면 안 된다(라우트 핸들러/서버에서만 import).
 * 용도: 푸시 발송 시 여러 사용자의 push_subscriptions 를 조회(본인 것만 보는 RLS 우회).
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error("SUPABASE_SERVICE_ROLE_KEY(또는 URL)가 설정되지 않았습니다");
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
