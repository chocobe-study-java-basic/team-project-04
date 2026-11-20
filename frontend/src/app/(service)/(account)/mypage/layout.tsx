'use client';

import { useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useCurrentMember } from '@/domains/member/hooks/useCurrentMember';

export default function MypageLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const { data: member, isError } = useCurrentMember();

  useEffect(() => {
    if (member === null && !isError) router.replace('/login/?next=%2Fmypage%2F');
  }, [isError, member, router]);

  if (member && !isError) return children;

  return (
    <div className="mx-auto max-w-7xl px-4 py-9 text-slate-700 md:px-6">
      {isError
        ? <p role="alert">계정 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
        : <p role="status">계정 정보를 불러오고 있어요.</p>}
    </div>
  );
}
