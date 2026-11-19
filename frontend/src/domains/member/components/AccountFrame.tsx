import Link from 'next/link';
import type { ReactNode } from 'react';
import './lucian.css';
import './account.css';

export default function AccountFrame({ children }: { children: ReactNode }) {
  return (
    <div className="account-page">
      <aside className="account-story">
        <Link className="account-brand" href="/">OUTPICK <span>밖으로, 더 멀리</span></Link>
        <div className="account-story-content">
          <span className="account-story-kicker">FIND YOUR NEXT OUTSIDE</span>
          <h1>이번 주말,<br />어디로 나갈까요?</h1>
          <p>관심 있는 활동과 장소를 찾고, 다음 외출을 가볍게 준비해 보세요.</p>
          <div className="account-route-art" aria-hidden="true">
            <div className="account-route-art-head"><span>WEEKEND ROUTE</span><span>OUTPICK · EXPLORE</span></div>
            <svg viewBox="0 0 400 142" fill="none" role="presentation">
              <path className="account-route-line" d="M23 102 C89 18 137 122 200 68 S303 14 380 47" />
              <circle className="account-route-start" cx="23" cy="102" r="9" />
              <circle className="account-route-mid" cx="200" cy="68" r="9" />
              <circle className="account-route-end" cx="380" cy="47" r="12" />
            </svg>
            <div className="account-route-art-foot"><span>마음이 향하는 곳을 찾아보세요</span><span>↗</span></div>
          </div>
        </div>
        <div className="account-story-foot"><span>로그인 없이도 장소를 둘러볼 수 있어요.</span><Link href="/">장소 탐색하기 <span aria-hidden="true">↗</span></Link></div>
      </aside>
      <main className="account-main"><div className="account-main-inner ux">{children}</div></main>
    </div>
  );
}
