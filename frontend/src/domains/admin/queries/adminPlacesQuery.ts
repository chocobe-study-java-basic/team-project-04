import { queryOptions } from '@tanstack/react-query';
import { getAdminPlaces } from '../api/adminApi';

export const adminPlacesQuery = queryOptions({
  queryKey: ['admin', 'places'],
  queryFn: ({ signal }) => getAdminPlaces(signal),
});
