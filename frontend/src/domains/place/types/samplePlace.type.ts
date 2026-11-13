/** 화면 검증용 가상 장소입니다. 실제 API 응답 DTO와는 별도로 관리합니다. */
export type SamplePlace = {
  id: number;
  name: string;
  region: string;
  area: string;
  description: string;
  artwork: 'snow' | 'water' | 'forest' | 'indoor';
  activities: {
    name: string;
    category: string;
    environment: '실내' | '실외';
    seasons: string[];
  }[];
};
