'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import AccountAreaLayout from '@/app/_components/AccountAreaLayout';
import { currentMember } from '@/domains/member/api/memberApi';
import type { Member } from '@/domains/member/api/memberApi';
import { ApiError } from '@/shared/lib/http/apiError';
import { MypageMemberContext } from './_components/MypageMemberContext';

export default function MypageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let active = true;
    currentMember().then(data => { if (active) setMember(data); }).catch(cause => {
      if (!active) return;
      if (cause instanceof ApiError && cause.details.kind === 'http' && cause.details.status === 401) {
        router.replace('/login/?next=%2Fmypage%2F');
      } else {
        setLoadError(true);
      }
    });
    return () => { active = false; };
  }, [router]);

  if (!member) {
    return (
      <main className="mx-auto max-w-7xl px-4 py-9 text-slate-700 md:px-6">
        {loadError
          ? <p role="alert">계정 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          : <p role="status">계정 정보를 불러오고 있어요.</p>}
      </main>
    );
  }

  return (
    <MypageMemberContext.Provider value={member}>
      <AccountAreaLayout showAdminMenu={member.role === 'ADMIN'}>{children}</AccountAreaLayout>
    </MypageMemberContext.Provider>
  );
}
