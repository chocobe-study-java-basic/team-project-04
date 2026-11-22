// @vitest-environment jsdom
import '../../../../../tests/setup-dom';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../../tests/mocks/server';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/query/queryClient';
import ServiceHeader from '../ServiceHeader';
import PlaceExplorer from './PlaceExplorer';
import type { PlaceMapBounds, PlaceMapItem, PlaceMapSelection, PlaceMapView } from '@/domains/place/types/kakaoMap.type';

vi.mock('@/domains/place/components/KakaoPlaceMap/KakaoPlaceMap', () => ({
  default: ({ places, totalPlaces, onBoundsChange, onSelect, view }: {
    places: PlaceMapItem[];
    totalPlaces?: number;
    onBoundsChange: (bounds: PlaceMapBounds, view: PlaceMapView) => void;
    onSelect: (selection: PlaceMapSelection) => void;
    view: PlaceMapView | null;
  }) => (
    <div aria-label="테스트 지도" data-view={JSON.stringify(view)} data-ids={places.map(place => place.id).join(',')} data-total={totalPlaces}>
      <button onClick={() => onBoundsChange({ south: 37.37, north: 37.38, west: 128.39, east: 128.66 }, { lat: 37.375, lng: 128.525, level: 8 })}>테스트 지도 이동</button>
      <button onClick={() => onBoundsChange({ south: 38.37, north: 38.38, west: 128.39, east: 128.66 }, { lat: 38.375, lng: 128.525, level: 8 })}>다른 지도 범위로 이동</button>
      <button onClick={() => onBoundsChange({ south: 39.37, north: 39.38, west: 128.39, east: 128.66 }, { lat: 39.375, lng: 128.525, level: 8 })}>빈 지도 범위로 이동</button>
      {places.map(place => (
        <button key={place.id} onClick={() => onSelect({ id: place.id, source: 'map' })}>테스트 마커 {place.id}</button>
      ))}
    </div>
  ),
}));
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  function subscribe(listener: () => void) {
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }
  return {
    usePathname: () => window.location.pathname,
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(subscribe, () => window.location.search, () => '')),
  };
});
const base = 'https://api.outpick.test/api/v1/places';
const rows = [
  { id: 1, name: '눈마루 리조트', address: '강원 가상 주소', latitude: 37.37, longitude: 128.39 },
  { id: 2, name: '파도 서프 스테이션', address: null, latitude: null, longitude: null },
];
let requests: URL[];
const mount = () => render(
  <QueryClientProvider client={createQueryClient()}>
    <ServiceHeader />
    <PlaceExplorer />
  </QueryClientProvider>
);
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
    http.get('https://api.outpick.test/api/v1/members/me', () => new HttpResponse(null, { status: 401 })),
    http.get(base + '/filters', () => HttpResponse.json({
      regions: [{ id: 101, name: '강원' }, { id: 201, name: '경기' }],
      categories: [{ id: 11, name: '스키·보드', activityTypeIds: [51, 52] }, { id: 12, name: '수상', activityTypeIds: [61] }],
    })),
    http.get(base, ({ request }) => {
      const url = new URL(request.url); requests.push(url);
      const filtered = url.searchParams.has('query') || url.searchParams.has('south');
      return HttpResponse.json({ items: filtered ? rows.slice(0, 1) : rows, page: Number(url.searchParams.get('page')), size: Number(url.searchParams.get('size')), totalElements: filtered ? 1 : 2 });
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
  it('마커를 선택하면 조회 없이 카드를 강조하고 목록에서 보이게 한다', async () => {
    const user = userEvent.setup();
    mount();
    const cardButton = await screen.findByRole('button', { name: /눈마루 리조트/ });
    const marker = screen.getByRole('button', { name: '테스트 마커 1' });
    const scrollIntoView = vi.fn();
    Object.defineProperty(cardButton.closest('article'), 'scrollIntoView', { value: scrollIntoView });

    expect(cardButton.getAttribute('aria-pressed')).toBe('false');
    await user.click(marker);
    expect(cardButton.getAttribute('aria-pressed')).toBe('true');
    expect(scrollIntoView).toHaveBeenCalledExactlyOnceWith({ block: 'nearest', inline: 'nearest' });

    await user.click(cardButton);
    expect(scrollIntoView).toHaveBeenCalledTimes(1);
    await user.click(screen.getByRole('button', { name: '지도 보기' }));
    expect(screen.getByRole('button', { name: '목록 보기' })).toBeTruthy();
    await user.click(marker);
    expect(screen.getByRole('button', { name: '지도 보기' }).getAttribute('aria-pressed')).toBe('false');
    expect(scrollIntoView).toHaveBeenCalledTimes(2);
    expect(requests).toHaveLength(1);
  });
  it('목록 페이지와 정렬을 변경해도 지도에 같은 첫 50곳을 표시한다', async () => {
    window.history.replaceState(null, '', '/?lat=37.375&lng=128.525&level=8&south=37.37&west=128.39&north=37.38&east=128.66');
    const results = Array.from({ length: 72 }, (_, index) => ({
      ...rows[0], id: index + 1, name: `검증 장소 ${index + 1}`,
    }));
    server.use(http.get(base, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page'));
      const size = Number(url.searchParams.get('size'));
      const sorted = url.searchParams.get('sort') === 'name-desc' ? results.toReversed() : results;
      return HttpResponse.json({ items: sorted.slice(page * size, (page + 1) * size), page, size, totalElements: results.length });
    }));
    const user = userEvent.setup();
    mount();
    const map = screen.getByLabelText('테스트 지도');
    const marker = await screen.findByRole('button', { name: '테스트 마커 50' });
    const markerIds = map.getAttribute('data-ids');
    expect(markerIds?.split(',')).toHaveLength(50);
    expect(map.getAttribute('data-total')).toBe('72');
    expect(screen.queryByRole('button', { name: '테스트 마커 51' })).toBeNull();
    await screen.findByRole('heading', { name: '검증 장소 1' });

    await user.click(screen.getByRole('button', { name: '다음' }));
    await screen.findByText('2페이지');
    expect(map.getAttribute('data-ids')).toBe(markerIds);

    await user.click(screen.getByRole('button', { name: '지도 보기' }));
    await user.click(marker);
    expect(screen.getByRole('button', { name: '목록 보기' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '검증 장소 50' })).toBeTruthy();
    const detailLink = screen.getByRole('link', { name: '장소 상세 보기 →' });
    const detail = new URL(detailLink.getAttribute('href')!, window.location.origin);
    expect(detail.searchParams.get('id')).toBe('50');
    expect(new URL(detail.searchParams.get('returnTo')!, window.location.origin).searchParams.get('page')).toBe('1');

    await user.selectOptions(screen.getByRole('combobox', { name: '정렬' }), 'name-desc');
    await screen.findByRole('heading', { name: '검증 장소 72' });
    expect(map.getAttribute('data-ids')).toBe(markerIds);
    expect(screen.getByRole('button', { name: '테스트 마커 50' })).toBe(marker);
    const markerRequests = requests.filter(url => url.searchParams.get('size') === '50');
    expect(markerRequests).toHaveLength(1);
    expect(markerRequests[0].searchParams.get('page')).toBe('0');
    expect(markerRequests[0].searchParams.get('south')).toBe('37.37');

    await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '강원');
    await waitFor(() => expect(requests.some(url => url.searchParams.get('size') === '50'
      && url.searchParams.get('regionId') === '101')).toBe(true));
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
  it('새 지도 범위를 기다리는 동안 기존 결과를 유지하고 0건 응답을 받으면 비운다', async () => {
    window.history.replaceState(null, '', '/?lat=37.375&lng=128.525&level=8&south=37.37&west=128.39&north=37.38&east=128.66&page=1');
    const nextArea = Promise.withResolvers<void>();
    const nextMarkers = Promise.withResolvers<void>();
    const emptyArea = Promise.withResolvers<void>();
    const shared = { ...rows[0], id: 21, name: '두 영역에 있는 장소' };
    const onlyPrevious = { ...rows[0], id: 22, name: '이전 영역에만 있는 장소' };
    const onlyNext = { ...rows[0], id: 23, name: '새 영역에만 있는 장소' };
    server.use(http.get(base, async ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      const page = Number(url.searchParams.get('page'));
      const size = Number(url.searchParams.get('size'));
      if (url.searchParams.get('south') === '38.37') {
        await (size === 50 ? nextMarkers : nextArea).promise;
        return HttpResponse.json({ items: [shared, onlyNext], page, size, totalElements: 2 });
      }
      if (url.searchParams.get('south') === '39.37') {
        await emptyArea.promise;
        return HttpResponse.json({ items: [], page, size, totalElements: 0 });
      }
      return HttpResponse.json({ items: [shared, onlyPrevious], page, size, totalElements: 22 });
    }));
    const user = userEvent.setup();
    mount();
    const card = await screen.findByRole('heading', { name: shared.name });
    const marker = await screen.findByRole('button', { name: '테스트 마커 21' });
    await user.click(screen.getByRole('button', { name: '다른 지도 범위로 이동' }));
    await waitFor(() => expect(requests.filter(url => url.searchParams.get('south') === '38.37')).toHaveLength(2));

    expect(screen.getByText('이 영역의 장소를 찾는 중')).toBeTruthy();
    expect(screen.getByRole('heading', { name: onlyPrevious.name })).toBeTruthy();
    expect(screen.getByRole('heading', { name: shared.name })).toBe(card);
    expect(screen.getByRole('button', { name: '테스트 마커 21' })).toBe(marker);
    expect(screen.getByText('2페이지')).toBeTruthy();
    expect(screen.getByRole<HTMLButtonElement>('button', { name: '이전' }).disabled).toBe(true);
    expect(requests.filter(url => url.searchParams.get('south') === '38.37')
      .every(url => url.searchParams.get('page') === '0')).toBe(true);

    await act(async () => nextArea.resolve());
    await screen.findByRole('heading', { name: onlyNext.name });
    expect(screen.getByRole('button', { name: '테스트 마커 22' })).toBeTruthy();
    expect(screen.getByText('이 영역의 장소를 찾는 중')).toBeTruthy();
    await act(async () => nextMarkers.resolve());
    await screen.findByRole('button', { name: '테스트 마커 23' });
    expect(screen.getByRole('heading', { name: shared.name })).toBe(card);
    expect(screen.getByRole('button', { name: '테스트 마커 21' })).toBe(marker);
    expect(screen.queryByRole('heading', { name: onlyPrevious.name })).toBeNull();
    expect(screen.queryByText('이 영역의 장소를 찾는 중')).toBeNull();

    await user.click(screen.getByRole('button', { name: '빈 지도 범위로 이동' }));
    expect(screen.getByRole('heading', { name: shared.name })).toBe(card);
    expect(screen.getByRole('button', { name: '테스트 마커 21' })).toBe(marker);
    await act(async () => emptyArea.resolve());
    await screen.findByRole('heading', { name: '조건에 맞는 장소가 없어요' });
    await waitFor(() => expect(screen.queryByRole('button', { name: '테스트 마커 21' })).toBeNull());
  });

  it('새 지도 범위를 조회하면 진행 중인 이전 요청을 취소하고 마지막 결과를 표시한다', async () => {
    const firstSignals = new Map<string, AbortSignal>();
    const releaseFirstResponse = Promise.withResolvers<void>();
    const releaseLastResponse = Promise.withResolvers<void>();
    server.use(http.get(base, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      const south = params.get('south');
      if (south === '37.37') {
        firstSignals.set(params.get('size') ?? '', request.signal);
        await releaseFirstResponse.promise;
      }
      if (south === '38.37') await releaseLastResponse.promise;
      const items = south === '38.37' ? [rows[1]] : [rows[0]];
      return HttpResponse.json({ items, page: Number(params.get('page')), size: 20, totalElements: 1 });
    }));
    window.history.replaceState(null, '', '/?page=1');
    const user = userEvent.setup();
    mount();
    await screen.findByText('2페이지');

    try {
      await user.click(screen.getByRole('button', { name: '테스트 지도 이동' }));
      await waitFor(() => expect([...firstSignals.keys()].sort()).toEqual(['20', '50']));
      expect(new URLSearchParams(window.location.search).get('page')).toBeNull();
      await user.click(screen.getByRole('button', { name: '다른 지도 범위로 이동' }));

      await waitFor(() => expect([...firstSignals.values()].every(signal => signal.aborted)).toBe(true));
      expect(screen.getByRole('button', { name: '테스트 마커 1' })).toBeTruthy();
      await act(async () => releaseLastResponse.resolve());
      expect(await screen.findByRole('heading', { name: '파도 서프 스테이션' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: '눈마루 리조트' })).toBeNull();
    } finally {
      releaseFirstResponse.resolve();
      releaseLastResponse.resolve();
    }
  });
  it('지도 검색을 기다리다가 필터를 바꾸면 이전 조건의 결과를 제거한다', async () => {
    window.history.replaceState(null, '', '/?lat=37.375&lng=128.525&level=8&south=37.37&west=128.39&north=37.38&east=128.66');
    const release = Promise.withResolvers<void>();
    server.use(http.get(base, async ({ request }) => {
      const params = new URL(request.url).searchParams;
      if (params.get('south') === '38.37') await release.promise;
      const items = params.has('regionId') ? [] : [rows[0]];
      return HttpResponse.json({ items, page: 0, size: Number(params.get('size')), totalElements: items.length });
    }));
    const user = userEvent.setup();
    mount();
    await screen.findByRole('heading', { name: rows[0].name });
    await screen.findByRole('button', { name: '테스트 마커 1' });
    try {
      await user.click(screen.getByRole('button', { name: '다른 지도 범위로 이동' }));
      expect(screen.getByText('이 영역의 장소를 찾는 중')).toBeTruthy();
      await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '경기');
      expect(screen.queryByText('이 영역의 장소를 찾는 중')).toBeNull();
      expect(screen.queryByRole('heading', { name: rows[0].name })).toBeNull();
      expect(screen.queryByRole('button', { name: '테스트 마커 1' })).toBeNull();
    } finally {
      await act(async () => release.resolve());
    }
    await screen.findByRole('heading', { name: '조건에 맞는 장소가 없어요' });
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
  it('기본 필터에서 초기화해도 제출하지 않은 검색어를 지운다', async () => {
    const user = userEvent.setup();
    mount();
    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '장소명 검색' });
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    await user.type(input, '미제출 검색어');

    await user.click(screen.getByRole('button', { name: '필터 초기화' }));

    expect(input.value).toBe('');
    expect(window.location.search).toBe('');
  });
  it('장소를 선택하면 현재 페이지를 유지하고 필터를 변경하면 첫 페이지로 돌아간다', async () => {
    server.use(http.get(base, ({ request }) => {
      const url = new URL(request.url);
      requests.push(url);
      return HttpResponse.json({ items: rows, page: Number(url.searchParams.get('page')), size: 20, totalElements: 21 });
    }));
    const user = userEvent.setup(); mount();
    await screen.findByRole('heading', { name: '눈마루 리조트' });
    await user.click(screen.getByRole('button', { name: '다음' }));
    expect(new URLSearchParams(window.location.search).get('page')).toBe('1');
    await screen.findByText('2페이지');
    const card = screen.getByRole('button', { name: /눈마루 리조트/ });
    await user.click(card);
    expect(card.getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByText('2페이지')).toBeTruthy();
    expect(requests.map(url => url.searchParams.get('page'))).toEqual(['0', '1']);
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
