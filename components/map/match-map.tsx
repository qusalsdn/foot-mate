"use client";

import { useEffect, useRef } from "react";
import { MapPinned } from "lucide-react";
import { useKakaoLoader } from "./use-kakao-loader";

/**
 * 매치 상세용 읽기 전용 지도. 좌표에 마커 하나를 찍고 중심을 맞춘다.
 * 키 미설정/로드 실패 시 지도를 숨기고(외부 링크는 상세 페이지가 별도로 노출) 조용히 폴백한다.
 */
export function MatchMap({
  lat,
  lng,
}: {
  lat: number;
  lng: number;
  name?: string;
}) {
  const { ready, error } = useKakaoLoader();
  const containerRef = useRef<HTMLDivElement>(null);
  const created = useRef(false);

  useEffect(() => {
    if (!ready || created.current || !containerRef.current || !window.kakao) {
      return;
    }
    const { kakao } = window;
    const pos = new kakao.maps.LatLng(lat, lng);
    const map = new kakao.maps.Map(containerRef.current, {
      center: pos,
      level: 4,
    });
    new kakao.maps.Marker({ position: pos, map });
    created.current = true;
  }, [ready, lat, lng]);

  if (error) return null;

  return (
    <div className="relative h-52 w-full overflow-hidden rounded-2xl border border-slate-900/[0.06] bg-slate-100">
      <div ref={containerRef} className="size-full" />
      {!ready && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-sm text-slate-400">
          <MapPinned className="size-4 animate-pulse" />
          지도 불러오는 중…
        </div>
      )}
    </div>
  );
}
