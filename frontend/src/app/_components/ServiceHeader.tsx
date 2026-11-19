import Link from 'next/link';
import type { ReactNode } from 'react';
import MemberProfileMenu from '@/domains/member/components/MemberProfileMenu/MemberProfileMenu';

export default function ServiceHeader({ search, actions }: { search?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="flex flex-wrap items-center gap-3.5 px-5 py-5 md:flex-nowrap md:gap-5 md:px-6 min-[1101px]:gap-8 min-[1101px]:px-9 min-[1101px]:py-6">
      <Link href="/" aria-label="OUTPICK 홈" className="flex items-center gap-3 text-2xl font-extrabold tracking-[-1px] whitespace-nowrap text-[#5147ff] md:text-[25px]">
        OUTPICK <span className="hidden text-[10px] font-normal tracking-normal text-[#8793a7] min-[1101px]:inline">밖으로, 더 멀리</span>
      </Link>
      {search}
      <div className="ml-auto flex flex-1 flex-wrap items-center justify-end gap-2 md:flex-none">
        {actions}
        <MemberProfileMenu />
      </div>
    </header>
  );
}
