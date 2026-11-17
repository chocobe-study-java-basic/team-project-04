import type { SamplePlace } from '../types/samplePlace.type';

/** 실제 시설·운영 정보가 아닌 UI 확인용 가상 장소입니다. */
export const samplePlaces: SamplePlace[] = [
  {
    id: 1,
    latitude: 37.37,
    longitude: 128.39,
    name: '눈마루 리조트',
    region: '강원',
    area: '평창군',
    description: '눈 덮인 슬로프에서 만나는 겨울 액티비티',
    artwork: 'snow',
    activities: [
      { name: '스키', category: '스키·보드', environment: '실외', seasons: ['겨울'] },
      { name: '스노보드', category: '스키·보드', environment: '실외', seasons: ['겨울'] },
    ],
  },
  {
    id: 2,
    latitude: 37.38,
    longitude: 128.66,
    name: '설원 파크',
    region: '강원',
    area: '정선군',
    description: '산의 풍경과 함께 즐기는 스노보드',
    artwork: 'snow',
    activities: [
      { name: '스노보드', category: '스키·보드', environment: '실외', seasons: ['겨울'] },
    ],
  },
  {
    id: 3,
    latitude: 38.075,
    longitude: 128.62,
    name: '파도 서프 스테이션',
    region: '강원',
    area: '양양군',
    description: '보드 위에서 시작하는 바다와의 첫 만남',
    artwork: 'water',
    activities: [
      { name: '서핑', category: '수상', environment: '실외', seasons: ['여름', '가을'] },
    ],
  },
  {
    id: 4,
    latitude: 37.83,
    longitude: 127.51,
    name: '숲길 어드벤처',
    region: '경기',
    area: '가평군',
    description: '초록빛 숲 사이로 달리는 짚라인',
    artwork: 'forest',
    activities: [
      { name: '짚라인', category: '체험', environment: '실외', seasons: ['봄', '여름', '가을'] },
    ],
  },
  {
    id: 5,
    latitude: 37.28,
    longitude: 127.01,
    name: '오름 클라이밍',
    region: '경기',
    area: '수원시',
    description: '계절에 관계없이 도전하는 나만의 루트',
    artwork: 'indoor',
    activities: [
      { name: '클라이밍', category: '실내', environment: '실내', seasons: ['봄', '여름', '가을', '겨울'] },
    ],
  },
  {
    id: 6,
    latitude: 37.78,
    longitude: 127.53,
    name: '물빛 액티비티 센터',
    region: '경기',
    area: '가평군',
    description: '여름에는 카약을, 겨울에는 실내 클라이밍을',
    artwork: 'water',
    activities: [
      { name: '카약', category: '수상', environment: '실외', seasons: ['여름'] },
      { name: '클라이밍', category: '실내', environment: '실내', seasons: ['겨울'] },
    ],
  },
];
