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
  it('운영자에게 마이페이지와 관리자 화면 링크를 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 1, role: 'ADMIN' })));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect((await screen.findByRole('link', { name: '마이페이지' })).getAttribute('href')).toMatch(/^\/mypage\/?$/);
    expect(screen.getByRole('link', { name: '관리자 화면' }).getAttribute('href')).toMatch(/^\/admin\/?$/);
  });

  it('일반 회원에게 마이페이지를 표시하고 관리자 화면은 숨긴다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 2, role: 'USER' })));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect(await screen.findByRole('link', { name: '마이페이지' })).toBeTruthy();
    expect(screen.queryByRole('link', { name: '관리자 화면' })).toBeNull();
  });

  it('회원 조회가 401이면 로그인 링크를 표시한다', async () => {
    server.use(http.get(memberUrl, () => new HttpResponse(null, { status: 401 })));
    const user = userEvent.setup();
    renderMenu();

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect((await screen.findByRole('link', { name: '로그인' })).getAttribute('href')).toMatch(/^\/login\/?$/);
    expect(screen.queryByRole('link', { name: '관리자 화면' })).toBeNull();
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
