'use client';

import Link from 'next/link';
import type { ReactNode } from 'react';
import { useCurrentMember } from '@/domains/member/hooks/useCurrentMember';

/** 상위 마이페이지 레이아웃이 로그인 확인을 마친 뒤 일반 회원 전용 화면의 접근 권한을 확인합니다. */
export default function MemberOnlyLayout({ children }: { children: ReactNode }) {
  const { data: member } = useCurrentMember();

  if (member?.role === 'USER') return children;

  return (
    <section className="space-y-4 text-slate-700">
      <h1 className="text-2xl font-bold">일반 회원 전용 페이지입니다</h1>
      <Link href="/mypage/" className="inline-flex min-h-11 items-center text-indigo-700 underline">
        마이페이지로 돌아가기
      </Link>
    </section>
  );
}
