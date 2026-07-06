import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로에서 실행:
     * - _next/static, _next/image (정적 파일)
     * - favicon.ico, 이미지 등 정적 에셋
     * 필요 시 여기에 예외를 추가한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
