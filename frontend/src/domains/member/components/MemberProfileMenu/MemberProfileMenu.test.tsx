// @vitest-environment jsdom

import '../../../../../tests/setup-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/query/queryClient';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../../tests/mocks/server';
import MemberProfileMenu from './MemberProfileMenu';

const memberUrl = 'https://api.outpick.test/api/v1/members/me';

function renderMenu(children?: React.ReactNode) {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <MemberProfileMenu />
      {children}
    </QueryClientProvider>
  );
}

describe('탐색 화면의 프로필 메뉴', () => {
  it('운영자에게 마이페이지와 관리자 기능별 링크를 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 1, role: 'ADMIN' })));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    await screen.findByRole('link', { name: '마이페이지' });
    expect(screen.getAllByRole('link').map(link => [
      link.textContent, link.getAttribute('href')?.replace(/\/$/, ''),
    ])).toEqual([
      ['마이페이지', '/mypage'],
      ['운영 현황', '/admin'],
      ['장소 관리', '/admin/places'],
      ['공지 관리', '/admin/notices'],
      ['오류 제보', '/admin/place-reports'],
      ['후기 신고', '/admin/review-reports'],
    ]);
  });

  it('일반 회원에게 관심 장소와 알림 바로가기 및 마이페이지와 내 제보 상태를 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 2, role: 'USER' })));
    const user = userEvent.setup();
    renderMenu();

    const favorite = await screen.findByRole('link', { name: '관심 장소' });
    expect(favorite.getAttribute('href')).toMatch(/^\/mypage\/favorites\/?$/);
    expect(screen.getByRole('link', { name: '알림함' }).getAttribute('href')).toMatch(/^\/mypage\/notifications\/?$/);

    const button = screen.getByRole('button', { name: '프로필 메뉴' });
    await user.click(button);

    const menu = document.getElementById(button.getAttribute('aria-controls') ?? '');
    expect([...menu?.querySelectorAll('a') ?? []].map(link => [
      link.textContent, link.getAttribute('href')?.replace(/\/$/, ''),
    ])).toEqual([['마이페이지', '/mypage'], ['내 제보 상태', '/mypage/place-reports']]);
  });

  it('비로그인 상태에서는 로그인과 회원가입 링크만 표시한다', async () => {
    server.use(http.get(memberUrl, () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect((await screen.findByRole('link', { name: '로그인' })).getAttribute('href')).toMatch(/^\/login\/?$/);
    expect(screen.getByRole('link', { name: '회원가입' }).getAttribute('href')).toMatch(/^\/signup\/?$/);
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });

  it('회원 조회가 실패하면 오류를 안내한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.error()));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect((await screen.findByRole('alert')).textContent).toBe('계정 정보를 확인하지 못했어요.');
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('키보드로 링크에 이동하고 Escape로 닫으면 프로필 버튼으로 돌아온다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 1, role: 'ADMIN' })));
    const user = userEvent.setup();
    renderMenu();
    const button = screen.getByRole('button', { name: '프로필 메뉴' });

    await user.tab();
    expect(document.activeElement).toBe(button);
    await user.keyboard('{Enter}');
    const link = await screen.findByRole('link', { name: '마이페이지' });
    await user.tab();
    expect(document.activeElement).toBe(link);

    await user.keyboard('{Escape}');

    expect(button.getAttribute('aria-expanded')).toBe('false');
    expect(screen.queryByRole('link', { name: '마이페이지' })).toBeNull();
    expect(document.activeElement).toBe(button);
  });

  it('메뉴 바깥을 클릭하면 메뉴를 닫는다', async () => {
    server.use(http.get(memberUrl, () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    renderMenu(<button type="button">메뉴 바깥</button>);
    const button = screen.getByRole('button', { name: '프로필 메뉴' });

    await user.click(button);
    expect(button.getAttribute('aria-expanded')).toBe('true');
    await user.click(screen.getByRole('button', { name: '메뉴 바깥' }));

    expect(button.getAttribute('aria-expanded')).toBe('false');
  });
});
