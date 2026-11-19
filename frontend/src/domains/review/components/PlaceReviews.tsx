'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { currentMember, type Member } from '@/domains/member/api/memberApi';
import { ApiError } from '@/shared/lib/http/apiError';
import { createReview, deleteReview, listReviews, updateReview, type Review } from '../api/reviewApi';
import './PlaceReviews.css';

export default function PlaceReviews({ placeId }: { placeId: number }) {
  return <PlaceReviewsForPlace key={placeId} placeId={placeId} />;
}

function PlaceReviewsForPlace({ placeId }: { placeId: number }) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [member, setMember] = useState<Member | null>(null);
  const [loading, setLoading] = useState(true);
  const [memberCheckFailed, setMemberCheckFailed] = useState(false);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    Promise.allSettled([listReviews(placeId), currentMember()]).then(([reviewResult, memberResult]) => {
      if (!active) return;
      if (reviewResult.status === 'fulfilled') setReviews(reviewResult.value);
      else setError('후기를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.');
      if (memberResult.status === 'fulfilled') setMember(memberResult.value);
      else if (!(memberResult.reason instanceof ApiError && memberResult.reason.details.kind === 'http' && memberResult.reason.details.status === 401)) {
        setMemberCheckFailed(true);
      }
      setLoading(false);
    });
    return () => { active = false; };
  }, [placeId]);

  async function refresh() {
    setReviews(await listReviews(placeId));
  }

  async function save() {
    const text = body.trim();
    if (!text || text.length > 2000 || busy) return;
    setBusy(true);
    setError('');
    try {
      if (editingId === null) await createReview(placeId, text);
      else await updateReview(editingId, text);
      await refresh();
      setBody('');
      setEditingId(null);
    } catch {
      setError('후기를 저장하지 못했어요. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  async function remove(reviewId: number) {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await deleteReview(reviewId);
      await refresh();
      setConfirmDeleteId(null);
      if (editingId === reviewId) { setEditingId(null); setBody(''); }
    } catch {
      setError('후기를 삭제하지 못했어요. 다시 시도해 주세요.');
    } finally { setBusy(false); }
  }

  return <section className="outpick-reviews" aria-labelledby="place-reviews-title">
    <div className="outpick-reviewsHeading"><div><p>VISIT STORIES</p><h2 id="place-reviews-title">이 장소의 후기</h2></div><span>{reviews.length}개</span></div>
    {loading ? <p role="status">후기를 불러오고 있어요.</p> : <>
      {member ? <div className="outpick-reviewEditor">
        <label htmlFor="review-body">{editingId === null ? '방문 후기 남기기' : '후기 수정하기'}</label>
        <textarea id="review-body" value={body} maxLength={2000} rows={4}
          placeholder="이 장소에서 경험한 내용을 적어 주세요." onChange={event => setBody(event.target.value)} />
        <div className="outpick-reviewEditorActions"><span>{body.length}/2,000</span>
          {editingId !== null && <button type="button" onClick={() => { setEditingId(null); setBody(''); }}>취소</button>}
          <button type="button" disabled={busy || !body.trim()} onClick={() => void save()}>{busy ? '저장 중...' : editingId === null ? '후기 등록' : '수정 완료'}</button>
        </div>
      </div> : memberCheckFailed ? <p className="outpick-reviewLogin">로그인 상태를 확인하지 못했어요. 연결 상태를 확인한 뒤 새로고침해 주세요.</p>
        : <p className="outpick-reviewLogin">후기는 <Link href="/login/">로그인</Link> 후 작성할 수 있어요.</p>}
      {error && <p className="outpick-reviewError" role="alert">{error}</p>}
      {reviews.length ? <ul className="outpick-reviewList">{reviews.map(review => <li key={review.id}>
        <div className="outpick-reviewMeta"><strong>{review.authorNickname}</strong><time dateTime={review.createdAt}>{review.createdAt.slice(0, 10)}</time></div>
        <p>{review.body}</p>
        {member?.id === review.authorId && <div className="outpick-reviewActions">
          <button type="button" onClick={() => { setEditingId(review.id); setBody(review.body); setConfirmDeleteId(null); }}>수정</button>
          {confirmDeleteId === review.id ? <><span>삭제할까요?</span><button type="button" disabled={busy} onClick={() => void remove(review.id)}>삭제 확인</button><button type="button" onClick={() => setConfirmDeleteId(null)}>취소</button></> :
            <button type="button" onClick={() => setConfirmDeleteId(review.id)}>삭제</button>}
        </div>}
      </li>)}</ul> : <p className="outpick-reviewEmpty">아직 등록된 후기가 없어요. 첫 후기를 남겨 주세요.</p>}
    </>}
  </section>;
}
