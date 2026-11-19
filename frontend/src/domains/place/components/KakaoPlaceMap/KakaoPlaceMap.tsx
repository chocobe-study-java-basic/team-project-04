'use client';

import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '../../lib/loadKakaoMaps';
import { sameMapView } from '../../lib/placeMapParams';
import type { KakaoMap, KakaoMapsApi, KakaoOverlay, PlaceMapBounds, PlaceMapView, PlaceMapItem } from '../../types/kakaoMap.type';
import './KakaoPlaceMap.css';

type MapContext = { api: KakaoMapsApi; map: KakaoMap };
type Pin = { id: number; overlay: KakaoOverlay; button: HTMLButtonElement };

function fitPlaces({ api, map }: MapContext, places: PlaceMapItem[]) {
  if (places.length === 0) return;
  if (places.length === 1) {
    map.setCenter(new api.LatLng(places[0].latitude, places[0].longitude));
    map.setLevel(7);
    return;
  }
  const bounds = new api.LatLngBounds();
  places.forEach(place => bounds.extend(new api.LatLng(place.latitude, place.longitude)));
  map.setBounds(bounds, 70, 30, 180, 30);
}

export default function KakaoPlaceMap({ places, selectedId, onSelect, onBoundsChange, view = null }: {
  places: PlaceMapItem[];
  selectedId: number | null;
  onSelect: (id: number) => void;
  onBoundsChange?: (bounds: PlaceMapBounds, view: PlaceMapView) => void;
  view?: PlaceMapView | null;
}) {
  const container = useRef<HTMLDivElement>(null);
  const pins = useRef<Pin[]>([]);
  const previousView = useRef<PlaceMapView | null>(view);
  const latest = useRef({ places, onBoundsChange, view });
  const [context, setContext] = useState<MapContext | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { latest.current = { places, onBoundsChange, view }; }, [places, onBoundsChange, view]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let active = true;
    let observer: ResizeObserver | undefined;
    let disposeEvents: (() => void) | undefined;
    loadKakaoMaps().then(api => {
      if (!active) return;
      const initialView = latest.current.view;
      const map = new api.Map(element, {
        center: new api.LatLng(initialView?.lat ?? 37.6, initialView?.lng ?? 128),
        level: initialView?.level ?? 11,
      });
      map.addControl(new api.ZoomControl(), api.ControlPosition.RIGHT);
      const next = { api, map };
      let timer: ReturnType<typeof setTimeout> | undefined;
      let fitted = false;
      const cancelSearch = () => clearTimeout(timer);
      const search = () => {
        cancelSearch();
        timer = setTimeout(() => {
          if (!active || !element.clientWidth || !element.clientHeight) return;
          const bounds = map.getBounds();
          const sw = bounds.getSouthWest();
          const ne = bounds.getNorthEast();
          const center = map.getCenter();
          latest.current.onBoundsChange?.(
            { south: sw.getLat(), west: sw.getLng(), north: ne.getLat(), east: ne.getLng() },
            { lat: center.getLat(), lng: center.getLng(), level: map.getLevel() }
          );
        }, 300);
      };
      api.event.addListener(map, 'bounds_changed', cancelSearch);
      api.event.addListener(map, 'idle', search);
      disposeEvents = () => {
        cancelSearch();
        api.event.removeListener(map, 'bounds_changed', cancelSearch);
        api.event.removeListener(map, 'idle', search);
      };
      observer = new ResizeObserver(() => {
        if (element.clientWidth === 0 || element.clientHeight === 0) return;
        const center = map.getCenter();
        map.relayout();
        if (!fitted) {
          // 처음 보일 때만 후보를 모아 표시하고, 검색 결과 갱신 시에는 지도를 움직이지 않습니다.
          const savedView = latest.current.view;
          if (savedView) {
            map.setLevel(savedView.level);
            map.setCenter(new api.LatLng(savedView.lat, savedView.lng));
          } else fitPlaces(next, latest.current.places);
          fitted = true;
        } else map.setCenter(center);
        search();
      });
      observer.observe(element);
      setContext(next);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
      observer?.disconnect();
      disposeEvents?.();
      element.replaceChildren();
    };
  }, [attempt]);

  const lat = view?.lat;
  const lng = view?.lng;
  const level = view?.level;
  useEffect(() => {
    if (!context) return;
    const target = lat !== undefined && lng !== undefined && level !== undefined
      ? { lat, lng, level }
      : previousView.current ? { lat: 37.6, lng: 128, level: 11 } : null;
    previousView.current = lat !== undefined && lng !== undefined && level !== undefined ? { lat, lng, level } : null;
    if (!target) return;
    const center = context.map.getCenter();
    const current = { lat: center.getLat(), lng: center.getLng(), level: context.map.getLevel() };
    // URL 복원만 지도에 적용하고 지도에서 기록한 같은 좌표는 다시 적용하지 않습니다.
    if (sameMapView(current, target)) return;
    context.map.setLevel(target.level);
    context.map.setCenter(new context.api.LatLng(target.lat, target.lng));
  }, [context, lat, lng, level]);

  useEffect(() => {
    if (!context) return;
    const { api, map } = context;
    const disposers: (() => void)[] = [];
    pins.current = places.map(place => {
      const button = document.createElement('button');
      button.type = 'button';
      button.className = 'outpick-mapPin';
      button.textContent = place.name;
      button.setAttribute('aria-label', `${place.name} 지도에서 선택`);
      button.setAttribute('aria-pressed', 'false');
      const select = () => onSelect(place.id);
      button.addEventListener('click', select);
      const overlay = new api.CustomOverlay({
        position: new api.LatLng(place.latitude, place.longitude),
        content: button,
        yAnchor: 1.2,
        zIndex: 1,
      });
      overlay.setMap(map);
      disposers.push(() => { button.removeEventListener('click', select); overlay.setMap(null); });
      return { id: place.id, overlay, button };
    });
    return () => {
      disposers.forEach(dispose => dispose());
      pins.current = [];
    };
  }, [context, places, onSelect]);

  useEffect(() => {
    if (!context) return;
    pins.current.forEach(pin => {
      const selected = pin.id === selectedId;
      pin.button.setAttribute('aria-pressed', String(selected));
      pin.overlay.setZIndex(selected ? 10 : 1);
    });
  }, [context, places, selectedId]);

  useEffect(() => {
    if (!context || selectedId === null) return;
    const selected = latest.current.places.find(place => place.id === selectedId);
    if (selected) context.map.panTo(new context.api.LatLng(selected.latitude, selected.longitude));
  }, [context, selectedId]);

  return (
    <div className="outpick-mapStage">
      <div ref={container} className="outpick-mapCanvas" role="region" aria-label="장소 지도" />
      <p className="outpick-mapDisclaimer">{places.some(place => place.name?.startsWith('[데모]')) ? '현재 페이지의 장소 · 데모 좌표는 실제 시설 위치가 아닙니다' : '현재 페이지의 장소를 표시합니다'}</p>
      {!context && !error && <p className="outpick-mapMessage" role="status">지도를 불러오고 있어요.</p>}
      {error && (
        <div className="outpick-mapMessage" role="alert">
          <p>지도를 불러오지 못했어요. 목록으로 계속 살펴볼 수 있어요.</p>
          <p>카카오맵 사용 설정·허용 도메인 또는 네트워크 연결을 확인해 주세요.</p>
          <button type="button" onClick={() => { setError(false); setContext(null); setAttempt(value => value + 1); }}>지도 다시 불러오기</button>
        </div>
      )}
    </div>
  );
}
