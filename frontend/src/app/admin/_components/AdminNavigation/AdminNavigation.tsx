'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { adminNavigationItems } from './adminNavigationItems';

export default function AdminNavigation() {
  const pathname = usePathname().replace(/\/$/, '');

  return (
    <nav aria-label="관리자 메뉴" className="rounded-2xl border border-[#e4e9f1] bg-white p-2.5 md:p-3">
      <ul className="flex flex-wrap gap-1 md:flex-col">
        {adminNavigationItems.map(({ href, label, Icon }) => (
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
    </nav>
  );
}
