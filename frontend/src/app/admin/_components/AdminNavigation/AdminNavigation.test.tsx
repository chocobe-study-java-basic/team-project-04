// @vitest-environment jsdom

import '../../../../../tests/setup-dom';
import { render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import AdminNavigation from './AdminNavigation';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

describe('관리자 공통 메뉴', () => {
  it.each([
    ['/admin/', '운영 현황'],
    ['/admin/places', '장소 관리'],
    ['/admin/review-reports/', '후기 신고'],
  ])('%s에서 %s 항목만 현재 메뉴로 표시한다', (pathname, label) => {
    vi.mocked(usePathname).mockReturnValue(pathname);

    render(<AdminNavigation />);

    const menu = within(screen.getByRole('navigation', { name: '관리자 메뉴' }));
    expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual(['운영 현황', '장소 관리', '후기 신고']);
    expect(menu.getAllByRole('link', { current: 'page' })).toEqual([menu.getByRole('link', { name: label })]);
  });
});
