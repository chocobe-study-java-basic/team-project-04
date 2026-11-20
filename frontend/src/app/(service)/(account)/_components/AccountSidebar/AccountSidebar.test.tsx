// @vitest-environment jsdom

import '../../../../../../tests/setup-dom';
import { render, screen, within } from '@testing-library/react';
import { usePathname } from 'next/navigation';
import { describe, expect, it, vi } from 'vitest';
import AccountSidebar from './AccountSidebar';

vi.mock('next/navigation', () => ({ usePathname: vi.fn() }));

describe('공통 사이드바', () => {
  it('일반 회원에게 공통 메뉴만 표시하고 현재 페이지를 강조한다', () => {
    vi.mocked(usePathname).mockReturnValue('/mypage/favorites');

    render(<AccountSidebar showAdminMenu={false} />);

    const menu = within(screen.getByRole('navigation', { name: '공통 메뉴' }));
    expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual(['마이페이지', '내 제보 상태', '관심 장소', '알림함']);
    expect(menu.getByRole('link', { name: '관심 장소', current: 'page' })).toBeTruthy();
    expect(screen.queryByRole('navigation', { name: '관리자 메뉴' })).toBeNull();
  });

  it.each([
    ['/admin/', '운영 현황'],
    ['/admin/places', '장소 관리'],
    ['/admin/notices/', '공지 관리'],
    ['/admin/place-reports/', '오류 제보'],
    ['/admin/review-reports/', '후기 신고'],
    ['/mypage/', '마이페이지'],
  ])('운영자에게 두 메뉴를 표시하고 %s에서 %s 항목만 강조한다', (pathname, label) => {
    vi.mocked(usePathname).mockReturnValue(pathname);

    render(<AccountSidebar showAdminMenu />);

    const menu = within(screen.getByRole('navigation', { name: '관리자 메뉴' }));
    expect(screen.getByRole('navigation', { name: '공통 메뉴' })).toBeTruthy();
    expect(menu.getAllByRole('link').map(link => link.textContent)).toEqual(['운영 현황', '장소 관리', '공지 관리', '오류 제보', '후기 신고']);
    expect(screen.getAllByRole('link', { current: 'page' })).toEqual([screen.getByRole('link', { name: label })]);
  });
});
