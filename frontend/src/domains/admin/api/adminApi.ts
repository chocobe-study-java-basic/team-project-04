import { apiClient } from '@/shared/lib/http/apiClient';
import { csrfHeader } from '@/domains/member/api/memberApi';

export type AdminSummary = { pendingReports: number; draftPlaces: number; publishedPlaces: number };
export type AdminPlace = { id: number; name: string; address: string; status: 'DRAFT' | 'PUBLISHED' | 'HIDDEN' };
export type PlaceDraftInput = { regionId: number; name: string; address: string;
  description: string; latitude: number; longitude: number };

export async function getAdminSummary(signal?: AbortSignal): Promise<AdminSummary> {
  return (await apiClient.get<AdminSummary>('/api/v1/admin/dashboard', { signal })).data;
}
export async function getAdminPlaces(signal?: AbortSignal): Promise<AdminPlace[]> {
  return (await apiClient.get<AdminPlace[]>('/api/v1/admin/places', { signal })).data;
}
export async function createPlaceDraft(input: PlaceDraftInput): Promise<AdminPlace> {
  return (await apiClient.post<AdminPlace>('/api/v1/admin/places', input,
    { headers: await csrfHeader() })).data;
}
