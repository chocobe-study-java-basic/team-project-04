'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { usePlaceCatalog } from '@/domains/place/hooks/usePlaces';
import { createPlaceDraft } from '../api/adminApi';
import { adminDraftPlacesKey } from '../queries/adminPlacesQuery';
import { adminSummaryQuery } from '../queries/adminSummaryQuery';
import AdminPlaceReview from './AdminPlaceReview/AdminPlaceReview';

const panelClassName = 'min-w-0 rounded-[18px] border border-[#e4e8f0] bg-white p-4 shadow-[0_12px_32px_#1a284008] sm:p-6';
const labelClassName = 'mt-[18px] flex flex-col gap-2 text-[13px] font-bold';
const fieldClassName = 'w-full min-w-0 rounded-[9px] border border-[#d9dfeb] bg-white p-3 text-[#1c2940] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5a4cff]';

export default function AdminPlaces() {
  const queryClient = useQueryClient();
  const catalog = usePlaceCatalog();
  const [latestDraftId, setLatestDraftId] = useState<number>();
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
        queryClient.invalidateQueries({ queryKey: adminDraftPlacesKey }),
        queryClient.invalidateQueries({ queryKey: adminSummaryQuery.queryKey, exact: true }),
      ]);
    },
  });

  const regions = catalog.data?.regions ?? [];
  const regionId = regions.some(region => String(region.id) === selectedRegionId)
    ? selectedRegionId
    : String(regions[0]?.id ?? '');

  function submit(event: FormEvent<HTMLFormElement>) {
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
      onSuccess: place => {
        setLatestDraftId(place.id);
        setName('');
        setAddress('');
        setDescription('');
        setLatitude('');
        setLongitude('');
      },
    });
  }

  return (
    <div>
      <header className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-[clamp(32px,5vw,52px)] tracking-[-.05em]">장소 관리</h1>
        <a href="#new-place-heading" className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 lg:hidden">
          새 장소 등록
        </a>
      </header>
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,.9fr)]">
        <AdminPlaceReview key={latestDraftId} className={panelClassName} />
        <form className={panelClassName} aria-labelledby="new-place-heading" onSubmit={submit}>
          <h2 id="new-place-heading" tabIndex={-1} className="mb-2 scroll-mt-24 text-[22px]">새 장소</h2>
          <label className={labelClassName}>
            지역
            <select className={fieldClassName} required value={regionId} onChange={event => setSelectedRegionId(event.target.value)}>
              {regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}
            </select>
          </label>
          {catalog.isPending && <p role="status">지역을 불러오고 있어요.</p>}
          {catalog.isError && <p role="alert" className="text-[13px] text-[#a73240]">지역을 불러오지 못했어요.</p>}
          {catalog.isSuccess && regions.length === 0 && <p className="text-[13px] text-[#a73240]">등록된 지역이 없어요.</p>}
          <label className={labelClassName}>
            장소명
            <input className={fieldClassName} required maxLength={50} value={name} onChange={event => setName(event.target.value)} />
          </label>
          <label className={labelClassName}>
            주소
            <input className={fieldClassName} required maxLength={100} value={address} onChange={event => setAddress(event.target.value)} />
          </label>
          <label className={labelClassName}>
            소개
            <textarea className={fieldClassName} maxLength={2000} rows={4} value={description} onChange={event => setDescription(event.target.value)} />
          </label>
          <div className="grid grid-cols-2 gap-3.5">
            <label className={labelClassName}>
              위도
              <input className={fieldClassName} required type="number" min="-90" max="90" step="any" value={latitude}
                onChange={event => setLatitude(event.target.value)} />
            </label>
            <label className={labelClassName}>
              경도
              <input className={fieldClassName} required type="number" min="-180" max="180" step="any" value={longitude}
                onChange={event => setLongitude(event.target.value)} />
            </label>
          </div>
          <p className="mt-3 text-[13px] text-[#748198]">좌표를 확인한 뒤 입력해 주세요. 이 단계에서는 공개되지 않습니다.</p>
          {draft.isError && <p role="alert" className="text-[13px] text-[#a73240]">장소 초안을 저장하지 못했어요. 입력값을 확인한 뒤 다시 시도해 주세요.</p>}
          {draft.isSuccess && <p role="status" className="text-[13px] text-[#267454]">장소 #{draft.data.id}을 비공개 초안으로 저장했어요.</p>}
          <button className="mt-5 cursor-pointer rounded-[9px] border-0 bg-[#5147ff] px-5 py-[13px] font-bold text-white disabled:cursor-default disabled:opacity-50"
            disabled={draft.isPending || !regionId} type="submit">
            {draft.isPending ? '저장 중...' : '비공개 초안 저장'}
          </button>
        </form>
      </div>
    </div>
  );
}
