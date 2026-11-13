/** 이 화면에서 사용하는 공식 Kakao Maps SDK 인터페이스의 부분 타입입니다. */
export type KakaoLatLng = { getLat(): number; getLng(): number };
export type KakaoBounds = { extend(position: KakaoLatLng): void };
export type KakaoMap = {
  setBounds(bounds: KakaoBounds, top?: number, right?: number, bottom?: number, left?: number): void;
  setCenter(position: KakaoLatLng): void;
  setLevel(level: number): void;
  panTo(position: KakaoLatLng): void;
  relayout(): void;
  addControl(control: object, position: number): void;
};
export type KakaoOverlay = { setMap(map: KakaoMap | null): void; setZIndex(index: number): void };
export type KakaoMapsApi = {
  load(callback: () => void): void;
  Map: new (element: HTMLElement, options: { center: KakaoLatLng; level: number }) => KakaoMap;
  LatLng: new (latitude: number, longitude: number) => KakaoLatLng;
  LatLngBounds: new () => KakaoBounds;
  CustomOverlay: new (options: { position: KakaoLatLng; content: HTMLElement; yAnchor: number; zIndex: number }) => KakaoOverlay;
  ZoomControl: new () => object;
  ControlPosition: { RIGHT: number };
};

declare global {
  interface Window {
    kakao?: { maps: KakaoMapsApi };
  }
}
