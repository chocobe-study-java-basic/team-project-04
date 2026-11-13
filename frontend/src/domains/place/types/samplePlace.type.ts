/** 화면 검증용 가상 장소입니다. 실제 API 응답 DTO와는 별도로 관리합니다. */
export type SamplePlace = {
  id: number;
  name: string;
  region: string;
  area: string;
  description: string;
  /** 지도 연동 검증용 임의 좌표이며 실제 시설 위치가 아닙니다. */
  latitude: number;
  longitude: number;
  artwork: 'snow' | 'water' | 'forest' | 'indoor';
  activities: {
    name: string;
    category: string;
    environment: '실내' | '실외';
    seasons: string[];
  }[];
};
