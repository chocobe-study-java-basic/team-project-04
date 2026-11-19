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
  photos: ReviewPhoto[];
};

export type ReviewPhoto = { id: number; url: string; width: number; height: number };
export type ReviewReport = { id: number; reviewId: number; placeId: number; reviewBody: string;
  reason: string; status: string; createdAt: string };

export function photoUrl(photo: ReviewPhoto): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL;
  return base === '/' ? photo.url : new URL(photo.url, base).toString();
}

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

export async function uploadReviewPhoto(reviewId: number, file: File): Promise<ReviewPhoto> {
  const form = new FormData();
  form.append('file', file);
  const { data } = await apiClient.post<ReviewPhoto>(`/api/v1/reviews/${reviewId}/photos`, form,
    { headers: await csrfHeader() });
  return data;
}

export async function deleteReviewPhoto(reviewId: number, photoId: number): Promise<void> {
  await apiClient.delete(`/api/v1/reviews/${reviewId}/photos/${photoId}`, { headers: await csrfHeader() });
}

export async function reportReview(reviewId: number, reason: string): Promise<void> {
  await apiClient.post(`/api/v1/reviews/${reviewId}/reports`, { reason }, { headers: await csrfHeader() });
}

export async function pendingReviewReports(): Promise<ReviewReport[]> {
  const { data } = await apiClient.get<ReviewReport[]>('/api/v1/admin/review-reports');
  return data;
}

export async function hideReview(reviewId: number): Promise<void> {
  await apiClient.patch(`/api/v1/admin/reviews/${reviewId}/hide`, undefined, { headers: await csrfHeader() });
}

export async function dismissReviewReport(reportId: number): Promise<void> {
  await apiClient.patch(`/api/v1/admin/review-reports/${reportId}/dismiss`, undefined,
    { headers: await csrfHeader() });
}
