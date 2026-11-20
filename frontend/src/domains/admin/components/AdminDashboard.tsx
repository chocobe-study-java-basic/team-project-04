'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getAdminSummary, type AdminSummary } from '../api/adminApi';

export default function AdminDashboard() {
  const [summary, setSummary] = useState<AdminSummary | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    let active = true;
    getAdminSummary().then(data => { if (active) setSummary(data); })
      .catch(() => { if (active) setError(true); });
    return () => { active = false; };
  }, []);

  return <div className="admin-dashboard">
    <section className="admin-dashboardHero"><div><p>MANAGE THE OUTSIDE</p><h1>오늘의 운영 현황</h1>
      <span>검토가 필요한 내용을 확인하고 새 장소를 준비하세요.</span></div>
    <div className="admin-dashboardHeroArt" aria-hidden="true"><i /><i /><i /></div></section>
    {error && <p role="alert" className="admin-error">현황을 불러오지 못했어요. 새로고침해 주세요.</p>}
    {!summary && !error && <p role="status">운영 현황을 불러오고 있어요.</p>}
    {summary && <section className="admin-dashboardStats" aria-label="운영 현황">
      <div className="is-alert"><span>처리 대기</span><strong>{summary.pendingReports}</strong><small>후기 신고</small></div>
      <div><span>등록 준비</span><strong>{summary.draftPlaces}</strong><small>비공개 장소 초안</small></div>
      <div><span>서비스 중</span><strong>{summary.publishedPlaces}</strong><small>공개 장소</small></div>
    </section>}
    <section className="admin-dashboardWork" aria-label="운영 작업">
      <div className="admin-dashboardSectionTitle"><div><p>NEXT ACTION</p><h2>바로 처리할 작업</h2></div>
        <span>필요한 메뉴로 이동하세요</span></div>
      <Link className="admin-dashboardTask" href="/admin/review-reports/"><span className="admin-dashboardTaskIcon is-report" aria-hidden="true">!</span>
        <span><strong>후기 신고 검토</strong><small>신고 사유를 확인하고 후기 숨김 또는 반려를 결정합니다.</small></span>
        <em>{summary ? `${summary.pendingReports}건 대기` : '확인하기'} <b aria-hidden="true">↗</b></em></Link>
      <Link className="admin-dashboardTask" href="/admin/places/"><span className="admin-dashboardTaskIcon is-place" aria-hidden="true">＋</span>
        <span><strong>새 장소 등록</strong><small>기본 정보를 비공개 초안으로 저장하고 검토합니다.</small></span>
        <em>등록하기 <b aria-hidden="true">↗</b></em></Link>
    </section>
  </div>;
}
