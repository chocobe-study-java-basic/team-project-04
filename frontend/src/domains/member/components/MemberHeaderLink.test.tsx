// @vitest-environment jsdom

import '../../../../tests/setup-dom';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/shared/lib/http/apiError';
import { currentMember } from '../api/memberApi';
import MemberHeaderLink from './MemberHeaderLink';

vi.mock('../api/memberApi', () => ({ currentMember: vi.fn() }));
afterEach(() => vi.clearAllMocks());

describe('탐색 화면의 계정 이동', () => {
  it('로그인한 회원에게 계정 화면으로 가는 링크를 보여준다', async () => {
    vi.mocked(currentMember).mockResolvedValue({ id: 1, email: 'member@example.com', nickname: '회원' });
    render(<MemberHeaderLink />);
    const link = await screen.findByRole('link', { name: '내 계정' });
    expect(link.getAttribute('href')).toBe('/account');
  });

  it('인증 만료와 서버 장애를 구분해 안내한다', async () => {
    vi.mocked(currentMember).mockRejectedValueOnce(new ApiError({ kind: 'http', status: 401, message: '로그인이 필요합니다.', fieldErrors: [] }, null));
    const view = render(<MemberHeaderLink />);
    expect((await screen.findByRole('link', { name: '로그인' })).getAttribute('href')).toBe('/login');
    view.unmount();

    vi.mocked(currentMember).mockRejectedValueOnce(new ApiError({ kind: 'network', message: '서버에 연결할 수 없습니다.' }, null));
    render(<MemberHeaderLink />);
    expect((await screen.findByRole('link', { name: '계정 확인' })).getAttribute('href')).toBe('/account');
  });
});
