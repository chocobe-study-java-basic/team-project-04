'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import type { MouseEvent } from 'react';
import type { PlaceSearchFilters } from './place-list.type';
import { defaultFilters, readPlaceSearchParams, seasons, writePlaceSearchParams } from './placeSearchParams';
import PlaceSearchForm from '../PlaceSearchForm';
import PlacePhoto, { PlacePhotoCredit } from '@/domains/place/components/PlacePhoto/PlacePhoto';
import KakaoPlaceMap from '@/domains/place/components/KakaoPlaceMap/KakaoPlaceMap';
import CopyPlaceLinkButton from '@/domains/place/components/CopyPlaceLinkButton/CopyPlaceLinkButton';
import ServiceHeader from '../ServiceHeader';
import type { PlaceMapBounds, PlaceMapView } from '@/domains/place/types/kakaoMap.type';
import { readPlaceMapBounds, readPlaceMapParams, writePlaceMapParams } from '@/domains/place/lib/placeMapParams';
import { usePlaces } from '@/domains/place/hooks/usePlaces';
import { getPlaceDetailUrl, rememberPlaceListPosition, takePlaceListPosition } from '@/domains/place/lib/placeNavigation';
import './PlaceExplorer.css';

export default function PlaceExplorer() {
  const searchParams = useSearchParams();
  const { query: search, category, region, season, environment, sort } = readPlaceSearchParams(searchParams);
  const [formResetCount, setFormResetCount] = useState(0);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileMap, setMobileMap] = useState(false);
  const mapBounds = useMemo(() => readPlaceMapBounds(searchParams), [searchParams]);
  const listUrl = `/${searchParams.size ? `?${searchParams}` : ''}`;
  const mapView = readPlaceMapParams(searchParams);
  const rawPage = searchParams.get('page') ?? '0';
  const page = /^\d+$/.test(rawPage) && Number(rawPage) <= 1000000 ? Number(rawPage) : 0;
  const { catalog, places: placeQuery } = usePlaces({ query: search, category, region, season, environment, sort }, mapBounds, page);
  const loading = catalog.isPending || placeQuery.isPending;
  const failed = catalog.isError || placeQuery.isError;
  const categories = ['전체', ...(catalog.data?.categories.map(item => item.name) ?? [])];
  const places = useMemo(() => (placeQuery.data?.items ?? []).map(place => ({
    ...place, name: place.name ?? '이름 미확인',
  })), [placeQuery.data]);
  const mapPlaces = useMemo(() => places.flatMap(place => place.latitude !== null && place.longitude !== null
    ? [{ id: place.id, name: place.name, latitude: place.latitude, longitude: place.longitude }] : []), [places]);
  const selectedPlace = places.find(place => place.id === selectedId);

  function changeMapBounds(bounds: PlaceMapBounds, view: PlaceMapView) {
    const params = writePlaceMapParams(new URLSearchParams(window.location.search), view, bounds);
    if (params.toString() !== new URLSearchParams(window.location.search).toString()) params.delete('page');
    const nextUrl = `${window.location.pathname}?${params}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // 지도 이동은 현재 기록만 갱신해서 뒤로 가기에 지도 이동 기록이 쌓이지 않게 합니다.
    if (nextUrl !== currentUrl) window.history.replaceState(null, '', nextUrl);
  }

  useEffect(() => {
    if (loading || failed) return;
    const url = `${window.location.pathname}${window.location.search}`;
    // Next.js의 화면 전환과 레이아웃 반영 뒤 목록의 이전 스크롤을 적용합니다.
    const frame = window.requestAnimationFrame(() => {
      const y = takePlaceListPosition(url);
      if (y !== null) window.scrollTo({ top: y, behavior: 'instant' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, failed]);

  function rememberPosition(event: MouseEvent<HTMLAnchorElement>) {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      rememberPlaceListPosition();
    }
  }

  function changeFilters(changes: Partial<PlaceSearchFilters>) {
    const params = writePlaceSearchParams(new URLSearchParams(window.location.search), changes);
    params.delete('page');
    const queryString = params.toString();
    const nextUrl = `${window.location.pathname}${queryString ? `?${queryString}` : ''}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    if (nextUrl !== currentUrl) {
      // Next.js가 History API 변경을 useSearchParams와 동기화합니다. 스크롤은 유지합니다.
      window.history.pushState(null, '', nextUrl);
    }
  }

  function changePage(nextPage: number) {
    const params = new URLSearchParams(window.location.search);
    if (nextPage === 0) params.delete('page');
    else params.set('page', String(nextPage));
    window.history.pushState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}${window.location.hash}`);
  }

  function resetFilters() {
    changeFilters(defaultFilters);
    setFormResetCount(count => count + 1);
    setSelectedId(null);
  }

  return (
    <div className="outpick-explorer">
      <ServiceHeader
        search={(
          <PlaceSearchForm
            key={`${search}:${formResetCount}`}
            initialQuery={search}
            onSearch={query => changeFilters({ query })}
          />
        )}
        actions={(
          <>
            <span className="outpick-previewBadge hidden md:inline">탐색 화면 미리보기</span>
            <CopyPlaceLinkButton label="검색 링크 복사" />
          </>
        )}
      />

      {searchParams.has('withdrawn') && <p className="outpick-accountNotice" role="status">회원 탈퇴가 완료되었습니다.</p>}

      <div className="outpick-toolbar">
        <nav aria-label="활동 카테고리" className="outpick-categories">
          {categories.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => changeFilters({ category: item })}>{item}</button>
          ))}
        </nav>
        <div className="outpick-filters">
          <label><span className="outpick-srOnly">지역</span><select value={region} onChange={event => changeFilters({ region: event.target.value })}>
            <option value="">지역 전체</option>
            {region && !catalog.data?.regions.some(item => item.name === region) && <option value={region}>{region} (미제공)</option>}
            {catalog.data?.regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select></label>
          <label><span className="outpick-srOnly">시즌</span><select value={season} onChange={event => changeFilters({ season: event.target.value })}>
            <option value="">시즌 전체</option>{seasons.map(item => <option key={item}>{item}</option>)}
          </select></label>
          <label><span className="outpick-srOnly">실내외</span><select value={environment} onChange={event => changeFilters({ environment: event.target.value })}>
            <option value="">실내외 전체</option><option>실내</option><option>실외</option>
          </select></label>
        </div>
      </div>

      <main className="outpick-content">
        <section aria-labelledby="results-title" className={`outpick-results ${mobileMap ? 'outpick-mobileHidden' : ''}`}>
          <div className="outpick-intro">
            <p className="outpick-eyebrow">EXPLORE THE OUTSIDE</p>
            <h1 id="results-title">이번 주말, 밖에서 뭐 하지?</h1>
            <p className="outpick-subtitle">마음이 향하는 활동, 나에게 맞는 장소를 찾아보세요.</p>
          </div>
          <div className="outpick-resultToolbar">
            <p role="status">{loading ? '장소를 불러오고 있어요' : failed ? '조회 실패' : <>검색 결과 <strong>{placeQuery.data?.totalElements ?? 0}곳</strong></>}</p>
            <label className="outpick-sort"><span className="outpick-srOnly">정렬</span><select value={sort} onChange={event => changeFilters({ sort: event.target.value })}>
              <option value="name">이름순</option><option value="name-desc">이름 역순</option>
            </select></label>
            <button type="button" className="outpick-reset" onClick={resetFilters}>필터 초기화</button>
          </div>
          {places.some(place => place.name?.startsWith('[데모]')) && <p className="outpick-sampleNotice">[데모] 표시는 가상 장소이며 실제 시설 정보가 아닙니다.</p>}
          <p className="outpick-sampleNotice">지도를 이동하면 자동 검색해요. 지도에는 현재 페이지의 장소만 표시돼요.</p>
          {failed ? <div className="outpick-empty" role="alert"><h2>장소를 불러오지 못했어요</h2><p>서버 연결을 확인하고 다시 시도해 주세요.</p><button type="button" onClick={() => { if (catalog.isError) void catalog.refetch(); else void placeQuery.refetch(); }}>다시 시도</button></div> : loading ? <p role="status">장소 정보를 조회하고 있어요.</p> : places.length > 0 ? (
            <ul className="outpick-cards" aria-label="장소 목록">
              {places.map(place => (
                <li key={place.id}>
                  <article className={`outpick-placeCard ${selectedPlace?.id === place.id ? 'outpick-placeCardSelected' : ''}`}>
                    <button type="button" aria-pressed={selectedPlace?.id === place.id} className="outpick-card" onClick={() => setSelectedId(place.id)}>
                      <PlacePhoto place={place} />
                      <div className="outpick-cardBody">
                        <p className="outpick-location">{place.address ?? '주소 미확인'}</p>
                        <h2>{place.name}</h2>
                        <p className="outpick-description">상세에서 종목과 방문 정보를 확인해 보세요.</p>
                        {place.latitude === null || place.longitude === null ? <p className="outpick-description">위치 미확인 · 지도에는 표시되지 않아요.</p> : null}
                        <span className="outpick-selectHint">{selectedPlace?.id === place.id ? '선택한 장소' : '장소 선택'} <span aria-hidden="true">↗</span></span>
                      </div>
                    </button>
                    <PlacePhotoCredit place={place} />
                    <Link className="outpick-detailLink" aria-label={`${place.name} 상세 보기`} href={getPlaceDetailUrl(place.id, listUrl)} onClick={rememberPosition}>
                      상세 보기 <span aria-hidden="true">→</span>
                    </Link>
                  </article>
                </li>
              ))}
            </ul>
          ) : (
            <div className="outpick-empty">
              <span aria-hidden="true">⌕</span>
              <h2>조건에 맞는 장소가 없어요</h2>
              <p>지도를 이동·축소하거나 검색 조건을 바꿔 보세요.</p>
              <button type="button" onClick={resetFilters}>검색 필터 초기화</button>
            </div>
          )}
          {!loading && !failed && (page > 0 || (placeQuery.data?.totalElements ?? 0) > 20) && <nav className="outpick-pagination" aria-label="검색 결과 페이지">
            <button type="button" disabled={page === 0} onClick={() => changePage(page - 1)}>이전</button>
            <span>{page + 1}페이지</span>
            <button type="button" disabled={(page + 1) * 20 >= (placeQuery.data?.totalElements ?? 0)} onClick={() => changePage(page + 1)}>다음</button>
          </nav>}
          <footer className="outpick-footer">OUTPICK · 이번 주말, 밖에서 뭐 하지?</footer>
        </section>

        <aside aria-label="장소 지도" className={`outpick-mapPanel ${!mobileMap ? 'outpick-mapMobileHidden' : ''}`}>
          <KakaoPlaceMap places={mapPlaces} selectedId={selectedPlace?.id ?? null} onSelect={setSelectedId} onBoundsChange={changeMapBounds} view={mapView} />
          {selectedPlace && (
            <div className="outpick-mapSelection" aria-live="polite">
              <span>선택한 장소</span><h3>{selectedPlace.name}</h3>
              <p>{selectedPlace.address ?? '주소 미확인'}</p>
              <Link className="outpick-detailLink" href={getPlaceDetailUrl(selectedPlace.id, listUrl)} onClick={rememberPosition}>장소 상세 보기 →</Link>
            </div>
          )}
        </aside>
      </main>
      <button type="button" className="outpick-mobileToggle" aria-pressed={mobileMap} onClick={() => setMobileMap(!mobileMap)}>{mobileMap ? '목록 보기' : '지도 보기'}</button>
    </div>
  );
}
