'use client';

import { hashKey, skipToken, useQuery } from '@tanstack/react-query';
import { getPlaceCatalog, getPlaceDetail, searchPlaces } from '../api/placeApi';
import { placeQueryKeys } from '../queries/placeQueryKeys';
import type { PlacePage, PlaceSelection } from '../types/placeApi.type';
import type { PlaceMapBounds } from '../types/kakaoMap.type';

export function usePlaceCatalog() {
  return useQuery({ queryKey: placeQueryKeys.catalog, queryFn: ({ signal }) => getPlaceCatalog(signal) });
}

export function usePlaces(
  selection: PlaceSelection,
  bounds: PlaceMapBounds | null,
  page: number,
  mapSearch: { initialMarkers?: PlacePage } | null
) {
  const catalog = usePlaceCatalog();
  const { data: placeCatalog } = catalog;
  const { sort, ...filters } = selection;
  const places = useQuery({
    queryKey: [...placeQueryKeys.list(selection, bounds, page), placeCatalog] as const,
    queryFn: placeCatalog
      ? ({ signal }) => searchPlaces({ ...filters, sort }, placeCatalog, bounds, { page }, signal)
      : skipToken,
    placeholderData: mapSearch ? (previous, query) => {
      if (!query) return undefined;
      const [, , previousSelection, , , previousCatalog] = query.queryKey;
      return hashKey([previousSelection, previousCatalog]) === hashKey([selection, placeCatalog]) ? previous : undefined;
    } : undefined,
  });
  const markers = useQuery({
    queryKey: [...placeQueryKeys.markers(filters, bounds), placeCatalog] as const,
    queryFn: placeCatalog && bounds
      ? ({ signal }) => searchPlaces({ ...filters, sort: 'name' }, placeCatalog, bounds, { page: 0, size: 50 }, signal)
      : skipToken,
    placeholderData: mapSearch ? (previous, query) => {
      if (!query) return mapSearch.initialMarkers;
      const [, , previousFilters, , previousCatalog] = query.queryKey;
      return hashKey([previousFilters, previousCatalog]) === hashKey([filters, placeCatalog]) ? previous : undefined;
    } : undefined,
  });
  return { catalog, places, markers };
}

export function usePlaceDetail(id: number) {
  return useQuery({
    queryKey: placeQueryKeys.detail(id),
    enabled: Number.isSafeInteger(id) && id > 0,
    queryFn: ({ signal }) => getPlaceDetail(id, signal),
  });
}
