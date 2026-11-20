'use client';

import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import MemberProfileMenu from '@/domains/member/components/MemberProfileMenu/MemberProfileMenu';
import CopyPlaceLinkButton from '@/domains/place/components/CopyPlaceLinkButton/CopyPlaceLinkButton';
import PlaceSearchForm from './PlaceSearchForm';
import './ServiceHeader.css';

export default function ServiceHeader() {
  const isExplorer = usePathname() === '/';

  return (
    <header className={`flex flex-wrap items-center gap-3.5 px-5 py-5 md:flex-nowrap md:gap-5 md:px-6 min-[1101px]:gap-8 min-[1101px]:px-9 min-[1101px]:py-6 ${isExplorer ? 'outpick-explorer-header' : 'border-b border-[#e4e9f1]'}`}>
      <Link href="/" aria-label="OUTPICK 홈" className="flex items-center gap-3 text-2xl font-extrabold tracking-[-1px] whitespace-nowrap text-[#5147ff] md:text-[25px]">
        OUTPICK <span className="hidden text-[10px] font-normal tracking-normal text-[#8793a7] min-[1101px]:inline">밖으로, 더 멀리</span>
      </Link>
      {isExplorer && <Suspense><PlaceSearchForm /></Suspense>}
      <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 md:flex-none">
        {isExplorer ? (
          <>
            <span className="outpick-previewBadge hidden md:inline">탐색 화면 미리보기</span>
            <CopyPlaceLinkButton label="검색 링크 복사" />
          </>
        ) : (
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-[#5147ff] hover:bg-[#f3f1ff]
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5147ff]">
            사용자 화면 <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )}
        <MemberProfileMenu />
      </div>
    </header>
  );
}
