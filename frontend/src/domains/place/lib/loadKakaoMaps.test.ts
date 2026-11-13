// @vitest-environment jsdom

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { KakaoMapsApi } from '../types/kakaoMap.type';

beforeEach(() => {
  vi.resetModules();
  vi.stubEnv('NEXT_PUBLIC_KAKAO_MAP_JS_KEY', 'test-key');
  delete window.kakao;
});
afterEach(() => {
  document.getElementById('outpick-kakao-map-sdk')?.remove();
  delete window.kakao;
  vi.unstubAllEnvs();
  vi.useRealTimers();
});

describe('카카오 지도 SDK 로더', () => {
  it('키가 없으면 외부 요청 없이 실패한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_KAKAO_MAP_JS_KEY', '');
    const { loadKakaoMaps } = await import('./loadKakaoMaps');
    await expect(loadKakaoMaps()).rejects.toThrow('지도 키 설정이 필요합니다.');
    expect(document.getElementById('outpick-kakao-map-sdk')).toBeNull();
  });

  it('동시에 요청해도 스크립트를 한 번만 추가하고 SDK 준비를 기다린다', async () => {
    const { loadKakaoMaps } = await import('./loadKakaoMaps');
    const first = loadKakaoMaps();
    const second = loadKakaoMaps();
    expect(first).toBe(second);
    expect(document.querySelectorAll('#outpick-kakao-map-sdk')).toHaveLength(1);
    const api = { Map: vi.fn(), load: (ready: () => void) => ready() } as unknown as KakaoMapsApi;
    window.kakao = { maps: api };
    document.getElementById('outpick-kakao-map-sdk')!.dispatchEvent(new Event('load'));
    await expect(first).resolves.toBe(api);
  });

  it('시간 초과 후에는 실패 스크립트를 제거하고 재시도를 허용한다', async () => {
    vi.useFakeTimers();
    const { loadKakaoMaps } = await import('./loadKakaoMaps');
    const first = loadKakaoMaps();
    const failed = expect(first).rejects.toThrow('지도 응답 시간이 초과되었습니다.');
    await vi.advanceTimersByTimeAsync(12_000);
    await failed;
    expect(document.getElementById('outpick-kakao-map-sdk')).toBeNull();
    const retry = loadKakaoMaps();
    const retryFailed = expect(retry).rejects.toThrow('지도 스크립트를 불러오지 못했습니다.');
    document.getElementById('outpick-kakao-map-sdk')!.dispatchEvent(new Event('error'));
    await retryFailed;
  });
});
