'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { Member } from '@/domains/member/api/memberApi';
import { adminNavigationItems, commonNavigationItems, memberNavigationItems } from './accountSidebarItems';

const regularMemberItems = [...commonNavigationItems, ...memberNavigationItems];

function NavigationLinks({ items, pathname }: { items: typeof commonNavigationItems; pathname: string }) {

  return (
    <ul className="flex flex-wrap gap-1 md:flex-col">
      {items.map(({ href, label, Icon }) => (
        <li key={href}>
          <Link
            href={href}
            aria-current={pathname === href.replace(/\/$/, '') ? 'page' : undefined}
            className="flex min-h-11 items-center gap-2 rounded-lg px-2.5 py-2 text-sm font-semibold whitespace-nowrap text-[#51627a]
                hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5147ff]
                aria-[current=page]:bg-[#eaf5ff] aria-[current=page]:text-[#4338e8] md:px-3"
          >
            <Icon size={18} className="shrink-0" aria-hidden="true" />
            {label}
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default function AccountSidebar({ role }: { role: Member['role'] }) {
  const pathname = usePathname().replace(/\/$/, '');

  return (
    <aside className="rounded-2xl border border-[#e4e9f1] bg-white p-2.5 md:p-3">
      <nav aria-label="공통 메뉴">
        <p className="px-2.5 pt-1 pb-2 text-xs font-semibold text-slate-500 md:px-3">공통 메뉴</p>
        <NavigationLinks items={role === 'USER' ? regularMemberItems : commonNavigationItems} pathname={pathname} />
      </nav>
      {role === 'ADMIN' && (
        <nav aria-label="관리자 메뉴" className="mt-3 border-t border-[#e4e9f1] pt-2">
          <p className="px-2.5 pt-1 pb-2 text-xs font-semibold text-slate-500 md:px-3">관리자 메뉴</p>
          <NavigationLinks items={adminNavigationItems} pathname={pathname} />
        </nav>
      )}
    </aside>
  );
}
