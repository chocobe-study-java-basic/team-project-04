// @vitest-environment jsdom

import '../../../../../tests/setup-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { samplePlaces } from '../../data/samplePlaces';
import { loadKakaoMaps } from '../../lib/loadKakaoMaps';
import type { KakaoMap, KakaoMapsApi } from '../../types/kakaoMap.type';
import KakaoPlaceMap from './KakaoPlaceMap';

vi.mock('../../lib/loadKakaoMaps', () => ({ loadKakaoMaps: vi.fn() }));

function createFakeSdk() {
  let element: HTMLElement;
  const handlers = new Map<string, () => void>();
  const map = {
    getLevel: vi.fn(() => 8),
    getCenter: vi.fn(() => ({ getLat: () => 37, getLng: () => 128 })),
    getBounds: vi.fn(() => ({
      getSouthWest: () => ({ getLat: () => 37, getLng: () => 127 }),
      getNorthEast: () => ({ getLat: () => 38, getLng: () => 129 }),
    })),
    setBounds: vi.fn(),
    setCenter: vi.fn<KakaoMap['setCenter']>(() => {
      handlers.get('bounds_changed')?.();
      handlers.get('idle')?.();
    }),
    setLevel: vi.fn<KakaoMap['setLevel']>(() => {
      handlers.get('zoom_start')?.();
      handlers.get('bounds_changed')?.();
      handlers.get('idle')?.();
    }),
    relayout: vi.fn(), addControl: vi.fn(),
  };
  const api = {
    event: {
      addListener: vi.fn((_map, name, handler) => handlers.set(name, handler)),
      removeListener: vi.fn((_map, name) => handlers.delete(name)),
    },
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
  return { api, map, handlers };
}

beforeEach(() => {
  vi.stubGlobal('ResizeObserver', class { observe() {} disconnect() {} });
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('카카오 장소 지도', () => {
  it('SDK 실패를 안내하고 다시 불러오면 지도를 표시한다', async () => {
    const { api } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockRejectedValueOnce(new Error('failed')).mockResolvedValueOnce(api);
    const user = userEvent.setup();
    render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={vi.fn()} />);
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
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} />);
    await user.click(await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' }));
    expect(onSelect).toHaveBeenCalledWith({ id: 1, source: 'map' });
    view.rerender(<KakaoPlaceMap places={samplePlaces} selection={{ id: 3, source: 'map' }} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: '파도 서프 스테이션 지도에서 선택' }).getAttribute('aria-pressed')).toBe('true');
    expect(map.setCenter).not.toHaveBeenCalled();
    view.rerender(<KakaoPlaceMap places={samplePlaces} selection={{ id: 1, source: 'list' }} onSelect={onSelect} />);
    expect(screen.getByRole('button', { name: '눈마루 리조트 지도에서 선택' }).getAttribute('aria-pressed')).toBe('true');
    expect(map.setCenter).not.toHaveBeenCalled();
    view.rerender(<KakaoPlaceMap places={[samplePlaces[2]]} selection={null} onSelect={onSelect} />);
    await waitFor(() => expect(screen.queryByRole('button', { name: '눈마루 리조트 지도에서 선택' })).toBeNull());
    expect(screen.getByRole('button', { name: '파도 서프 스테이션 지도에서 선택' })).toBeTruthy();
    view.rerender(<KakaoPlaceMap places={[]} selection={null} onSelect={onSelect} />);
    expect(screen.queryByRole('button', { name: '파도 서프 스테이션 지도에서 선택' })).toBeNull();
    expect(screen.queryByText('조건에 맞는 장소가 없어요.')).toBeNull();
  });

  it('화면 밖의 장소를 카드에서 선택하면 지도만 이동하고 이후 사용자가 움직일 때 검색한다', async () => {
    const { api, map, handlers } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockResolvedValue(api);
    const onBoundsChange = vi.fn();
    const onSelect = vi.fn();
    vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
    vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} onBoundsChange={onBoundsChange} />);
    await screen.findByRole('button', { name: '파도 서프 스테이션 지도에서 선택' });
    vi.useFakeTimers();
    view.rerender(<KakaoPlaceMap places={samplePlaces} selection={{ id: 3, source: 'list' }} onSelect={onSelect} onBoundsChange={onBoundsChange} />);
    expect(map.setCenter.mock.calls.at(-1)?.[0].getLat()).toBe(38.075);
    act(() => { handlers.get('idle')!(); vi.advanceTimersByTime(300); });
    expect(onBoundsChange).not.toHaveBeenCalled();

    for (const [index, gesture] of ['dragstart', 'zoom_start'].entries()) {
      act(() => {
        handlers.get(gesture)!();
        handlers.get('bounds_changed')!();
        handlers.get('idle')!();
        vi.advanceTimersByTime(299);
      });
      expect(onBoundsChange).toHaveBeenCalledTimes(index);
      act(() => { vi.advanceTimersByTime(1); });
      expect(onBoundsChange).toHaveBeenCalledTimes(index + 1);
    }
  });

  it('SDK 로딩 중 화면을 떠나면 지도를 생성하지 않는다', async () => {
    const { api } = createFakeSdk();
    let resolve!: (api: KakaoMapsApi) => void;
    vi.mocked(loadKakaoMaps).mockReturnValue(new Promise(value => { resolve = value; }));
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={vi.fn()} />);
    view.unmount();
    await act(async () => { resolve(api); });
    expect(api.Map).not.toHaveBeenCalled();
  });

  it('연속 이동은 마지막 idle 이후 한 번 검색하고 결과 변경으로 지도를 재조정하지 않는다', async () => {
    const { api, map, handlers } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockResolvedValue(api);
    const onBoundsChange = vi.fn();
    const onSelect = vi.fn();
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} onBoundsChange={onBoundsChange} />);
    await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' });
    act(() => { handlers.get('dragstart')!(); handlers.get('idle')!(); handlers.get('bounds_changed')!(); });
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(onBoundsChange).not.toHaveBeenCalled();
    act(() => { handlers.get('idle')!(); handlers.get('idle')!(); });
    await waitFor(() => expect(onBoundsChange).toHaveBeenCalledExactlyOnceWith(
      { south: 37, west: 127, north: 38, east: 129 }, { lat: 37, lng: 128, level: 8 }
    ));
    view.rerender(<KakaoPlaceMap places={[]} selection={null} onSelect={onSelect} onBoundsChange={onBoundsChange} />);
    expect(map.setBounds).not.toHaveBeenCalled();
    expect(map.setCenter).not.toHaveBeenCalled();
    act(() => { handlers.get('dragstart')!(); handlers.get('idle')!(); });
    view.unmount();
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(onBoundsChange).toHaveBeenCalledTimes(1);
    expect(handlers.size).toBe(0);
    width.mockRestore(); height.mockRestore();
  });

  it('공유된 중심과 확대 수준으로 생성하고 URL 변경 시 같은 지도를 이동한다', async () => {
    const { api, map } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockResolvedValue(api);
    const onSelect = vi.fn();
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} view={{ lat: 37, lng: 128, level: 8 }} />);
    await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' });
    const options = vi.mocked(api.Map).mock.calls[0][1];
    expect(options.center.getLat()).toBe(37);
    expect(options.center.getLng()).toBe(128);
    expect(options.level).toBe(8);
    expect(map.setCenter).not.toHaveBeenCalled();
    view.rerender(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} view={{ lat: 38, lng: 129, level: 10 }} />);
    expect(map.setLevel).toHaveBeenCalledWith(10);
    expect(map.setCenter.mock.calls.at(-1)?.[0].getLat()).toBe(38);
    expect(api.Map).toHaveBeenCalledTimes(1);
    view.rerender(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={onSelect} view={null} />);
    expect(map.setLevel).toHaveBeenLastCalledWith(11);
    expect(map.setCenter.mock.calls.at(-1)?.[0].getLat()).toBe(37.6);
  });

  it.each([true, false])('숨겨진 모바일 지도가 나타날 때 검색 범위가 저장됐는지(%s)에 따라 초기 검색을 처리한다', async hasSearchBounds => {
    const { api, map } = createFakeSdk();
    vi.mocked(loadKakaoMaps).mockResolvedValue(api);
    let resize!: () => void;
    vi.stubGlobal('ResizeObserver', class {
      constructor(callback: () => void) { resize = callback; }
      observe() {} disconnect() {}
    });
    const width = vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(600);
    const height = vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
    const onBoundsChange = vi.fn();
    const view = render(<KakaoPlaceMap places={samplePlaces} selection={null} onSelect={vi.fn()} view={{ lat: 37.375, lng: 128.525, level: 9 }} hasSearchBounds={hasSearchBounds} onBoundsChange={onBoundsChange} />);
    await screen.findByRole('button', { name: '눈마루 리조트 지도에서 선택' });
    vi.useFakeTimers();
    act(() => resize());
    expect(map.relayout).toHaveBeenCalled();
    expect(map.setBounds).not.toHaveBeenCalled();
    expect(map.setLevel).toHaveBeenLastCalledWith(9);
    const center = map.setCenter.mock.calls.at(-1)![0];
    expect(center.getLat()).toBe(37.375);
    expect(center.getLng()).toBe(128.525);
    act(() => { vi.advanceTimersByTime(300); });
    expect(onBoundsChange).toHaveBeenCalledTimes(hasSearchBounds ? 0 : 1);
    view.unmount();
    width.mockRestore(); height.mockRestore();
  });
});
