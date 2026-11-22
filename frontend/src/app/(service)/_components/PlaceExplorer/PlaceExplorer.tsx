'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { MouseEvent } from 'react';
import { changePlaceSearchFilters, defaultFilters, placeSearchFormId, readPlaceSearchParams, seasons } from './placeSearchParams';
import PlacePhoto, { PlacePhotoCredit } from '@/domains/place/components/PlacePhoto/PlacePhoto';
import CopyPlaceLinkButton from '@/domains/place/components/CopyPlaceLinkButton/CopyPlaceLinkButton';
import KakaoPlaceMap from '@/domains/place/components/KakaoPlaceMap/KakaoPlaceMap';
import type { PlaceMapBounds, PlaceMapSelection, PlaceMapView } from '@/domains/place/types/kakaoMap.type';
import { readPlaceMapBounds, readPlaceMapParams, writePlaceMapParams } from '@/domains/place/lib/placeMapParams';
import { usePlaces } from '@/domains/place/hooks/usePlaces';
import { getPlaceDetailUrl, rememberPlaceListPosition, takePlaceListPosition } from '@/domains/place/lib/placeNavigation';
import './PlaceExplorer.css';

type MapSearch = { from: string; to: string };
type ListWindow = { key: string; count: number; restore?: NonNullable<ReturnType<typeof takePlaceListPosition>> };
const cardBatchSize = 10;

function countThroughCard(index: number) {
  return Math.max(cardBatchSize, Math.ceil((index + 1) / cardBatchSize) * cardBatchSize);
}

function mapSearchKey(params: URLSearchParams) {
  const key = new URLSearchParams(params);
  key.delete('sort');
  return key.toString();
}

