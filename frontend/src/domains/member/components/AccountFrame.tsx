import Link from 'next/link';
import type { ReactNode } from 'react';
import './lucian.css';
import './account.css';

export default function AccountFrame({ children }: { children: ReactNode }) {
  return (
    <div className="account-page">
      <aside className="account-story">
        <Link className="account-brand" href="/">OUTPICK <span>밖으로, 더 멀리</span></Link>
        <div>
          <h1>이번 주말,<br />어디로 나갈까요?</h1>
          <p>관심 있는 활동과 장소를 찾고, 다음 외출을 가볍게 준비해 보세요.</p>
        </div>
        <div className="account-story-foot">FIND YOUR NEXT OUTSIDE</div>
      </aside>
      <main className="account-main"><div className="account-main-inner ux">{children}</div></main>
    </div>
  );
}
