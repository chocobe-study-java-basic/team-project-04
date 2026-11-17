// @vitest-environment jsdom
import '../../../../../tests/setup-dom';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../../../../../tests/mocks/server';
import QueryProvider from '../../../_providers/QueryProvider';
import PlaceDetail from './PlaceDetail';
vi.mock('next/navigation', () => ({ useSearchParams: () => new URLSearchParams(window.location.search) }));
const base='https://api.outpick.test/api/v1/places';
const body={id:1,name:'DB 장소',nameAlias:null,description:'DB에 저장된 소개',address:'확인된 주소',latitude:37.37,longitude:128.39,homepage:'https://example.com/',operationStatus:null,reviewedAt:null,representativeImage:null,
  activities:[{placeActivityId:10,activityTypeId:20,activityTypeName:'스키',environmentType:'OUTDOOR',seasons:['WINTER']}],
  notices:[{placeNoticeId:30,title:'확인된 공지',content:'공지 본문',sourceRecordId:40}],
  sources:[{sourceRecordId:40,url:'https://example.com/source',verifiedFields:'주소',verifiedAt:'2026-11-13T12:00:00'}]};
const mount=()=>render(<QueryProvider><PlaceDetail /></QueryProvider>);
beforeEach(()=>{window.history.replaceState(null,'','/places/detail/?id=1'); server.use(http.get(base+'/1',()=>HttpResponse.json(body)));});
describe('DB 장소 상세 화면',()=>{
  it('서버의 종목·공지·출처와 주소를 표시한다',async()=>{
    mount(); expect(await screen.findByRole('heading',{level:1,name:'DB 장소'})).toBeTruthy();
    expect(screen.getByRole('heading',{name:'스키'})).toBeTruthy(); expect(screen.getByText('실외 · 겨울')).toBeTruthy();
    expect(screen.getByRole('heading',{name:'확인된 공지'})).toBeTruthy();
    expect(screen.getByRole('link',{name:'출처 안내 열기 ↗'}).getAttribute('href')).toBe('https://example.com/source');
    expect(screen.getByText('2026-11-13 12:00:00')).toBeTruthy();
    expect(screen.getByRole('link',{name:'카카오맵 길찾기 ↗'}).getAttribute('href')).toContain('37.37,128.39');
  });
  it('목록의 지도·필터 복귀 주소를 유지한다',async()=>{
    window.history.replaceState(null,'','/places/detail/?'+new URLSearchParams({id:'1',returnTo:'/?region=강원&lat=37&lng=128&level=8'}));
    mount(); await screen.findByRole('heading',{name:'DB 장소'});
    expect(new URL(screen.getByRole('link',{name:'← 장소 목록으로 돌아가기'}).getAttribute('href')!,window.location.origin).searchParams.get('level')).toBe('8');
  });
  it('404는 찾을 수 없음으로 안내한다',async()=>{
    server.use(http.get(base+'/1',()=>new HttpResponse(null,{status:404}))); mount();
    expect(await screen.findByRole('heading',{name:'장소를 찾을 수 없어요'})).toBeTruthy();
    expect(screen.queryByRole('button',{name:'장소 링크 복사'})).toBeNull();
  });
  it('서버 장애는 재시도 가능 오류이며 샘플 데이터로 대체하지 않는다',async()=>{
    server.use(http.get(base+'/1',()=>new HttpResponse(null,{status:500}))); mount();
    expect(await screen.findByRole('alert')).toBeTruthy(); expect(screen.getByRole('button',{name:'다시 시도'})).toBeTruthy();
    expect(screen.queryByRole('heading',{name:'DB 장소'})).toBeNull();
  });
  it('미확인 정보를 꾸미지 않고 위험한 링크는 렌더링하지 않는다',async()=>{
    server.use(http.get(base+'/1',()=>HttpResponse.json({...body,address:null,latitude:null,longitude:null,homepage:'javascript:alert(1)',activities:[],notices:[],sources:[]})));
    mount(); await screen.findByRole('heading',{name:'DB 장소'});
    expect(screen.getByText('등록된 활동 정보가 없습니다.')).toBeTruthy(); expect(screen.getByText('확인된 출처가 없습니다.')).toBeTruthy();
    expect(screen.queryByRole('link',{name:'공식 안내 열기 ↗'})).toBeNull(); expect(screen.queryByRole('link',{name:'카카오맵 길찾기 ↗'})).toBeNull();
  });
  it.each(['','?id=999oops','?id=0','?id=1&id=2'])('잘못된 ID는 요청 없이 안내한다: %s',query=>{
    window.history.replaceState(null,'','/places/detail/'+query); mount(); expect(screen.getByRole('heading',{name:'장소를 찾을 수 없어요'})).toBeTruthy();
  });
});
