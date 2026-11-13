'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { FormEvent } from 'react';
import { samplePlaces } from './samplePlaces';
import './PlaceExplorer.css';

const categories = ['전체', '수상', '산악', '항공', '스키·보드', '체험', '실내'];

export default function PlaceExplorer() {
  const [query, setQuery] = useState('');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('전체');
  const [region, setRegion] = useState('');
  const [season, setSeason] = useState('');
  const [environment, setEnvironment] = useState('');
  const [sort, setSort] = useState('name');
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [mobileMap, setMobileMap] = useState(false);

  const places = samplePlaces.filter(place =>
    (!search || place.name.includes(search))
    && (!region || place.region === region)
    && place.activities.some(activity =>
      (category === '전체' || activity.category === category)
      && (!season || activity.seasons.includes(season))
      && (!environment || activity.environment === environment)
    )
  ).sort((a, b) => sort === 'name'
    ? a.name.localeCompare(b.name, 'ko') || a.id - b.id
    : b.name.localeCompare(a.name, 'ko') || a.id - b.id);
  const selectedPlace = places.find(place => place.id === selectedId);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearch(query.trim());
  }

  function resetFilters() {
    setQuery('');
    setSearch('');
    setCategory('전체');
    setRegion('');
    setSeason('');
    setEnvironment('');
    setSort('name');
    setSelectedId(null);
  }

  return (
    <div className="outpick-explorer">
      <header className="outpick-header">
        <Link href="/" className="outpick-brand" aria-label="OUTPICK 홈">
          OUTPICK <span>밖으로, 더 멀리</span>
        </Link>
        <form className="outpick-search" onSubmit={submitSearch} role="search">
          <label htmlFor="place-search" className="outpick-srOnly">장소명 검색</label>
          <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
            <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <input id="place-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="어떤 장소를 찾고 있나요?" />
          <button type="submit">검색</button>
        </form>
        <span className="outpick-previewBadge">탐색 화면 미리보기</span>
      </header>

      <div className="outpick-toolbar">
        <nav aria-label="활동 카테고리" className="outpick-categories">
          {categories.map(item => (
            <button key={item} type="button" aria-pressed={category === item} onClick={() => setCategory(item)}>{item}</button>
          ))}
        </nav>
        <div className="outpick-filters">
          <label><span className="outpick-srOnly">지역</span><select value={region} onChange={event => setRegion(event.target.value)}>
            <option value="">지역 전체</option><option value="강원">강원</option><option value="경기">경기</option>
          </select></label>
          <label><span className="outpick-srOnly">시즌</span><select value={season} onChange={event => setSeason(event.target.value)}>
            <option value="">시즌 전체</option>{['봄', '여름', '가을', '겨울'].map(item => <option key={item}>{item}</option>)}
          </select></label>
          <label><span className="outpick-srOnly">실내외</span><select value={environment} onChange={event => setEnvironment(event.target.value)}>
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
            <p role="status">검색 결과 <strong>{places.length}곳</strong></p>
            <label className="outpick-sort"><span className="outpick-srOnly">정렬</span><select value={sort} onChange={event => setSort(event.target.value)}>
              <option value="name">이름순</option><option value="name-desc">이름 역순</option>
            </select></label>
            <button type="button" className="outpick-reset" onClick={resetFilters}>필터 초기화</button>
          </div>
          <p className="outpick-sampleNotice">샘플 데이터 · 실제 시설 및 운영 정보가 아닙니다.</p>
          {places.length > 0 ? (
            <ul className="outpick-cards" aria-label="장소 목록">
              {places.map(place => (
                <li key={place.id}>
                  <button type="button" aria-pressed={selectedPlace?.id === place.id} className="outpick-card" onClick={() => setSelectedId(place.id)}>
                    <div className={`outpick-artwork outpick-${place.artwork}`} aria-hidden="true">
                      <span className="outpick-artworkSun" /><span className="outpick-artworkHill" /><span className="outpick-artworkHillBack" />
                      <span className="outpick-artworkLabel">OUTPICK · SAMPLE</span>
                    </div>
                    <div className="outpick-cardBody">
                      <p className="outpick-location">{place.region} · {place.area}</p>
                      <h2>{place.name}</h2>
                      <p className="outpick-description">{place.description}</p>
                      <div className="outpick-tags">{place.activities.map(activity => <span key={activity.name}>{activity.name}</span>)}</div>
                      <span className="outpick-selectHint">{selectedPlace?.id === place.id ? '선택한 장소' : '장소 선택'} <span aria-hidden="true">↗</span></span>
                    </div>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <div className="outpick-empty">
              <span aria-hidden="true">⌕</span>
              <h2>조건에 맞는 장소가 없어요</h2>
              <p>지역이나 활동 조건을 바꾸고 다시 찾아보세요.</p>
              <button type="button" onClick={resetFilters}>전체 장소 보기</button>
            </div>
          )}
          <footer className="outpick-footer">OUTPICK · 이번 주말, 밖에서 뭐 하지?</footer>
        </section>

        <aside aria-label="지도 연동 예정 영역" className={`outpick-mapPanel ${!mobileMap ? 'outpick-mapMobileHidden' : ''}`}>
          <div className="outpick-mapPlaceholder">
            <div className="outpick-mapIcon" aria-hidden="true">↗</div>
            <p className="outpick-eyebrow">NEXT STOP, OUTSIDE</p>
            <h2>지도에서 만날 다음 장소</h2>
            <p>카카오맵 연동 예정 영역입니다.<br />지금은 목록에서 장소를 선택해 보세요.</p>
            <span className="outpick-mapStatus">실제 지도 및 위치 정보 미표시</span>
          </div>
          <div className="outpick-mapSelection" aria-live="polite">
            {selectedPlace ? <><span>선택한 샘플 장소</span><h3>{selectedPlace.name}</h3><p>{selectedPlace.region} · {selectedPlace.area} · {selectedPlace.activities.map(activity => activity.name).join(' / ')}</p></> : <><h3>어디로 떠나볼까요?</h3><p>카드를 선택하면 이곳에 장소 요약이 표시됩니다.</p></>}
            <p className="outpick-pending">장소 상세 페이지 연결은 다음 작업에서 진행합니다.</p>
          </div>
        </aside>
      </main>
      <button type="button" className="outpick-mobileToggle" aria-pressed={mobileMap} onClick={() => setMobileMap(!mobileMap)}>{mobileMap ? '목록 보기' : '지도 영역 보기'}</button>
    </div>
  );
}
