// @vitest-environment jsdom

import { http, HttpResponse } from 'msw';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { server } from '../../../../tests/mocks/server';

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe('배포 환경의 API 주소', () => {
  it('/를 지정하면 현재 화면의 서버로 API 경로를 요청한다', async () => {
    vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', '/');
    vi.resetModules();
    const { apiClient } = await import('./apiClient');
    server.use(http.get(`${window.location.origin}/api/v1/examples/1`, ({ request }) =>
      HttpResponse.json({ requestedUrl: request.url })
    ));

    const response = await apiClient.get('/api/v1/examples/1');

    expect(response.data).toEqual({
      requestedUrl: `${window.location.origin}/api/v1/examples/1`,
    });
  });

  it.each(['', '/api', '//external.example', 'ftp://external.example'])(
    '지원하지 않는 설정 %s는 초기화 시 거부한다',
    async (baseURL) => {
      vi.stubEnv('NEXT_PUBLIC_API_BASE_URL', baseURL);
      vi.resetModules();

      await expect(import('./apiClient')).rejects.toThrow();
    }
  );
});
