'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Suspense } from 'react';
import MemberProfileMenu from '@/domains/member/components/MemberProfileMenu/MemberProfileMenu';
import PlaceSearchForm from './PlaceSearchForm';
import './ServiceHeader.css';

export default function ServiceHeader() {
  const isExplorer = usePathname() === '/';

  return (
    <header className={`flex flex-wrap items-center gap-3.5 px-5 py-5 md:flex-nowrap md:gap-5 md:px-6 min-[1101px]:gap-8 min-[1101px]:px-9 min-[1101px]:py-6 ${isExplorer ? 'outpick-explorer-header' : 'border-b border-[#e4e9f1]'}`}>
      <Link href="/" aria-label="OUTPICK 홈" className="flex shrink-0 items-center gap-3 self-center justify-self-start text-2xl font-extrabold tracking-[-1px] whitespace-nowrap text-[#5147ff] md:text-[25px]">
        <span className="font-['Malgun_Gothic',system-ui,sans-serif]">OUTPICK</span>
        <span className="hidden text-[10px] font-normal tracking-normal text-[#8793a7] min-[1101px]:inline">밖으로, 더 멀리</span>
      </Link>
      {isExplorer && <Suspense><PlaceSearchForm /></Suspense>}
      <div className="col-start-3 ml-auto flex shrink-0 items-center gap-1 md:gap-2">
        <MemberProfileMenu />
      </div>
    </header>
  );
}
