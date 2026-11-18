// @vitest-environment jsdom
import '../../../tests/setup-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../tests/mocks/server';
import QueryProvider from '../_providers/QueryProvider';
import PlaceExplorer from './PlaceExplorer';
import type { PlaceMapBounds, PlaceMapItem, PlaceMapView } from '@/domains/place/types/kakaoMap.type';

vi.mock('@/domains/place/components/KakaoPlaceMap', () => ({
  default: ({ places, onBoundsChange, view }: { places: PlaceMapItem[]; onBoundsChange: (bounds: PlaceMapBounds, view: PlaceMapView) => void; view: PlaceMapView | null }) => (
    <div aria-label="테스트 지도" data-view={JSON.stringify(view)} data-ids={places.map(place => place.id).join(',')}>
      <button onClick={() => onBoundsChange({ south: 37.37, north: 37.38, west: 128.39, east: 128.66 }, { lat: 37.375, lng: 128.525, level: 8 })}>테스트 지도 이동</button>
    </div>
  ),
}));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  function subscribe(listener: () => void) {
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }
  return { useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search, () => '')) };
});
const base = 'https://api.outpick.test/api/v1/places';
const rows = [
  { id: 1, name: '눈마루 리조트', address: '강원 가상 주소', latitude: 37.37, longitude: 128.39 },
  { id: 2, name: '파도 서프 스테이션', address: null, latitude: null, longitude: null },
];
let requests: URL[];
const mount = () => render(<QueryProvider><PlaceExplorer /></QueryProvider>);
beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  for (const method of ['pushState', 'replaceState'] as const) {
    const original = window.history[method].bind(window.history);
    vi.spyOn(window.history, method).mockImplementation((data, unused, url) => {
      original(data, unused, url);
      window.dispatchEvent(new PopStateEvent('popstate'));
    });
  }
  requests = [];
  server.use(
    http.get(base + '/filters', () => HttpResponse.json({
      regions: [{ id: 101, name: '강원' }, { id: 201, name: '경기' }],
      categories: [{ id: 11, name: '스키·보드', activityTypeIds: [51, 52] }, { id: 12, name: '수상', activityTypeIds: [61] }],
    })),
    http.get(base, ({ request }) => {
      const url = new URL(request.url); requests.push(url);
      const filtered = url.searchParams.has('query') || url.searchParams.has('south');
      return HttpResponse.json({ items: filtered ? rows.slice(0, 1) : rows, page: Number(url.searchParams.get('page')), size: 20, totalElements: filtered ? 1 : 2 });
    })
  );
});
afterEach(() => vi.restoreAllMocks());

describe('DB 장소 목록 화면', () => {
  it('API 목록을 표시하고 좌표 미확인 장소는 마커에서 제외한다', async () => {
    mount();
    expect(await screen.findByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '파도 서프 스테이션' })).toBeTruthy();
    expect(screen.getByLabelText('테스트 지도').getAttribute('data-ids')).toBe('1');
    expect(screen.getByText('위치 미확인 · 지도에는 표시되지 않아요.')).toBeTruthy();
    expect(requests[0].searchParams.get('size')).toBe('20');
  });
  it('필터 이름을 서버 ID와 코드로 바꾸고 검색 제출 전에는 검색어를 반영하지 않는다', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    await user.click(screen.getByRole('button', { name: '스키·보드' }));
    await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '강원');
    await user.selectOptions(screen.getByRole('combobox', { name: '시즌' }), '겨울');
    await user.selectOptions(screen.getByRole('combobox', { name: '실내외' }), '실외');
    await user.type(screen.getByRole('textbox', { name: '장소명 검색' }), '눈마루');
    expect(new URLSearchParams(window.location.search).get('query')).toBeNull();
    await user.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('query')).toBe('눈마루'));
    const params = requests.at(-1)!.searchParams;
    expect(params.getAll('activityTypeIds')).toEqual(['51', '52']);
    expect(params.get('regionId')).toBe('101');
    expect(params.get('season')).toBe('WINTER');
    expect(params.get('environmentType')).toBe('OUTDOOR');
  });
  it('지도 이동은 히스토리를 늘리지 않으며 API 범위와 상세 복귀 링크에 반영된다', async () => {
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    const length = window.history.length;
    await user.click(screen.getByRole('button', { name: '테스트 지도 이동' }));
    await waitFor(() => expect(requests.at(-1)?.searchParams.get('south')).toBe('37.37'));
    expect(window.history.length).toBe(length);
    const link = await screen.findByRole('link', { name: '눈마루 리조트 상세 보기' });
    const detail = new URL(link.getAttribute('href')!, window.location.origin);
    expect(new URL(detail.searchParams.get('returnTo')!, window.location.origin).searchParams.get('level')).toBe('8');
  });
  it('오류를 빈 결과나 샘플 장소로 숨기지 않고 재시도를 제공한다', async () => {
    server.use(http.get(base, () => new HttpResponse(null, { status: 500 })));
    const user = userEvent.setup(); mount();
    expect(await screen.findByRole('alert')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '조건에 맞는 장소가 없어요' })).toBeNull();
    server.use(http.get(base, () => HttpResponse.json({ items: rows, page: 0, size: 20, totalElements: 2 })));
    await user.click(screen.getByRole('button', { name: '다시 시도' }));
    expect(await screen.findByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
  });
  it('빈 결과는 정상 안내하고 필터를 초기화한다', async () => {
    server.use(http.get(base, ({ request }) => {
      const query = new URL(request.url).searchParams.get('query');
      return HttpResponse.json({ items: query ? [] : rows, page: 0, size: 20, totalElements: query ? 0 : 2 });
    }));
    window.history.replaceState(null, '', '/?query=없는장소');
    const user = userEvent.setup(); mount();
    expect(await screen.findByRole('heading', { name: '조건에 맞는 장소가 없어요' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '검색 필터 초기화' }));
    expect(await screen.findByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
    expect(window.location.search).toBe('');
  });
  it('페이지를 URL에 저장하고 필터를 변경하면 첫 페이지로 돌아간다', async () => {
    server.use(http.get(base, ({ request }) => HttpResponse.json({ items: rows, page: Number(new URL(request.url).searchParams.get('page')), size: 20, totalElements: 21 })));
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('1');
    await screen.findByText('2페이지');
    await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '강원');
    expect(new URLSearchParams(window.location.search).get('page')).toBeNull();
  });
  it('공유 URL의 지도·필터를 복원하고 뒤로 가기로 필터를 되돌린다', async () => {
    window.history.replaceState(null, '', '/?region=강원&lat=37.375&lng=128.525&level=8&south=37.37&west=128.39&north=37.38&east=128.66');
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    expect(screen.getByLabelText('테스트 지도').getAttribute('data-view')).toBe(JSON.stringify({ lat: 37.375, lng: 128.525, level: 8 }));
    await user.selectOptions(screen.getByRole('combobox', { name: '시즌' }), '겨울');
    await act(async () => {
      const traversed = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
      window.history.back(); await traversed;
    });
    expect((screen.getByRole('combobox', { name: '시즌' }) as HTMLSelectElement).value).toBe('');
    expect(new URLSearchParams(window.location.search).get('region')).toBe('강원');
  });
});
