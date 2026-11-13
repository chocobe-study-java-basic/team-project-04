export type PlaceSummary = {
  id: number;
  name: string | null;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
};
export type PlacePage = { items: PlaceSummary[]; page: number; size: number; totalElements: number };
export type PlaceCatalog = {
  regions: { id: number; name: string }[];
  categories: { id: number; name: string; activityTypeIds: number[] }[];
};
export type PlaceSelection = { query: string; category: string; region: string; season: string; environment: string; sort: string };
export type PlaceDetailData = PlaceSummary & {
  nameAlias: string | null;
  description: string | null;
  homepage: string | null;
  operationStatus: string | null;
  reviewedAt: string | null;
  representativeImage: string | null;
  activities: { placeActivityId: number; activityTypeId: number; activityTypeName: string; environmentType: string | null; seasons: string[] }[];
  notices: { placeNoticeId: number; title: string | null; content: string | null; priority: string | null; validFrom: string | null; validUntil: string | null; sourceRecordId: number }[];
  sources: { sourceRecordId: number; type: string | null; url: string | null; verifiedFields: string | null; originUpdatedAt: string | null; verifiedAt: string }[];
};
