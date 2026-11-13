// @vitest-environment jsdom

import '../../../../../tests/setup-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import PlaceDetail from './PlaceDetail';

vi.mock('next/navigation', () => ({
  useSearchParams: () => new URLSearchParams(window.location.search),
}));

beforeEach(() => {
  window.history.replaceState(null, '', '/places/detail/?id=1');
});

describe('샘플 장소 상세', () => {
  it('해당 장소의 종목·시즌을 표시하고 실제로 확보하지 않은 정보는 미확인으로 구분한다', () => {
    render(<PlaceDetail />);
    expect(screen.getByRole('heading', { level: 1, name: '눈마루 리조트' })).toBeTruthy();
    expect(screen.getByRole('heading', { name: '스키' })).toBeTruthy();
    expect(screen.getAllByText('실외 · 겨울')).toHaveLength(2);
    expect(screen.getByText('시설 사진이 아닌 샘플 일러스트')).toBeTruthy();
    expect(screen.getAllByText('미확인').length).toBeGreaterThan(0);
  });

  it('검색 조건이 담긴 목록 복귀 링크를 제공한다', () => {
    const params = new URLSearchParams({ id: '6', returnTo: '/?region=경기&season=여름' });
    window.history.replaceState(null, '', `/places/detail/?${params}`);
    render(<PlaceDetail />);
    expect(screen.getByRole('heading', { level: 1, name: '물빛 액티비티 센터' })).toBeTruthy();
    const href = screen.getByRole('link', { name: /장소 목록으로 돌아가기/ }).getAttribute('href');
    const returnUrl = new URL(href!, window.location.origin);
    expect(returnUrl.pathname).toBe('/');
    expect(returnUrl.searchParams.get('region')).toBe('경기');
    expect(returnUrl.searchParams.get('season')).toBe('여름');
  });

  it.each(['', '?id=999', '?id=1oops', '?id=-1', '?id=1&id=2', '?id=9007199254740993'])(
    '유효하지 않거나 없는 장소 ID %s는 찾을 수 없음 화면으로 안내한다', query => {
      window.history.replaceState(null, '', `/places/detail/${query}`);
      render(<PlaceDetail />);
      expect(screen.getByRole('heading', { name: '장소를 찾을 수 없어요' })).toBeTruthy();
      expect(screen.queryByRole('heading', { name: '장소 소개' })).toBeNull();
    }
  );
});
