'use client';

import { useState } from 'react';
import type { FormEvent } from 'react';

/** 입력 중인 값만 로컬에 두고, 제출한 검색어는 부모가 URL에 반영합니다. */
export default function PlaceSearchForm({ initialQuery, onSearch }: {
  initialQuery: string;
  onSearch: (query: string) => void;
}) {
  const [query, setQuery] = useState(initialQuery);

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSearch(query.trim());
  }

  return (
    <form className="outpick-search" onSubmit={submitSearch} role="search">
      <label htmlFor="place-search" className="outpick-srOnly">장소명 검색</label>
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <circle cx="10.5" cy="10.5" r="6.5" stroke="currentColor" strokeWidth="1.6" />
        <path d="m16 16 4 4" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input id="place-search" value={query} onChange={event => setQuery(event.target.value)} placeholder="어떤 장소를 찾고 있나요?" />
      <button type="submit">검색</button>
    </form>
  );
}
