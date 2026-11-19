'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { currentMember } from '@/domains/member/api/memberApi';
import { ApiError } from '@/shared/lib/http/apiError';

export default function AdminAccess({ children }: { children: React.ReactNode }) {
  const [access, setAccess] = useState<'loading' | 'allowed' | 'login' | 'denied' | 'error'>('loading');
  useEffect(() => {
    let active = true;
    currentMember().then(member => { if (active) setAccess(member.role === 'ADMIN' ? 'allowed' : 'denied'); })
      .catch(error => { if (active) setAccess(error instanceof ApiError && error.details.kind === 'http'
        && error.details.status === 401 ? 'login' : 'error'); });
    return () => { active = false; };
  }, []);
  if (access === 'allowed') return <>{children}</>;
  return <main className="admin-shell admin-access">
    {access === 'loading' ? <p role="status">운영자 권한을 확인하고 있어요.</p>
      : access === 'login' ? <><h1>로그인이 필요합니다</h1><Link href="/login/?next=%2Fadmin%2F">운영자 로그인</Link></>
        : access === 'denied' ? <><h1>운영자 전용 페이지입니다</h1><Link href="/">장소 탐색으로 돌아가기</Link></>
          : <p role="alert">계정 정보를 확인하지 못했어요. 잠시 후 다시 시도해 주세요.</p>}
  </main>;
}
