import { apiClient } from '@/shared/lib/http/apiClient';
import { csrfHeader } from '@/domains/member/api/memberApi';

export type Review = {
  id: number;
  placeId: number;
  authorId: number;
  authorNickname: string;
  body: string;
  createdAt: string;
  updatedAt: string;
};

export async function listReviews(placeId: number): Promise<Review[]> {
  const { data } = await apiClient.get<Review[]>(`/api/v1/places/${placeId}/reviews`);
  return data;
}

export async function createReview(placeId: number, body: string): Promise<Review> {
  const { data } = await apiClient.post<Review>(`/api/v1/places/${placeId}/reviews`,
    { body }, { headers: await csrfHeader() });
  return data;
}

export async function updateReview(reviewId: number, body: string): Promise<Review> {
  const { data } = await apiClient.put<Review>(`/api/v1/reviews/${reviewId}`,
    { body }, { headers: await csrfHeader() });
  return data;
}

export async function deleteReview(reviewId: number): Promise<void> {
  await apiClient.delete(`/api/v1/reviews/${reviewId}`, { headers: await csrfHeader() });
}
