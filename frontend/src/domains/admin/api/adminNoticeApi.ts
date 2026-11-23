import { csrfHeader } from '@/domains/member/api/memberApi';
import { apiClient } from '@/shared/lib/http/apiClient';
import type { AdminNotice, AdminNoticeDraftInput, AdminNoticePage } from '../types/adminNotice.type';

function noticesPath(placeId: number) {
  return `/api/v1/admin/places/${placeId}/notices`;
}

export async function getAdminNotices({ placeId, page, signal }: {
  placeId: number;
  page: number;
  signal?: AbortSignal;
}): Promise<AdminNoticePage> {
  const { data } = await apiClient.get<AdminNoticePage>(noticesPath(placeId), { params: { page, size: 20 }, signal });
  return data;
}

export async function createNoticeDraft(placeId: number, input: AdminNoticeDraftInput): Promise<AdminNotice> {
  const { data } = await apiClient.post<AdminNotice>(noticesPath(placeId), input, { headers: await csrfHeader() });
  return data;
}

export async function updateNoticeDraft({ placeId, noticeId, input }: {
  placeId: number;
  noticeId: number;
  input: AdminNoticeDraftInput;
}): Promise<AdminNotice> {
  const { data } = await apiClient.patch<AdminNotice>(`${noticesPath(placeId)}/${noticeId}`, input, {
    headers: await csrfHeader(),
  });
  return data;
}
