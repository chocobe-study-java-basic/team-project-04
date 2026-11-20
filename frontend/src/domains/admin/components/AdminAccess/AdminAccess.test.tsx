// @vitest-environment jsdom

import '../../../../../tests/setup-dom';
import { QueryClientProvider } from '@tanstack/react-query';
import { createQueryClient } from '@/shared/lib/query/queryClient';
import { render, screen } from '@testing-library/react';
import { http, HttpResponse } from 'msw';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../../tests/mocks/server';
import MemberProfileMenu from '@/domains/member/components/MemberProfileMenu/MemberProfileMenu';
import AdminAccess from './AdminAccess';

const memberUrl = 'https://api.outpick.test/api/v1/members/me';
const adminHeading = '관리자 페이지 본문';

function renderAdminPage() {
  render(
    <QueryClientProvider client={createQueryClient()}>
      <AdminAccess><h1>{adminHeading}</h1></AdminAccess>
    </QueryClientProvider>
  );
}

describe('관리자 공통 접근 확인', () => {
  it('권한 확인 중에는 안내를 보여주고 운영자로 확인되면 본문을 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 1, role: 'ADMIN' })));

    renderAdminPage();

    expect(screen.getByRole('status').textContent).toBe('운영자 권한을 확인하고 있어요.');
    expect(screen.queryByRole('heading', { name: adminHeading })).toBeNull();
    expect(await screen.findByRole('heading', { name: adminHeading })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('프로필 메뉴와 관리자 접근 확인이 회원 조회 요청을 공유한다', async () => {
    let requestCount = 0;
    server.use(http.get(memberUrl, () => {
      requestCount++;
      return HttpResponse.json({ id: 1, role: 'ADMIN' });
    }));
    const user = userEvent.setup();
    render(
      <QueryClientProvider client={createQueryClient()}>
        <MemberProfileMenu />
        <AdminAccess><h1>{adminHeading}</h1></AdminAccess>
      </QueryClientProvider>
    );

    await user.click(screen.getByRole('button', { name: '프로필 메뉴' }));

    expect(await screen.findByRole('link', { name: '관리자 화면' })).toBeTruthy();
    expect(await screen.findByRole('heading', { name: adminHeading })).toBeTruthy();
    expect(requestCount).toBe(1);
  });

  it('일반 회원에게 본문 대신 운영자 전용 안내와 장소 탐색 링크를 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.json({ id: 2, role: 'USER' })));

    renderAdminPage();

    expect(await screen.findByRole('heading', { name: '운영자 전용 페이지입니다' })).toBeTruthy();
    expect(screen.getByRole('link', { name: '장소 탐색으로 돌아가기' }).getAttribute('href')).toBe('/');
    expect(screen.queryByRole('heading', { name: adminHeading })).toBeNull();
  });

  it('회원 조회가 401이면 본문 대신 관리자 홈을 목적지로 하는 로그인 링크를 표시한다', async () => {
    server.use(http.get(memberUrl, () => new HttpResponse(null, { status: 401 })));

    renderAdminPage();

    expect(await screen.findByRole('heading', { name: '로그인이 필요합니다' })).toBeTruthy();
    const href = screen.getByRole('link', { name: '운영자 로그인' }).getAttribute('href');
    const loginUrl = new URL(href ?? '', window.location.origin);
    expect(loginUrl.pathname).toMatch(/^\/login\/?$/);
    expect(loginUrl.searchParams.get('next')).toBe('/admin/');
    expect(screen.queryByRole('heading', { name: adminHeading })).toBeNull();
  });

  it('회원 조회에 실패하면 본문 대신 오류 안내를 표시한다', async () => {
    server.use(http.get(memberUrl, () => HttpResponse.error()));

    renderAdminPage();

    expect((await screen.findByRole('alert')).textContent).toContain('계정 정보를 확인하지 못했어요.');
    expect(screen.queryByRole('heading', { name: adminHeading })).toBeNull();
  });
});
