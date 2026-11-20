'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCurrentMember } from '@/domains/member/hooks/useCurrentMember';

/** 현재 회원이 운영자로 확인된 뒤에 관리자 화면을 표시합니다. */
export default function AdminAccess({ children }: { children: ReactNode }) {
  const { data: member, isPending, isError } = useCurrentMember();

  if (member?.role === 'ADMIN' && !isError) return children;

  return (
    <div className="admin-shell admin-access">
      {isPending ? <p role="status">운영자 권한을 확인하고 있어요.</p>
        : isError ? <p role="alert">계정 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.</p>
          : member ? <><h1>운영자 전용 페이지입니다</h1><Link href="/">장소 탐색으로 돌아가기</Link></>
            : <><h1>로그인이 필요합니다</h1><Link href="/login/?next=%2Fadmin%2F">운영자 로그인</Link></>}
    </div>
  );
}
