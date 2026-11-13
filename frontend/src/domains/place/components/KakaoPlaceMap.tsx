'use client';

import { useEffect, useRef, useState } from 'react';
import { loadKakaoMaps } from '../lib/loadKakaoMaps';
import type { KakaoMap, KakaoMapsApi, KakaoOverlay } from '../types/kakaoMap.type';
import type { SamplePlace } from '../types/samplePlace.type';
import './KakaoPlaceMap.css';

type MapContext = { api: KakaoMapsApi; map: KakaoMap };
type Pin = { id: number; overlay: KakaoOverlay; button: HTMLButtonElement };

function fitPlaces({ api, map }: MapContext, places: SamplePlace[]) {
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

export default function KakaoPlaceMap({ places, selectedId, onSelect }: {
  places: SamplePlace[];
  selectedId: number | null;
  onSelect: (id: number) => void;
}) {
  const container = useRef<HTMLDivElement>(null);
  const pins = useRef<Pin[]>([]);
  const latest = useRef({ places, selectedId });
  const [context, setContext] = useState<MapContext | null>(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => { latest.current = { places, selectedId }; }, [places, selectedId]);

  useEffect(() => {
    const element = container.current;
    if (!element) return;
    let active = true;
    let observer: ResizeObserver | undefined;
    loadKakaoMaps().then(api => {
      if (!active) return;
      const map = new api.Map(element, { center: new api.LatLng(37.6, 128), level: 11 });
      map.addControl(new api.ZoomControl(), api.ControlPosition.RIGHT);
      const next = { api, map };
      observer = new ResizeObserver(() => {
        if (element.clientWidth === 0 || element.clientHeight === 0) return;
        map.relayout();
        fitPlaces(next, latest.current.places);
        const selected = latest.current.places.find(place => place.id === latest.current.selectedId);
        if (selected) map.panTo(new api.LatLng(selected.latitude, selected.longitude));
      });
      observer.observe(element);
      setContext(next);
    }).catch(() => {
      if (active) setError(true);
    });
    return () => {
      active = false;
      observer?.disconnect();
      element.replaceChildren();
    };
  }, [attempt]);

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
    fitPlaces(context, places);
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
    const selected = places.find(place => place.id === selectedId);
    if (selected) context.map.panTo(new context.api.LatLng(selected.latitude, selected.longitude));
  }, [context, places, selectedId]);

  return (
    <div className="outpick-mapStage">
      <div ref={container} className="outpick-mapCanvas" role="region" aria-label="샘플 장소 지도" />
      <p className="outpick-mapDisclaimer">샘플 위치 · 실제 시설 위치가 아닙니다</p>
      {!context && !error && <p className="outpick-mapMessage" role="status">지도를 불러오고 있어요.</p>}
      {error && (
        <div className="outpick-mapMessage" role="alert">
          <p>지도를 불러오지 못했어요. 목록으로 계속 살펴볼 수 있어요.</p>
          <p>카카오맵 사용 설정·허용 도메인 또는 네트워크 연결을 확인해 주세요.</p>
          <button type="button" onClick={() => { setError(false); setContext(null); setAttempt(value => value + 1); }}>지도 다시 불러오기</button>
        </div>
      )}
      {context && places.length === 0 && <p className="outpick-mapMessage" role="status">조건에 맞는 장소가 없어요.</p>}
    </div>
  );
}
