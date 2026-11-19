'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { currentMember, logout, withdraw } from '../api/memberApi';
import type { Member } from '../api/memberApi';
import AccountFrame from './AccountFrame';
import { ApiError } from '@/shared/lib/http/apiError';

export default function AccountScreen() {
  const router = useRouter();
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [busy, setBusy] = useState(false);
  const [modal, setModal] = useState(false);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const passwordRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    let active = true;
    currentMember().then(data => { if (active) setMember(data); })
      .catch(cause => {
        if (!active) return;
        if (cause instanceof ApiError && cause.details.kind === 'http' && cause.details.status === 401) {
          router.replace('/login/?next=%2Faccount%2F');
        } else {
          setLoadError(true);
        }
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [router]);
  useEffect(() => { if (modal) passwordRef.current?.focus(); }, [modal]);

  async function doLogout() {
    setBusy(true); setError('');
    try { await logout(); router.replace('/'); }
    catch { setError('로그아웃하지 못했습니다. 다시 시도해 주세요.'); }
    finally { setBusy(false); }
  }
  async function doWithdraw(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await withdraw(password); setModal(false); router.replace('/?withdrawn=1'); }
    catch (cause) {
      setError(cause instanceof ApiError && cause.details.kind === 'http' && cause.details.code === 'WITHDRAWAL_PASSWORD_MISMATCH'
        ? '현재 비밀번호가 올바르지 않습니다.'
        : '탈퇴를 완료하지 못했습니다. 잠시 후 다시 시도해 주세요.');
    }
    finally { setBusy(false); }
  }
  return <AccountFrame><span className="account-kicker">MY ACCOUNT</span><h2 className="account-title">계정 설정</h2>
    <p className="account-intro">내 계정 정보와 로그인 상태를 관리할 수 있습니다.</p>
    <div className="account-panel">{loading ? <p role="status">계정 정보를 불러오는 중입니다...</p> : loadError ? <p className="account-alert" role="alert">서버에 연결하지 못해 계정 정보를 확인할 수 없습니다. 잠시 후 다시 열어 주세요.</p> : member && <>
      <div className="account-member"><span className="account-avatar" aria-hidden="true">{member.nickname.slice(0, 1)}</span><div><strong>{member.nickname}</strong><small>{member.email}</small></div></div>
      <div className="account-action-row"><Link href="/">장소 둘러보기</Link><button type="button" onClick={doLogout} disabled={busy}>로그아웃</button></div>
      <div className="account-danger"><strong>회원 탈퇴</strong><p>탈퇴하면 계정과 개인 설정이 삭제됩니다. 탈퇴 전 안내를 확인해 주세요.</p><button type="button" onClick={() => { setError(''); setModal(true); }}>회원 탈퇴</button></div>
    </>}</div>
    {!modal && error && <p className="account-alert" role="alert">{error}</p>}
    {modal && <div className="account-modal-backdrop" onMouseDown={event => { if (event.target === event.currentTarget && !busy) setModal(false); }}>
      <div className="account-modal" role="dialog" aria-modal="true" aria-labelledby="withdraw-title" onKeyDown={event => { if (event.key === 'Escape' && !busy) setModal(false); }}>
        <h2 id="withdraw-title">정말 탈퇴하시겠어요?</h2><p>계정과 관심 장소, 알림 설정이 삭제됩니다. 남긴 제보 기록은 개인을 식별할 수 없도록 처리됩니다. <strong>탈퇴 후에는 기존 계정으로 로그인할 수 없습니다.</strong></p>
        <form onSubmit={doWithdraw}><label htmlFor="withdraw-password">현재 비밀번호</label><input ref={passwordRef} id="withdraw-password" type="password" required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
          <label htmlFor="withdraw-confirmation">확인을 위해 ‘탈퇴’를 입력해 주세요</label><input id="withdraw-confirmation" required value={confirmation} onChange={event => setConfirmation(event.target.value)} />
          {error && <p className="account-alert" role="alert">{error}</p>}
          <div className="account-modal-actions"><button type="button" onClick={() => setModal(false)} disabled={busy}>취소</button><button type="submit" disabled={busy || !password || confirmation !== '탈퇴'}>{busy ? '처리 중...' : '탈퇴 확정'}</button></div>
        </form>
      </div></div>}
  </AccountFrame>;
}
