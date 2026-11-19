import { http, HttpResponse } from 'msw';
import { describe, expect, it } from 'vitest';
import { server } from '../../../../tests/mocks/server';
import { createReview, listReviews } from './reviewApi';

const review = { id: 8, placeId: 42, authorId: 3, authorNickname: '방문자', body: '좋았어요',
  createdAt: '2026-11-19T10:00:00', updatedAt: '2026-11-19T10:00:00' };

describe('장소 후기 API', () => {
  it('선택한 장소의 후기만 요청한다', async () => {
    server.use(http.get('https://api.outpick.test/api/v1/places/42/reviews', () => HttpResponse.json([review])));
    expect(await listReviews(42)).toEqual([review]);
  });

  it('후기 작성 요청에 CSRF 토큰을 함께 보낸다', async () => {
    server.use(
      http.get('https://api.outpick.test/api/v1/auth/csrf', () => HttpResponse.json({ token: 'test-token', headerName: 'X-CSRF-TOKEN' })),
      http.post('https://api.outpick.test/api/v1/places/42/reviews', async ({ request }) => {
        expect(request.headers.get('X-CSRF-TOKEN')).toBe('test-token');
        expect(await request.json()).toEqual({ body: '좋았어요' });
        return HttpResponse.json(review, { status: 201 });
      })
    );
    expect(await createReview(42, '좋았어요')).toEqual(review);
  });
});
