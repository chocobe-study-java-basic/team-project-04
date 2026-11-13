// @vitest-environment jsdom

import '../../../../tests/setup-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePlaces } from '../data/samplePlaces';
import { loadKakaoMaps } from '../lib/loadKakaoMaps';
import type { KakaoMap, KakaoMapsApi } from '../types/kakaoMap.type';
import KakaoPlaceMap from './KakaoPlaceMap';

vi.mock('../lib/loadKakaoMaps', () => ({ loadKakaoMaps: vi.fn() }));

function createFakeSdk() {
  let element: HTMLElement;
  const map = {
    setBounds: vi.fn(), setCenter: vi.fn(), setLevel: vi.fn(),
    panTo: vi.fn(), relayout: vi.fn(), addControl: vi.fn(),
  };
  const api = {
    Map: vi.fn(function (container: HTMLElement) { element = container; return map; }),
    LatLng: vi.fn(function (latitude: number, longitude: number) {
      return { getLat: () => latitude, getLng: () => longitude };
    }),
    LatLngBounds: vi.fn(function () { return { extend: vi.fn() }; }),
    ZoomControl: vi.fn(function () { return {}; }),
    ControlPosition: { RIGHT: 1 },
    CustomOverlay: class {
      constructor(private options: { content: HTMLElement }) {}
      setMap(value: KakaoMap | null) {
        if (value) element.appendChild(this.options.content);
        else this.options.content.remove();
      }
      setZIndex() {}
    },
  } as unknown as KakaoMapsApi;
  return { api, map };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => {
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('카카오 장소 지도', () => {
  it('SDK 실패를 안내하고 다시 불러오면 지도를 표시한다', async () => {
    const { api } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(api);
    const user = userEvent.setup();
    render(<KakaoPlaceMap places={samplePlaces} selectedId={null} onSelect={vi.fn()} />);
    expect(await screen.findByRole('alert')).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '지도 다시 불러오기' }));
    expect(await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' })).toBeTruthy();
    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('마커 선택을 전달하고 카드 선택과 필터 변경을 지도에 반영한다', async () => {
    const { api, map } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockResolvedValue(api);
    const onSelect = vi.fn();
    const user = userEvent.setup();
    const view = render(<KakaoPlaceMap places={samplePlaces} selectedId={null} onSelect={onSelect} />);
    await user.click(await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' }));
    expect(onSelect).toHaveBeenCalledWith(1);
    view.rerender(<KakaoPlaceMap places={samplePlaces} selectedId={1} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: '눈마루 리조트 지도에서 선택' }).getAttribute('aria-pressed')).toBe('true');
    expect(map.panTo).toHaveBeenCalled();
    view.rerender(<KakaoPlaceMap places={[samplePlaces[2]]} selectedId={null} onSelect={onSelect} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: '눈마루 리조트 지도에서 선택' })).toBeNull());
    expect(screen.getByRole('button', { name: '파도 서프 스테이션 지도에서 선택' })).toBeTruthy();
    view.rerender(<KakaoPlaceMap places={[]} selectedId={null} onSelect={onSelect} />);
    expect(screen.queryByRole('button', { name: '파도 서프 스테이션 지도에서 선택' })).toBeNull();
    expect(screen.getByText('조건에 맞는 장소가 없어요.')).toBeTruthy();
  });

  it('SDK 로딩 중 화면을 떠나면 지도를 생성하지 않는다', async () => {
    const { api } = createFakeSdk();
    let resolve!: (api: KakaoMapsApi) => void;
    vi.mocked(loadKakaoMaps).mockReturnValue(new Promise(value => { resolve = value; }));
    const view = render(<KakaoPlaceMap places={samplePlaces} selectedId={null} onSelect={vi.fn()} />);
    view.unmount();
    await act(async () => { resolve(api); });
    expect(api.Map).not.toHaveBeenCalled();
  });
});
