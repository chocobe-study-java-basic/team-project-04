import { useRef, useState } from 'react';
import type { FormEvent } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminDraftPlacesQuery } from '../../queries/adminPlacesQuery';
import AdminPlaceDetail from './AdminPlaceDetail';

const control = 'rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-indigo-600 disabled:opacity-50';

export default function AdminPlaceReview({ className }: { className: string }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState({ query: '', page: 0 });
  const [placeId, setPlaceId] = useState<number | null>(null);
  const headingRef = useRef<HTMLHeadingElement>(null);
  const places = useQuery(adminDraftPlacesQuery(filters));
  const result = places.data;
  const hasNext = result !== undefined && (result.page + 1) * result.size < result.totalElements;

  function searchPlaces(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFilters({ query: search.trim(), page: 0 });
  }

  function changePage(page: number) {
    setFilters(previous => ({ ...previous, page }));
    headingRef.current?.focus();
  }

  function returnToList() {
    setPlaceId(null);
    headingRef.current?.focus();
  }

  return (
    <section className={className} aria-labelledby="draft-places-heading">
      <h2 id="draft-places-heading" ref={headingRef} tabIndex={-1} className="mb-4 text-[22px]">
        검수 전 장소
      </h2>
      {placeId === null ? (
        <>
          <form onSubmit={searchPlaces} role="search" aria-label="검수 전 장소 검색">
            <label htmlFor="draft-place-search" className="text-sm font-semibold text-slate-700">장소명 또는 별칭</label>
            <div className="mt-1.5 flex items-center gap-2">
              <input id="draft-place-search" type="search" maxLength={100} value={search}
                onChange={event => setSearch(event.target.value)}
                className="min-w-0 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-indigo-600" />
              <button type="submit" className={`${control} shrink-0`}>검색</button>
            </div>
          </form>

          {places.isPending && <p className="mt-4 text-sm text-slate-600" role="status">장소 목록을 불러오고 있어요.</p>}
          {places.isError && (
            <div className="mt-4 space-y-2">
              <p role="alert" className="text-sm text-red-700">장소 목록을 불러오지 못했어요.</p>
              <button type="button" className={control} disabled={places.isFetching} onClick={() => void places.refetch()}>
                다시 시도
              </button>
            </div>
          )}
          {places.isSuccess && result && (
            <>
              {result.items.length === 0 ? (
                <p className="mt-4 text-sm text-slate-600">
                  {filters.query ? '검색 조건에 맞는 검수 전 장소가 없어요.' : '검수 전 장소가 없어요.'}
                </p>
              ) : (
                <ul className="mt-4 divide-y divide-slate-200 border-y border-slate-200">
                  {result.items.map(place => (
                    <li key={place.id}>
                      <button type="button" onClick={() => setPlaceId(place.id)}
                        className="block w-full rounded-md p-3 text-left hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-indigo-600">
                        <span className="block wrap-anywhere text-sm font-semibold text-slate-900">{place.name ?? '이름 없음'}</span>
                        <span className="mt-1 block wrap-anywhere text-xs text-slate-600">#{place.id} · {place.address ?? '주소 없음'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {(result.page > 0 || hasNext) && (
                <nav aria-label="검수 전 장소 페이지" className="mt-4 flex flex-wrap items-center justify-between gap-2">
                  <button type="button" className={control} disabled={result.page === 0} onClick={() => changePage(result.page - 1)}>이전</button>
                  <span className="text-sm text-slate-600">{result.page + 1}페이지</span>
                  <button type="button" className={control} disabled={!hasNext} onClick={() => changePage(result.page + 1)}>다음</button>
                </nav>
              )}
            </>
          )}
        </>
      ) : (
        <>
          <button type="button" className={control} onClick={returnToList}>목록으로</button>
          <AdminPlaceDetail placeId={placeId} />
        </>
      )}
    </section>
  );
}
