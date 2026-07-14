"use client";

import { useEffect, useState } from "react";

/**
 * Kakao Maps JS SDK 로더.
 *
 * - 스크립트는 페이지당 한 번만 삽입한다(모듈 레벨 프로미스로 dedup).
 * - `autoload=false` + `libraries=services`(장소 검색)로 로드 후 `kakao.maps.load()`로 초기화.
 * - 키(NEXT_PUBLIC_KAKAO_MAP_KEY) 미설정/로드 실패 시 error 상태로 알려, 소비 컴포넌트가
 *   지도 없이 폴백(텍스트 입력만) 렌더할 수 있게 한다.
 *
 * ⚠️ 카카오 콘솔에서 지도 사용 도메인(localhost:4000 · 프로덕션)을 웹 플랫폼에 등록해야 타일이 로드된다.
 */

export type KakaoLoadState = { ready: boolean; error: string | null };

let loadPromise: Promise<void> | null = null;

function loadKakao(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("no-window"));
  }
  if (window.kakao?.maps) return Promise.resolve();
  if (loadPromise) return loadPromise;

  const key = process.env.NEXT_PUBLIC_KAKAO_MAP_KEY;
  if (!key) return Promise.reject(new Error("no-key"));

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?appkey=${key}&autoload=false&libraries=services`;
    script.async = true;
    script.onload = () => window.kakao.maps.load(() => resolve());
    script.onerror = () => {
      loadPromise = null; // 재시도 가능하게
      reject(new Error("load-failed"));
    };
    document.head.appendChild(script);
  });
  return loadPromise;
}

export function useKakaoLoader(): KakaoLoadState {
  const [state, setState] = useState<KakaoLoadState>({
    ready: false,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    loadKakao().then(
      () => alive && setState({ ready: true, error: null }),
      (e: Error) => {
        if (!alive) return;
        const error =
          e.message === "no-key"
            ? "지도 키가 설정되지 않았어요"
            : "지도를 불러오지 못했어요";
        setState({ ready: false, error });
      },
    );
    return () => {
      alive = false;
    };
  }, []);

  return state;
}
