import type { PlaceSelection } from '../types/placeApi.type';
import type { PlaceMapBounds } from '../types/kakaoMap.type';

export const placeQueryKeys = {
  catalog: ['places', 'filters'] as const,
  list: (selection: PlaceSelection, bounds: PlaceMapBounds | null, page: number) => ['places', 'list', selection, bounds, page] as const,
  markers: (filters: Omit<PlaceSelection, 'sort'>, bounds: PlaceMapBounds | null) => ['places', 'markers', filters, bounds] as const,
  detail: (id: number) => ['places', 'detail', id] as const,
};
