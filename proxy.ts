import { type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * 다음을 제외한 모든 요청 경로에서 실행:
     * - _next/static, _next/image (정적 파일)
     * - favicon.ico, 이미지 등 정적 에셋
     * - manifest.webmanifest, sw.js — PWA 필수 파일이라 반드시 공개여야 한다.
     *   ⚠️ manifest 요청은 기본적으로 자격증명 없이(쿠키 미포함) 나가므로, 여기서 빼지 않으면
     *   로그인 상태여도 미들웨어가 /login으로 307 리다이렉트 → 브라우저가 manifest를 못 읽는다.
     *   그러면 display:standalone이 적용되지 않아 iOS 홈 화면 앱이 standalone으로 안 뜨고,
     *   standalone이 아니면 apple-touch-startup-image(스플래시)도 표시되지 않는다.
     *   sw.js도 같은 이유로 공개(막히면 서비스워커 등록 실패 → 푸시 수신 불가).
     * 필요 시 여기에 예외를 추가한다.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
