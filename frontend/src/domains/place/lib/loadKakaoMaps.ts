import type { KakaoMapsApi } from '../types/kakaoMap.type';

let sdkPromise: Promise<KakaoMapsApi> | null = null;

/** SDK는 페이지 내에서 한 번만 로드하고, 실패 시 다음 요청에서 다시 시도합니다. */
export function loadKakaoMaps(): Promise<KakaoMapsApi> {
  const appKey = process.env.NEXT_PUBLIC_KAKAO_MAP_JS_KEY?.trim();
  if (!appKey) return Promise.reject(new Error('지도 키 설정이 필요합니다.'));
  if (window.kakao?.maps?.Map) return Promise.resolve(window.kakao.maps);
  if (sdkPromise) return sdkPromise;

  const pending = new Promise<KakaoMapsApi>((resolve, reject) => {
    const script = document.createElement('script');
    script.id = 'outpick-kakao-map-sdk';
    script.async = true;
    script.src = `https://dapi.kakao.com/v2/maps/sdk.js?${new URLSearchParams({ appkey: appKey, autoload: 'false' })}`;
    let settled = false;

    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timeout);
      script.onload = null;
      script.onerror = null;
      if (error) {
        script.remove();
        reject(error);
      } else if (window.kakao?.maps.Map) {
        resolve(window.kakao.maps);
      } else {
        script.remove();
        reject(new Error('지도 초기화에 실패했습니다.'));
      }
    }

    const timeout = window.setTimeout(() => finish(new Error('지도 응답 시간이 초과되었습니다.')), 12_000);
    script.onerror = () => finish(new Error('지도 스크립트를 불러오지 못했습니다.'));
    script.onload = () => {
      try {
        if (!window.kakao?.maps?.load) {
          finish(new Error('지도 사용 설정을 확인해 주세요.'));
          return;
        }
        window.kakao.maps.load(() => finish());
      } catch {
        finish(new Error('지도 초기화에 실패했습니다.'));
      }
    };
    document.head.appendChild(script);
  });
  sdkPromise = pending.catch(error => {
    sdkPromise = null;
    throw error;
  });
  return sdkPromise;
}
