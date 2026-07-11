"use client";

import { useSyncExternalStore, type ReactNode } from "react";
import { createPortal } from "react-dom";

// 서버 스냅샷은 false, 클라이언트 스냅샷은 true → 하이드레이션 후에만 포탈을 렌더.
// (useState+useEffect "mounted" 패턴은 effect 내 동기 setState라 린트가 막는다.)
const emptySubscribe = () => () => {};
function useIsClient() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

/**
 * 모달/다이얼로그를 `document.body`에 포탈로 렌더링한다.
 *
 * `position: fixed`는 조상 중 `transform`/`filter`/`backdrop-filter`를 가진
 * 요소가 있으면 그 요소를 컨테이닝 블록으로 삼아 뷰포트가 아니라 해당 요소
 * 영역에 갇힌다. 이 앱은 글래스 카드가 `backdrop-blur`를 곳곳에 쓰므로,
 * 모달은 반드시 이 컴포넌트로 감싸 조상의 backdrop-filter 밖(body)에서 뜨게 한다.
 */
export function ModalPortal({ children }: { children: ReactNode }) {
  if (!useIsClient()) return null;
  return createPortal(children, document.body);
}
