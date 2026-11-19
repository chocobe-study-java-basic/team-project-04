'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getPlaceCatalog } from '@/domains/place/api/placeApi';
import { createPlaceDraft, getAdminPlaces, type AdminPlace } from '../api/adminApi';
import AdminAccess from './AdminAccess';
import './admin.css';

type RegionOption = { id: number; name: string };

export default function AdminPlaces() {
  return <AdminAccess><PlacesContent /></AdminAccess>;
}

function PlacesContent() {
  const [regions, setRegions] = useState<RegionOption[]>([]);
  const [places, setPlaces] = useState<AdminPlace[]>([]);
  const [regionId, setRegionId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  useEffect(() => {
    let active = true;
    Promise.all([getPlaceCatalog(), getAdminPlaces()]).then(([catalog, found]) => {
      if (!active) return;
      setRegions(catalog.regions); setRegionId(String(catalog.regions[0]?.id ?? ''));
      setPlaces(found);
    }).catch(() => { if (active) setError('장소 정보를 불러오지 못했어요. 새로고침해 주세요.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError(''); setNotice('');
    try {
      const created = await createPlaceDraft({ regionId: Number(regionId), name: name.trim(),
        address: address.trim(), description: description.trim(),
        latitude: Number(latitude), longitude: Number(longitude) });
      setPlaces(current => [created, ...current].slice(0, 20));
      setName(''); setAddress(''); setDescription(''); setLatitude(''); setLongitude('');
      setNotice(`장소 #${created.id}을 비공개 초안으로 저장했어요.`);
    } catch { setError('장소 초안을 저장하지 못했어요. 입력값을 확인한 뒤 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }

  return <main className="admin-shell"><header className="admin-header"><div><p>OUTPICK · PLACES</p>
    <h1>장소 초안 등록</h1><span>기본 정보를 저장한 뒤 검토할 수 있습니다. 저장만으로 지도에 공개되지 않습니다.</span></div>
  <Link href="/admin/">← 대시보드</Link></header>
  {loading ? <p role="status">장소 정보를 불러오고 있어요.</p> : <div className="admin-placeLayout">
    <form className="admin-placeForm" onSubmit={event => void submit(event)}>
      <h2>새 장소</h2><p>먼저 이름, 위치, 소개를 입력해 주세요.</p>
      <label>지역<select required value={regionId} onChange={event => setRegionId(event.target.value)}>
        {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
      {regions.length === 0 && <p className="admin-error">등록된 지역이 없습니다. 지역 데이터가 필요합니다.</p>}
      <label>장소명<input required maxLength={50} value={name} onChange={event => setName(event.target.value)} /></label>
      <label>주소<input required maxLength={100} value={address} onChange={event => setAddress(event.target.value)} /></label>
      <label>소개<textarea maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <div className="admin-coordinates">
        <label>위도<input required type="number" min="-90" max="90" step="any" value={latitude}
          onChange={event => setLatitude(event.target.value)} /></label>
        <label>경도<input required type="number" min="-180" max="180" step="any" value={longitude}
          onChange={event => setLongitude(event.target.value)} /></label>
      </div>
      <p className="admin-hint">좌표를 확인한 뒤 입력해 주세요. 이 단계에서는 공개되지 않습니다.</p>
      {error && <p role="alert" className="admin-error">{error}</p>}
      {notice && <p role="status" className="admin-notice">{notice}</p>}
      <button disabled={busy || regions.length === 0} type="submit">{busy ? '저장 중...' : '비공개 초안 저장'}</button>
    </form>
    <section className="admin-placeList"><h2>최근 등록한 장소</h2>
      {places.length === 0 ? <p>등록된 장소가 없습니다.</p> : <ul>{places.map(place => <li key={place.id}>
        <div><strong>{place.name}</strong><span className={`admin-status admin-status-${place.status.toLowerCase()}`}>
          {place.status === 'DRAFT' ? '초안' : place.status === 'PUBLISHED' ? '공개' : '숨김'}</span></div>
        <small>#{place.id} · {place.address}</small></li>)}</ul>}
    </section>
  </div>}
  </main>;
}