export default function PlaceExplorer() {
  const searchParams = useSearchParams();
  const { query: search, category, region, season, environment, sort } = readPlaceSearchParams(searchParams);
  const [selection, setSelection] = useState<PlaceMapSelection | null>(null);
  const [mobileMap, setMobileMap] = useState(false);
  const [mapSearch, setMapSearch] = useState<MapSearch | null>(null);
  const resultsPane = useRef<HTMLElement>(null);
  const placeList = useRef<HTMLUListElement>(null);
  const listEnd = useRef<HTMLDivElement>(null);
  const mapBounds = useMemo(() => readPlaceMapBounds(searchParams), [searchParams]);
  const paramsKey = searchParams.toString();
  const listUrl = `/${paramsKey ? `?${paramsKey}` : ''}`;
  const mapView = readPlaceMapParams(searchParams);
  const areaKey = mapSearchKey(searchParams);
  const activeMapSearch = mapSearch?.to === areaKey;
  const filters = { query: search, category, region, season, environment };
  const { catalog, places: placeQuery } = usePlaces(filters, mapBounds, activeMapSearch);
  const searchingArea = activeMapSearch && placeQuery.fetchStatus !== 'idle';
  const listIsPrevious = placeQuery.isPlaceholderData;
  const loading = catalog.isPending || placeQuery.isPending;
  const failed = catalog.isError || placeQuery.isError;
  const listKey = JSON.stringify([filters, mapBounds, sort]);
  const [listWindow, setListWindow] = useState<ListWindow>(() => ({ key: listKey, count: cardBatchSize }));
  const categories = ['전체', ...(catalog.data?.categories.map(item => item.name) ?? [])];
  const locatedPlaces = useMemo(() => (placeQuery.data?.items ?? []).flatMap(place => {
    const { latitude, longitude } = place;
    if (latitude === null || longitude === null) return [];
    return [{ ...place, name: place.name ?? '이름 미확인', latitude, longitude }];
  }), [placeQuery.data]);
  const places = useMemo(() => sort === 'name-desc' ? locatedPlaces.toReversed() : locatedPlaces, [locatedPlaces, sort]);
  const selectedIndex = places.findIndex(place => place.id === selection?.id);
  const selectedPlace = places[selectedIndex];
  const selectedCardCount = countThroughCard(selectedIndex);
  const mapSearchFinished = activeMapSearch && !searchingArea && placeQuery.isSuccess && !listIsPrevious;
  if (mapSearchFinished) {
    if (selection && !selectedPlace) setSelection(null);
    setMapSearch(null);
  } else if (mapSearch && !activeMapSearch && mapSearch.from !== areaKey) {
    setMapSearch(null);
  }

  if (!listIsPrevious && listWindow.key !== listKey) {
    setListWindow({ key: listKey, count: activeMapSearch ? selectedCardCount : cardBatchSize });
  } else if (mapSearchFinished && selectedCardCount > listWindow.count) {
    setListWindow({ ...listWindow, count: selectedCardCount });
  }
  const visibleCount = Math.min(places.length, listWindow.count);
  const hasMore = visibleCount < places.length;

  function selectMapMarker(nextSelection: PlaceMapSelection) {
    const index = places.findIndex(place => place.id === nextSelection.id);
    if (index < 0) return;
    const count = countThroughCard(index);
    setListWindow(current => count > current.count ? { ...current, count } : current);
    setSelection(nextSelection);
    setMobileMap(false);
  }

  useEffect(() => {
    if (selection?.source !== 'map') return;
    const card = placeList.current?.querySelector(`[data-place-id="${selection.id}"]`);
    card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
  }, [selection]);

  function changeMapBounds(bounds: PlaceMapBounds, view: PlaceMapView) {
    const currentParams = new URLSearchParams(window.location.search);
    const params = writePlaceMapParams(currentParams, view, bounds);
    if (params.toString() !== currentParams.toString()) params.delete('page');
    const nextUrl = `${window.location.pathname}?${params}${window.location.hash}`;
    const currentUrl = `${window.location.pathname}${window.location.search}${window.location.hash}`;
    // 지도 이동은 현재 기록만 갱신해서 뒤로 가기에 지도 이동 기록이 쌓이지 않게 합니다.
    if (nextUrl === currentUrl) return;
    setMapSearch({ from: mapSearchKey(currentParams), to: mapSearchKey(params) });
    window.history.replaceState(null, '', nextUrl);
  }

  useEffect(() => {
    const sentinel = listEnd.current;
    if (!sentinel || listIsPrevious || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(entries => {
      if (entries.some(entry => entry.isIntersecting)) {
        setListWindow(current => current.key === listKey && current.count === visibleCount
          ? { ...current, count: visibleCount + cardBatchSize }
          : current);
      }
    });
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [hasMore, visibleCount, listIsPrevious, listKey, loading, failed]);

  useEffect(() => {
    if (loading || failed || listIsPrevious) return;
    const frame = window.requestAnimationFrame(() => {
      const restore = takePlaceListPosition(listUrl);
      if (!restore) return;
      const selectedIndex = places.findIndex(place => place.id === restore.selectedPlaceId);
      const restoredSelection = places[selectedIndex];
      if (restoredSelection) setSelection({ id: restoredSelection.id, source: 'restore' });

      const selectedCardCount = countThroughCard(selectedIndex);
      const detailIndex = places.findIndex(place => place.id === restore.placeId);
      if (!placeQuery.isFetchedAfterMount && detailIndex >= 0) {
        setListWindow({ key: listKey, count: Math.max(restore.visibleCount, detailIndex + 1, selectedCardCount), restore });
      } else if (restoredSelection) {
        setListWindow(current => ({ ...current, count: Math.max(current.count, selectedCardCount) }));
      }
    });
    return () => window.cancelAnimationFrame(frame);
  }, [loading, failed, listIsPrevious, listUrl, listKey, places, placeQuery.isFetchedAfterMount]);

  useEffect(() => {
    const restore = listWindow.restore;
    if (!restore) return;
    const frame = window.requestAnimationFrame(() => {
      const card = placeList.current?.querySelector(`[data-place-id="${restore.placeId}"]`);
      const pane = resultsPane.current;
      const options: ScrollToOptions = { top: restore.y, behavior: 'instant' };
      if (pane && getComputedStyle(pane).overflowY === 'auto') pane.scrollTo(options);
      else window.scrollTo(options);
      card?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [listWindow.restore]);

  function openPlaceDetail(event: MouseEvent<HTMLAnchorElement>, placeId: number) {
    if (event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey) {
      if (selection?.id !== placeId) setSelection({ id: placeId, source: 'list' });
      const pane = resultsPane.current;
      const scrollTop = pane && getComputedStyle(pane).overflowY === 'auto' ? pane.scrollTop : window.scrollY;
      rememberPlaceListPosition(placeId, visibleCount, placeId, scrollTop);
    }
  }

  function retrySearch() {
    if (catalog.isError) void catalog.refetch();
    else void placeQuery.refetch();
  }

  function resetFilters() {
    changePlaceSearchFilters(defaultFilters);
    setSelection(null);
  }

  return (
    <div className="outpick-explorer md:flex md:min-h-0 md:flex-col">
      {searchParams.has('withdrawn') && <p className="outpick-accountNotice md:shrink-0" role="status">회원 탈퇴가 완료되었습니다.</p>}

      <div className="outpick-toolbar md:shrink-0">
        <nav aria-label="활동 카테고리" className="outpick-categories">
          {categories.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => changePlaceSearchFilters({ category: item })}>{item}</button>
          ))}
        </nav>
        <div className="outpick-filters">
          <label><span className="outpick-srOnly">지역</span><select value={region} onChange={event => changePlaceSearchFilters({ region: event.target.value })}>
            <option value="">지역 전체</option>
            {region && !catalog.data?.regions.some(item => item.name === region) && <option value={region}>{region} (미제공)</option>}
            {catalog.data?.regions.map(item => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select></label>
          <label><span className="outpick-srOnly">시즌</span><select value={season} onChange={event => changePlaceSearchFilters({ season: event.target.value })}>
            <option value="">시즌 전체</option>{seasons.map(item => <option key={item}>{item}</option>)}
          </select></label>
          <label><span className="outpick-srOnly">실내외</span><select value={environment} onChange={event => changePlaceSearchFilters({ environment: event.target.value })}>
            <option value="">실내외 전체</option><option>실내</option><option>실외</option>
          </select></label>
        </div>
      </div>

      <main className="outpick-content md:min-h-0 md:flex-1">
        <section
          ref={resultsPane}
          aria-labelledby="results-title"
          className={`outpick-results md:overflow-y-auto md:overscroll-y-contain ${mobileMap ? 'outpick-mobileHidden' : ''}`}
        >
          <div className="outpick-intro">
            <p className="outpick-eyebrow">EXPLORE THE OUTSIDE</p>
            <h1 id="results-title">이번 주말, 밖에서 뭐 하지?</h1>
            <p className="outpick-subtitle">마음이 향하는 활동, 나에게 맞는 장소를 찾아보세요.</p>
          </div>
          <div className="outpick-resultToolbar">
            <p role="status">{loading ? '장소를 불러오고 있어요' : failed ? '조회 실패' : <>검색 결과 <strong>{placeQuery.data?.totalElements ?? 0}곳</strong></>}</p>
            <label className="outpick-sort"><span className="outpick-srOnly">정렬</span><select value={sort} onChange={event => changePlaceSearchFilters({ sort: event.target.value })}>
              <option value="name">이름순</option><option value="name-desc">이름 역순</option>
            </select></label>
            <button type="reset" form={placeSearchFormId} className="outpick-reset" onClick={resetFilters}>필터 초기화</button>
          </div>
          <div className="mt-2">
            <CopyPlaceLinkButton label="검색 링크 복사" />
          </div>
          {places.some(place => place.name?.startsWith('[데모]')) && <p className="outpick-sampleNotice">[데모] 표시는 가상 장소이며 실제 시설 정보가 아닙니다.</p>}
          <p className="outpick-sampleNotice" role="status">{searchingArea ? '이 영역의 장소를 찾는 중' : '지도를 이동하면 자동 검색해요.'}</p>
          {failed ? <div className="outpick-empty" role="alert"><h2>장소를 불러오지 못했어요</h2><p>서버 연결을 확인하고 다시 시도해 주세요.</p><button type="button" onClick={retrySearch}>다시 시도</button></div> : loading ? <p role="status">장소 정보를 조회하고 있어요.</p> : places.length > 0 ? (
            <ul ref={placeList} className="outpick-cards" aria-label="장소 목록">
              {places.slice(0, visibleCount).map(place => (
                <li key={place.id}>
                  <article data-place-id={place.id} className={`outpick-placeCard ${selectedPlace?.id === place.id ? 'outpick-placeCardSelected' : ''}`}>
                    <button type="button" aria-pressed={selectedPlace?.id === place.id} className="outpick-card" onClick={() => setSelection({ id: place.id, source: 'list' })}>
                      <PlacePhoto place={place} />
                      <div className="outpick-cardBody">
                        <p className="outpick-location">{place.address ?? '주소 미확인'}</p>
                        <h2>{place.name}</h2>
                        <p className="outpick-description">상세에서 종목과 방문 정보를 확인해 보세요.</p>
                        <span className="outpick-selectHint">{selectedPlace?.id === place.id ? '선택한 장소' : '장소 선택'} <span aria-hidden="true">↗</span></span>
                      </div>
                    </button>
                    <PlacePhotoCredit place={place} />
                    <Link className="outpick-detailLink" aria-label={`${place.name} 상세 보기`} href={getPlaceDetailUrl(place.id, listUrl)} onClick={event => openPlaceDetail(event, place.id)}>
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
              <button type="reset" form={placeSearchFormId} onClick={resetFilters}>검색 필터 초기화</button>
            </div>
          )}
          {!loading && !failed && hasMore && <div ref={listEnd} aria-hidden="true" className="h-px" />}
          <footer className="outpick-footer">OUTPICK · 이번 주말, 밖에서 뭐 하지?</footer>
        </section>

        <aside aria-label="장소 지도" className={`outpick-mapPanel ${!mobileMap ? 'outpick-mapMobileHidden' : ''}`}>
          <KakaoPlaceMap places={locatedPlaces} totalPlaces={placeQuery.data?.totalElements} searchingArea={searchingArea} selection={selectedPlace ? selection : null} onSelect={selectMapMarker} onBoundsChange={changeMapBounds} view={mapView} hasSearchBounds={mapBounds !== null} />
          {failed && mobileMap && (
            <div className="outpick-mapMessage" role="alert">
              <p>지도에 표시할 장소를 불러오지 못했어요.</p>
              <button type="button" onClick={retrySearch}>다시 시도</button>
            </div>
          )}
          {selectedPlace && (
            <div className="outpick-mapSelection" aria-live="polite">
              <span>선택한 장소</span><h3>{selectedPlace.name}</h3>
              <p>{selectedPlace.address ?? '주소 미확인'}</p>
              <Link className="outpick-detailLink" href={getPlaceDetailUrl(selectedPlace.id, listUrl)} onClick={event => openPlaceDetail(event, selectedPlace.id)}>장소 상세 보기 →</Link>
            </div>
          )}
        </aside>
      </main>
      <button type="button" className="outpick-mobileToggle" aria-pressed={mobileMap} onClick={() => setMobileMap(!mobileMap)}>{mobileMap ? '목록 보기' : '지도 보기'}</button>
    </div>
  );
}
