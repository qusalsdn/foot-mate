// Kakao Maps JS SDK 최소 타입 선언 (우리가 쓰는 API 표면만).
// SDK는 window.kakao 로 노출되며, ?autoload=false 로 로드 후 kakao.maps.load(cb) 로 초기화한다.
// 공식 @types 가 없어 커뮤니티 패키지 대신 자체 선언으로 self-contained 하게 유지한다.

declare global {
  namespace kakao.maps {
    function load(callback: () => void): void;

    class LatLng {
      constructor(lat: number, lng: number);
      getLat(): number;
      getLng(): number;
    }

    interface MapOptions {
      center: LatLng;
      level?: number;
      draggable?: boolean;
    }

    class Map {
      constructor(container: HTMLElement, options: MapOptions);
      setCenter(latlng: LatLng): void;
      panTo(latlng: LatLng): void;
      relayout(): void;
    }

    interface MarkerOptions {
      position: LatLng;
      map?: Map;
      draggable?: boolean;
    }

    class Marker {
      constructor(options: MarkerOptions);
      setPosition(latlng: LatLng): void;
      setMap(map: Map | null): void;
      getPosition(): LatLng;
    }

    namespace event {
      function addListener(
        target: unknown,
        type: string,
        handler: (...args: unknown[]) => void,
      ): void;
    }

    namespace services {
      enum Status {
        OK = "OK",
        ZERO_RESULT = "ZERO_RESULT",
        ERROR = "ERROR",
      }

      interface PlacesSearchResultItem {
        id: string;
        place_name: string;
        address_name: string;
        road_address_name: string;
        phone: string;
        category_name: string;
        x: string; // 경도(lng)
        y: string; // 위도(lat)
      }

      class Places {
        keywordSearch(
          keyword: string,
          callback: (data: PlacesSearchResultItem[], status: Status) => void,
        ): void;
      }
    }
  }

  interface Window {
    kakao: {
      maps: typeof kakao.maps;
    };
  }
}

export {};
