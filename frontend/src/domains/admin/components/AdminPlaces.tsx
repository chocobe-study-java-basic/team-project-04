'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { usePlaceCatalog } from '@/domains/place/hooks/usePlaces';
import { createPlaceDraft } from '../api/adminApi';
import { adminPlacesQuery } from '../queries/adminPlacesQuery';
import { adminSummaryQuery } from '../queries/adminSummaryQuery';

const panelClassName = 'rounded-[18px] border border-[#e4e8f0] bg-white p-7 shadow-[0_12px_32px_#1a284008]';
const panelHeadingClassName = 'mb-2 text-[22px]';
const labelClassName = 'mt-[18px] flex flex-col gap-2 text-[13px] font-bold';
const fieldClassName = 'w-full rounded-[9px] border border-[#d9dfeb] bg-white p-3 text-[#1c2940] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a4cff]';

export default function AdminPlaces() {
  const queryClient = useQueryClient();
  const catalog = usePlaceCatalog();
  const recentPlaces = useQuery(adminPlacesQuery);
  const [selectedRegionId, setSelectedRegionId] = useState('');
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [description, setDescription] = useState('');
  const [latitude, setLatitude] = useState('');
  const [longitude, setLongitude] = useState('');
  const draft = useMutation({
    mutationFn: createPlaceDraft,
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: adminPlacesQuery.queryKey, exact: true }),
        queryClient.invalidateQueries({ queryKey: adminSummaryQuery.queryKey, exact: true }),
      ]);
    },
  });

  const regions = catalog.data?.regions ?? [];
  const places = recentPlaces.data ?? [];
  const regionId = regions.some(region => String(region.id) === selectedRegionId)
    ? selectedRegionId
    : String(regions[0]?.id ?? '');
  const loadFailed = catalog.isError || recentPlaces.isError;
  const loading = !loadFailed && (catalog.isPending || recentPlaces.isPending);
  const showFormAndList = catalog.data !== undefined && recentPlaces.data !== undefined;

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (draft.isPending || !regionId) return;

    draft.mutate({
      regionId: Number(regionId),
      name: name.trim(),
      address: address.trim(),
      description: description.trim(),
      latitude: Number(latitude),
      longitude: Number(longitude),
    }, {
      onSuccess: () => {
        setName('');
        setAddress('');
        setDescription('');
        setLatitude('');
        setLongitude('');
      },
    });
  }

  return <div><header className="mb-9 flex flex-col items-start justify-between gap-6 min-[721px]:flex-row"><div><p className="text-[11px] font-extrabold tracking-[.18em] text-[#5a4cff]">OUTPICK · PLACES</p>
    <h1 className="my-3 text-[clamp(32px,5vw,52px)] tracking-[-.05em]">장소 초안 등록</h1><span className="leading-[1.6] text-[#667489]">기본 정보를 저장한 뒤 검토할 수 있습니다. 저장만으로 지도에 공개되지 않습니다.</span></div></header>
  {loading && <p role="status">장소 정보를 불러오고 있어요.</p>}
  {loadFailed && <p role="alert" className="text-[#a73240]">장소 정보를 불러오지 못했어요. 새로고침해 주세요.</p>}
  {showFormAndList && <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
    <form className={panelClassName} onSubmit={submit}>
      <h2 className={panelHeadingClassName}>새 장소</h2><p className="text-[13px] text-[#748198]">먼저 이름, 위치, 소개를 입력해 주세요.</p>
      <label className={labelClassName}>지역<select className={fieldClassName} required value={regionId} onChange={event => setSelectedRegionId(event.target.value)}>
        {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
      {regions.length === 0 && <p className="text-[13px] text-[#a73240]">등록된 지역이 없습니다. 지역 데이터가 필요합니다.</p>}
      <label className={labelClassName}>장소명<input className={fieldClassName} required maxLength={50} value={name} onChange={event => setName(event.target.value)} /></label>
      <label className={labelClassName}>주소<input className={fieldClassName} required maxLength={100} value={address} onChange={event => setAddress(event.target.value)} /></label>
      <label className={labelClassName}>소개<textarea className={fieldClassName} maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)} /></label>
      <div className="grid grid-cols-2 gap-3.5">
        <label className={labelClassName}>위도<input className={fieldClassName} required type="number" min="-90" max="90" step="any" value={latitude}
          onChange={event => setLatitude(event.target.value)} /></label>
        <label className={labelClassName}>경도<input className={fieldClassName} required type="number" min="-180" max="180" step="any" value={longitude}
          onChange={event => setLongitude(event.target.value)} /></label>
      </div>
      <p className="mt-3 text-[13px] text-[#748198]">좌표를 확인한 뒤 입력해 주세요. 이 단계에서는 공개되지 않습니다.</p>
      {draft.isError && <p role="alert" className="text-[13px] text-[#a73240]">장소 초안을 저장하지 못했어요. 입력값을 확인한 뒤 다시 시도해 주세요.</p>}
      {draft.isSuccess && <p role="status" className="text-[13px] text-[#267454]">장소 #{draft.data.id}을 비공개 초안으로 저장했어요.</p>}
      <button className="mt-5 cursor-pointer rounded-[9px] border-0 bg-[#5147ff] px-5 py-[13px] font-bold text-white disabled:cursor-default disabled:opacity-50" disabled={draft.isPending || !regionId} type="submit">{draft.isPending ? '저장 중...' : '비공개 초안 저장'}</button>
    </form>
    <section className={panelClassName}><h2 className={panelHeadingClassName}>최근 등록한 장소</h2>
      {places.length === 0 ? <p className="text-[13px] text-[#748198]">등록된 장소가 없습니다.</p> : <ul className="mt-5 list-none p-0">{places.map(place => <li key={place.id} className="border-t border-[#edf0f5] py-[15px]">
        <div className="flex items-center justify-between gap-2"><strong>{place.name}</strong><span className={`rounded-[20px] px-2 py-1 text-[11px] ${place.status === 'PUBLISHED'
          ? 'bg-[#e8f7ef] text-[#267454]'
          : 'bg-[#f0efff] text-[#5147d9]'}`}>
          {place.status === 'DRAFT' ? '초안' : place.status === 'PUBLISHED' ? '공개' : '숨김'}</span></div>
        <small className="mt-[7px] block text-[#8190a1]">#{place.id} · {place.address}</small></li>)}</ul>}
    </section>
  </div>}
  </div>;
}
