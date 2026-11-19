'use client';

import { CircleUserRound } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useId, useRef, useState } from 'react';
import { currentMember } from '../api/memberApi';
import { ApiError } from '@/shared/lib/http/apiError';
import './MemberProfileMenu.css';

type MemberStatus =
  | { kind: 'checking' | 'signed-out' | 'error' }
  | { kind: 'signed-in'; isAdmin: boolean };

/** 현재 회원의 로그인 상태와 역할에 맞춰 헤더의 프로필 링크를 표시합니다. */
export default function MemberProfileMenu() {
  const [memberStatus, setMemberStatus] = useState<MemberStatus>({ kind: 'checking' });
  const [isOpen, setIsOpen] = useState(false);
  const menuId = useId();
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let active = true;
    currentMember().then(member => {
      if (active) setMemberStatus({ kind: 'signed-in', isAdmin: member.role === 'ADMIN' });
    })
      .catch(cause => {
        if (!active) return;
        const signedOut = cause instanceof ApiError && cause.details.kind === 'http' && cause.details.status === 401;
        setMemberStatus({ kind: signedOut ? 'signed-out' : 'error' });
      });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    function closeOnOutsidePress(event: PointerEvent) {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setIsOpen(false);
    }

    document.addEventListener('pointerdown', closeOnOutsidePress);
    return () => document.removeEventListener('pointerdown', closeOnOutsidePress);
  }, [isOpen]);

  return (
    <div
      className="member-profile"
      ref={menuRef}
      onKeyDown={event => {
        if (event.key !== 'Escape' || !isOpen) return;
        event.stopPropagation();
        setIsOpen(false);
        buttonRef.current?.focus();
      }}
    >
      <button
        type="button"
        className="member-profileButton"
        ref={buttonRef}
        aria-label="프로필 메뉴"
        aria-expanded={isOpen}
        aria-controls={menuId}
        onClick={() => setIsOpen(open => !open)}
      >
        <CircleUserRound size={22} strokeWidth={1.8} aria-hidden="true" />
      </button>
      <div id={menuId} className="member-profilePanel" hidden={!isOpen}>
        {memberStatus.kind === 'checking' && <p role="status">계정 상태를 확인하고 있어요.</p>}
        {memberStatus.kind === 'error' && <p role="alert">계정 정보를 확인하지 못했어요.</p>}
        {memberStatus.kind === 'signed-out' && (
          <Link href="/login/" onClick={() => setIsOpen(false)}>로그인</Link>
        )}
        {memberStatus.kind === 'signed-in' && (
          <>
            <Link href="/account/" onClick={() => setIsOpen(false)}>마이페이지</Link>
            {memberStatus.isAdmin && <Link href="/admin/" onClick={() => setIsOpen(false)}>관리자 화면</Link>}
          </>
        )}
      </div>
    </div>
  );
}
