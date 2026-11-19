'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { confirmPasswordReset, login, requestPasswordReset, signup, validatePasswordReset } from '../api/memberApi';
import AccountFrame from './AccountFrame';
import FloatingField from './FloatingField';

function errorText(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function Header({ step, title, description }: { step: string; title: string; description: string }) {
  return <><span className="account-kicker">{step}</span><h2 className="account-title">{title}</h2><p className="account-intro">{description}</p></>;
}

function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button className="account-button" disabled={busy} type="submit"><span>{busy ? '처리 중...' : children}</span></button>;
}

export function LoginScreen() {
  const router = useRouter();
  const loginParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const notice = loginParams.has('reset') ? '비밀번호가 변경되었습니다. 새 비밀번호로 로그인해 주세요.'
    : loginParams.has('signup') ? '회원가입이 완료되었습니다. 로그인해 주세요.' : '';
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await login({ email, password }); router.push('/account/'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <AccountFrame><Header step="WELCOME BACK" title="다시 만나 반가워요" description="계정에 로그인하고 저장한 장소와 알림을 확인하세요." />
    <form className="account-panel account-form" onSubmit={submit}>
      {notice && <p className="account-alert success" role="status">{notice}</p>}
      <FloatingField label="이메일" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <FloatingField label="비밀번호" type="password" value={password} onChange={setPassword} autoComplete="current-password" />
      {error && <p className="account-alert" role="alert">{error}</p>}
      <Submit busy={busy}>로그인</Submit>
      <Link className="account-forgot" href="/password-reset/">비밀번호를 잊으셨나요?</Link>
    </form><div className="account-links"><span>아직 계정이 없나요?</span><Link href="/signup/">회원가입</Link></div>
  </AccountFrame>;
}

export function SignupScreen() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [nickname, setNickname] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await signup({ email, password, nickname }); router.push('/login/?signup=done'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <AccountFrame><Header step="JOIN OUTPICK" title="다음 외출을 함께해요" description="이메일로 계정을 만들고 관심 있는 장소를 모아 보세요." />
    <form className="account-panel account-form" onSubmit={submit}>
      <FloatingField label="이메일" type="email" value={email} onChange={setEmail} autoComplete="email" />
      <FloatingField label="닉네임" value={nickname} onChange={setNickname} autoComplete="nickname" />
      <FloatingField label="비밀번호" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
      {error && <p className="account-alert" role="alert">{error}</p>}
      <Submit busy={busy}>회원가입</Submit>
    </form><div className="account-links"><span>이미 계정이 있나요?</span><Link href="/login/">로그인</Link></div>
  </AccountFrame>;
}

export function ResetRequestScreen() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setError('');
    try { await requestPasswordReset(email); setSent(true); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <AccountFrame><Header step="ACCOUNT RECOVERY" title="비밀번호를 다시 설정하세요" description="가입할 때 사용한 이메일을 입력해 주세요." />
    <div className="account-panel">
      {sent ? <div className="account-sent" role="status"><span className="account-envelope" aria-hidden="true">✉</span><h3>메일을 확인해 주세요</h3><p>해당 이메일로 재설정할 수 있는 계정이 있다면 안내 메일이 발송됩니다.</p></div>
        : <form className="account-form" onSubmit={submit}><FloatingField label="이메일" type="email" value={email} onChange={setEmail} autoComplete="email" />
          {error && <p className="account-alert" role="alert">{error}</p>}<Submit busy={busy}>재설정 링크 요청</Submit></form>}
    </div><div className="account-links"><Link href="/login/">로그인으로 돌아가기</Link></div>
  </AccountFrame>;
}

export function ResetConfirmScreen() {
  const router = useRouter();
  const token = useSearchParams().get('token') ?? '';
  const [valid, setValid] = useState<boolean | null>(null);
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  useEffect(() => {
    let active = true;
    if (!token) return;
    validatePasswordReset(token).then(() => { if (active) setValid(true); }).catch(() => { if (active) setValid(false); });
    return () => { active = false; };
  }, [token]);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (password !== confirmation) { setError('새 비밀번호가 일치하지 않습니다.'); return; }
    setBusy(true); setError('');
    try { await confirmPasswordReset({ token, newPassword: password, newPasswordConfirmation: confirmation }); router.push('/login/?reset=done'); }
    catch (cause) { setError(errorText(cause)); }
    finally { setBusy(false); }
  }
  return <AccountFrame><Header step="NEW PASSWORD" title="새 비밀번호 설정" description="새 비밀번호를 입력하고 다시 한번 확인해 주세요." />
    <div className="account-panel">{!token || valid === false ? <p className="account-alert" role="alert">재설정 링크가 유효하지 않습니다. 새 링크를 요청해 주세요.</p>
      : valid === null ? <p role="status">재설정 링크를 확인하고 있습니다...</p>
        : <form className="account-form" onSubmit={submit}>
          <FloatingField label="새 비밀번호" type="password" value={password} onChange={setPassword} autoComplete="new-password" />
          <FloatingField label="새 비밀번호 확인" type="password" value={confirmation} onChange={setConfirmation} autoComplete="new-password" />
          {error && <p className="account-alert" role="alert">{error}</p>}<Submit busy={busy}>비밀번호 변경</Submit>
        </form>}</div><div className="account-links"><Link href="/password-reset/">새 링크 요청</Link><Link href="/login/">로그인</Link></div>
  </AccountFrame>;
}
