import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';
import AccountSidebar from './AccountSidebar/AccountSidebar';
import ServiceHeader from './ServiceHeader';

export default function AccountAreaLayout({ children, showAdminMenu }: { children: ReactNode; showAdminMenu: boolean }) {
  return (
    <div className="min-h-screen bg-white text-[#16243b]">
      <div className="border-b border-[#e4e9f1]">
        <ServiceHeader actions={(
          <Link href="/" className="inline-flex min-h-11 items-center gap-1 rounded-lg px-2 text-sm font-semibold whitespace-nowrap text-[#5147ff] hover:bg-[#f3f1ff]
            focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5147ff]">
            사용자 화면 <ArrowUpRight size={15} aria-hidden="true" />
          </Link>
        )} />
      </div>
      <div className="mx-auto grid max-w-7xl items-start gap-6 px-4 py-6 md:grid-cols-[12rem_minmax(0,1fr)] md:px-6 lg:gap-8 lg:px-9 lg:py-9">
        <AccountSidebar showAdminMenu={showAdminMenu} />
        <main className="min-w-0">{children}</main>
      </div>
    </div>
  );
}
