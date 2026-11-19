'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { currentMember } from '../api/memberApi';
import { ApiError } from '@/shared/lib/http/apiError';

export default function MemberHeaderLink() {
  const [state, setState] = useState<'checking' | 'signed-in' | 'signed-out' | 'error'>('checking');

  useEffect(() => {
    let active = true;
    currentMember().then(() => { if (active) setState('signed-in'); })
      .catch(cause => {
        if (!active) return;
        setState(cause instanceof ApiError && cause.details.kind === 'http' && cause.details.status === 401 ? 'signed-out' : 'error');
      });
    return () => { active = false; };
  }, []);

  if (state === 'checking') return <span className="outpick-accountLink" role="status">계정 확인 중</span>;

  return <Link className="outpick-accountLink" href={state === 'signed-out' ? '/login/' : '/account/'}>
    {state === 'signed-in' ? '내 계정' : state === 'error' ? '계정 확인' : '로그인'}
  </Link>;
}
