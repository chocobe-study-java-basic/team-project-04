'use client';

import { useQuery } from '@tanstack/react-query';
import { getPlaceCatalog, getPlaceDetail, searchPlaces } from '../api/placeApi';
import { placeQueryKeys } from '../queries/placeQueryKeys';
import type { PlaceSelection } from '../types/placeApi.type';
import type { PlaceMapBounds } from '../types/kakaoMap.type';

export function usePlaceCatalog() {
  return useQuery({ queryKey: placeQueryKeys.catalog, queryFn: ({ signal }) => getPlaceCatalog(signal) });
}

export function usePlaces(selection: PlaceSelection, bounds: PlaceMapBounds | null, page: number) {
  const catalog = usePlaceCatalog();
  const places = useQuery({
    queryKey: [...placeQueryKeys.list(selection, bounds, page), catalog.data],
    enabled: !!catalog.data,
    queryFn: ({ signal }) => searchPlaces(selection, catalog.data!, bounds, page, signal),
  });
  return { catalog, places };
}

export function usePlaceDetail(id: number) {
  return useQuery({
    queryKey: placeQueryKeys.detail(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    queryFn: ({ signal }) => getPlaceDetail(id, signal),
  });
}
