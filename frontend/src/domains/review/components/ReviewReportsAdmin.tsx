'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { ApiError } from '@/shared/lib/http/apiError';
import { dismissReviewReport, hideReview, pendingReviewReports, type ReviewReport } from '../api/reviewApi';
import './ReviewReportsAdmin.css';

export default function ReviewReportsAdmin() {
  const [reports, setReports] = useState<ReviewReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    pendingReviewReports().then(data => { if (active) setReports(data); })
      .catch(cause => {
        if (!active) return;
        setError(cause instanceof ApiError && cause.details.kind === 'http' && cause.details.status === 403
          ? '운영자만 신고 내역을 볼 수 있습니다.' : '신고 내역을 불러오지 못했어요.');
      }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  async function processReport(report: ReviewReport, action: 'hide' | 'dismiss') {
    if (busyId !== null) return;
    setBusyId(report.id); setError('');
    try {
      if (action === 'hide') await hideReview(report.reviewId);
      else await dismissReviewReport(report.id);
      setReports(await pendingReviewReports());
    } catch { setError('신고를 처리하지 못했어요. 다시 시도해 주세요.'); }
    finally { setBusyId(null); }
  }

  return <main className="outpick-reviewAdmin">
    <Link href="/">← 장소 탐색으로</Link>
    <p className="outpick-reviewAdminKicker">OUTPICK · MODERATION</p>
    <h1>후기 신고 검토</h1>
    <p>접수된 사유와 후기 본문을 확인한 뒤 숨기거나 신고를 반려할 수 있습니다.</p>
    {loading && <p role="status">신고 내역을 불러오고 있어요.</p>}
    {error && <p role="alert" className="outpick-reviewAdminError">{error}</p>}
    {!loading && !error && reports.length === 0 && <p>대기 중인 신고가 없습니다.</p>}
    <ul>{reports.map(report => <li key={report.id}>
      <div><span>신고 #{report.id}</span><time dateTime={report.createdAt}>{report.createdAt.slice(0, 16).replace('T', ' ')}</time></div>
      <p><strong>신고 사유</strong> {report.reason}</p>
      <p><strong>후기 내용</strong> {report.reviewBody}</p>
      <Link href={`/places/detail/?id=${report.placeId}`}>해당 장소 보기 ↗</Link>
      <div className="outpick-reviewAdminActions">
        <button type="button" disabled={busyId !== null} onClick={() => void processReport(report, 'dismiss')}>신고 반려</button>
        <button type="button" disabled={busyId !== null} onClick={() => void processReport(report, 'hide')}>후기 숨김</button>
      </div>
    </li>)}</ul>
  </main>;
}
