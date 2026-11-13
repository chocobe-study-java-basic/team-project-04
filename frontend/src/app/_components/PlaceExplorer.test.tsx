// @vitest-environment jsdom

import '../../../tests/setup-dom';
import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import PlaceExplorer from './PlaceExplorer';

// jsdom에는 Next.js 라우터가 없으므로 History API와 URL 구독 사이의 어댑터만 대체합니다.
// 실제 Next.js의 pushState·새로고침·히스토리 연동은 브라우저에서 별도 확인합니다.
vi.mock('next/navigation', async () => {
  const { useSyncExternalStore } = await import('react');
  function subscribe(listener: () => void) {
    window.addEventListener('popstate', listener);
    return () => window.removeEventListener('popstate', listener);
  }
  return {
    useSearchParams: () => new URLSearchParams(useSyncExternalStore(
      subscribe,
      () => window.location.search,
      () => ''
    )),
  };
});

beforeEach(() => {
  sessionStorage.clear();
  window.history.replaceState(null, '', '/');
  const pushState = window.history.pushState.bind(window.history);
  vi.spyOn(window.history, 'pushState').mockImplementation((data, unused, url) => {
    pushState(data, unused, url);
    window.dispatchEvent(new PopStateEvent('popstate'));
  });
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('샘플 장소 탐색', () => {
  it('장소명으로 검색한 뒤 초기화하면 전체 장소를 다시 보여 준다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.type(screen.getByRole('textbox', { name: '장소명 검색' }), '눈마루');
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(screen.getByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '설원 파크' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(screen.getByRole('heading', { name: '설원 파크' })).toBeTruthy();
    expect((screen.getByRole('textbox', { name: '장소명 검색' }) as HTMLInputElement).value).toBe('');
  });

  it('서로 다른 종목의 시즌·실내외 조건을 섞어서 장소를 반환하지 않는다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.click(screen.getByRole('button', { name: '수상' }));
    fireEvent.change(screen.getByRole('combobox', { name: '시즌' }), { target: { value: '겨울' } });
    fireEvent.change(screen.getByRole('combobox', { name: '실내외' }), { target: { value: '실내' } });
    expect(screen.getByRole('heading', { name: '조건에 맞는 장소가 없어요' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '물빛 액티비티 센터' })).toBeNull();
    await user.click(screen.getByRole('button', { name: '전체 장소 보기' }));
    expect(screen.getByRole('heading', { name: '물빛 액티비티 센터' })).toBeTruthy();
  });

  it('선택한 장소가 필터 결과에서 사라지면 이전 장소 요약을 남기지 않는다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.click(screen.getByRole('button', { name: /눈마루 리조트/ }));
    expect(screen.getByRole('heading', { level: 3, name: '눈마루 리조트' })).toBeTruthy();
    fireEvent.change(screen.getByRole('combobox', { name: '지역' }), { target: { value: '경기' } });
    expect(screen.queryByRole('heading', { level: 3, name: '눈마루 리조트' })).toBeNull();
    expect(screen.getByRole('heading', { name: '어디로 떠나볼까요?' })).toBeTruthy();
  });

  it('공유 URL로 진입하고 다시 마운트해도 검색어·필터·정렬을 복원한다', () => {
    const params = new URLSearchParams({
      query: '눈마루',
      category: '스키·보드',
      region: '강원',
      season: '겨울',
      environment: '실외',
      sort: 'name-desc',
    });
    window.history.replaceState(null, '', `/?${params}`);
    const view = render(<PlaceExplorer />);
    expect((screen.getByRole('textbox', { name: '장소명 검색' }) as HTMLInputElement).value).toBe('눈마루');
    for (const [label, value] of [['지역', '강원'], ['시즌', '겨울'], ['실내외', '실외'], ['정렬', 'name-desc']]) {
      expect((screen.getByRole('combobox', { name: label }) as HTMLSelectElement).value).toBe(value);
    }
    expect(screen.getByRole('button', { name: '스키·보드' }).getAttribute('aria-pressed')).toBe('true');
    expect(screen.getByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
    expect(screen.queryByRole('heading', { name: '설원 파크' })).toBeNull();
    view.unmount();
    render(<PlaceExplorer />);
    expect((screen.getByRole('textbox', { name: '장소명 검색' }) as HTMLInputElement).value).toBe('눈마루');
    expect(screen.getByRole('heading', { name: '눈마루 리조트' })).toBeTruthy();
  });

  it('입력 중에는 URL을 바꾸지 않고 검색 제출 시 반영하며 같은 검색은 히스토리를 늘리지 않는다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.type(screen.getByRole('textbox', { name: '장소명 검색' }), '눈마루');
    expect(window.location.search).toBe('');
    expect(screen.getByRole('heading', { name: '설원 파크' })).toBeTruthy();
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(new URLSearchParams(window.location.search).get('query')).toBe('눈마루');
    const historyLength = window.history.length;
    await user.click(screen.getByRole('button', { name: '검색' }));
    expect(window.history.length).toBe(historyLength);
  });

  it('브라우저 뒤로·앞으로 가기를 하면 이전 필터와 검색 결과를 복원한다', async () => {
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '강원');
    await user.selectOptions(screen.getByRole('combobox', { name: '시즌' }), '겨울');
    expect(screen.queryByRole('heading', { name: '파도 서프 스테이션' })).toBeNull();

    await act(async () => {
      const traversed = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
      window.history.back();
      await traversed;
    });
    expect((screen.getByRole('combobox', { name: '지역' }) as HTMLSelectElement).value).toBe('강원');
    expect((screen.getByRole('combobox', { name: '시즌' }) as HTMLSelectElement).value).toBe('');
    expect(screen.getByRole('heading', { name: '파도 서프 스테이션' })).toBeTruthy();

    await act(async () => {
      const traversed = new Promise<void>(resolve => window.addEventListener('popstate', () => resolve(), { once: true }));
      window.history.forward();
      await traversed;
    });
    expect((screen.getByRole('combobox', { name: '시즌' }) as HTMLSelectElement).value).toBe('겨울');
    expect(screen.queryByRole('heading', { name: '파도 서프 스테이션' })).toBeNull();
  });

  it('초기화는 미제출 검색어도 지우고 다른 쿼리와 해시를 보존한다', async () => {
    window.history.replaceState(null, '', '/?region=강원&season=겨울&from=shared#results');
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    await user.type(screen.getByRole('textbox', { name: '장소명 검색' }), '미제출');
    await user.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(window.location.search).toBe('?from=shared');
    expect(window.location.hash).toBe('#results');
    expect((screen.getByRole('textbox', { name: '장소명 검색' }) as HTMLInputElement).value).toBe('');
    expect(screen.getByRole('heading', { name: '파도 서프 스테이션' })).toBeTruthy();
  });

  it('지원하지 않는 URL 필터 값은 기본값으로 표시하고 다음 변경 때 정리한다', async () => {
    window.history.replaceState(null, '', '/?region=invalid&season=invalid&category=invalid&environment=invalid&sort=invalid');
    const user = userEvent.setup();
    render(<PlaceExplorer />);
    expect((screen.getByRole('combobox', { name: '지역' }) as HTMLSelectElement).value).toBe('');
    expect((screen.getByRole('combobox', { name: '정렬' }) as HTMLSelectElement).value).toBe('name');
    expect(screen.getByRole('button', { name: '전체' }).getAttribute('aria-pressed')).toBe('true');
    await user.selectOptions(screen.getByRole('combobox', { name: '지역' }), '경기');
    expect(new URLSearchParams(window.location.search).toString()).toBe(new URLSearchParams({ region: '경기' }).toString());
  });

  it('카드의 상세 링크가 현재 검색 조건을 복귀 주소로 유지한다', () => {
    window.history.replaceState(null, '', '/?region=강원&season=겨울');
    render(<PlaceExplorer />);
    const href = screen.getByRole('link', { name: '눈마루 리조트 상세 보기' }).getAttribute('href');
    const url = new URL(href!, window.location.origin);
    expect(url.searchParams.get('id')).toBe('1');
    const returnUrl = new URL(url.searchParams.get('returnTo')!, window.location.origin);
    expect(returnUrl.searchParams.get('region')).toBe('강원');
    expect(returnUrl.searchParams.get('season')).toBe('겨울');
  });

  it('일치하는 목록으로 복귀한 경우에만 저장한 스크롤을 적용한다', () => {
    const url = `/?${new URLSearchParams({ region: '강원' })}`;
    window.history.replaceState(null, '', url);
    sessionStorage.setItem('outpick:place-list-position', JSON.stringify({ url, y: 480 }));
    const scrollTo = vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
    vi.spyOn(window, 'requestAnimationFrame').mockImplementation(callback => { callback(0); return 1; });
    render(<PlaceExplorer />);
    expect(scrollTo).toHaveBeenCalledWith({ top: 480, behavior: 'instant' });
    expect(sessionStorage.getItem('outpick:place-list-position')).toBeNull();
  });
});
