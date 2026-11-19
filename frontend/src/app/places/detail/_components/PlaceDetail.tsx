'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PlacePhoto, { PlacePhotoCredit, getPlacePhoto } from '@/domains/place/components/PlacePhoto';
import CopyPlaceLinkButton from '@/domains/place/components/CopyPlaceLinkButton';
import { usePlaceDetail } from '@/domains/place/hooks/usePlaces';
import { environmentLabel, seasonLabel } from '@/domains/place/api/placeApi';
import { safeHttpUrl } from '@/domains/place/lib/placeLinks';
import { ApiError } from '@/shared/lib/http/apiError';
import { getListReturnUrl } from '@/domains/place/lib/placeNavigation';
import PlaceReviews from '@/domains/review/components/PlaceReviews';
import './PlaceDetail.css';

export default function PlaceDetail() {
  const params = useSearchParams();
  const ids = params.getAll('id');
  const id = ids.length === 1 && /^[1-9]\d*$/.test(ids[0]) ? Number(ids[0]) : NaN;
  const validId = Number.isSafeInteger(id) && id > 0;
  const detail = usePlaceDetail(id);
  const place = detail.data;
  const failure = detail.error instanceof ApiError ? detail.error.details : null;
  const missing = !validId || failure?.kind === 'http' && failure.status === 404;
  const homepage = safeHttpUrl(place?.homepage ?? null);
  const returnUrl = getListReturnUrl(params.get('returnTo'));

  return (
    <div className="outpick-detail">
      <header className="outpick-detailHeader">
        <Link className="outpick-detailBrand" href="/">OUTPICK</Link>
        <span>이번 주말, 밖에서 뭐 하지?</span>
      </header>
      <main className="outpick-detailMain">
        <Link className="outpick-backLink" href={returnUrl} scroll={false}>← 장소 목록으로 돌아가기</Link>
        {missing ? (
          <section className="outpick-detailEmpty">
            <p className="outpick-detailEyebrow">PLACE NOT FOUND</p>
            <h1>장소를 찾을 수 없어요</h1>
            <p>장소 주소를 확인하거나 목록에서 다른 장소를 찾아보세요.</p>
          </section>
        ) : detail.isError ? (
          <section className="outpick-detailEmpty" role="alert"><h1>장소 정보를 불러오지 못했어요</h1><p>서버 연결을 확인하고 다시 시도해 주세요.</p><button type="button" className="outpick-returnButton" onClick={() => void detail.refetch()}>다시 시도</button></section>
        ) : !place ? <p role="status">장소 정보를 불러오고 있어요.</p> : (
          <>
            <p className="outpick-detailSample">{place.name?.startsWith('[데모]') ? '개발용 가상 장소 · 실제 시설·주소·운영 정보가 아닙니다.' : 'DB 조회 정보 · 미확인 항목은 미확인으로 표시합니다.'}</p>
            <div className="outpick-detailHero">
              <div className="outpick-detailIntro">
                <p className="outpick-detailEyebrow">EXPLORE THE OUTSIDE</p>
                <p className="outpick-detailRegion">{place.address ?? '주소 미확인'}</p>
                <h1>{place.name ?? '이름 미확인'}</h1>
                <p>{place.description ?? '등록된 소개가 없습니다.'}</p>
                <div className="outpick-detailTags">{place.activities.map(activity => <span key={activity.placeActivityId}>{activity.activityTypeName}</span>)}</div>
                <div className="outpick-detailShare">
                  <CopyPlaceLinkButton label="장소 링크 복사" path={`/places/detail/?id=${place.id}`} />
                </div>
              </div>
              <div className="outpick-detailPhoto"><PlacePhoto place={place} /><PlacePhotoCredit place={place} /></div>
            </div>

            <div className="outpick-detailColumns">
              <div>
                <section className="outpick-detailSection" aria-labelledby="place-introduction">
                  <h2 id="place-introduction">장소 소개</h2>
                  <p>{place.description ?? '등록된 소개가 없습니다.'}</p>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-activities">
                  <h2 id="place-activities">즐길 수 있는 활동</h2>
                  <ul className="outpick-activityList">{place.activities.map(activity => (
                    <li key={activity.placeActivityId}>
                      <h3>{activity.activityTypeName}</h3>
                      <p>{environmentLabel(activity.environmentType)} · {activity.seasons.length ? activity.seasons.map(seasonLabel).join(' · ') : '시즌 미확인'}</p>
                    </li>
                  ))}</ul>
                  {place.activities.length === 0 && <p>등록된 활동 정보가 없습니다.</p>}
                  <p>시즌은 활동을 찾기 위한 분류입니다. 현재 운영 여부와 방문 가능한 날짜는 공식 안내를 확인하세요.</p>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-notices">
                  <h2 id="place-notices">운영 안내 및 공지</h2>
                  {place.notices.length ? place.notices.map(notice => <article className="outpick-notice" key={notice.placeNoticeId}><h3>{notice.title ?? '공지'}</h3><p>{notice.content}</p></article>) : <p>확인된 운영 공지가 없습니다.</p>}
                  <p>운영시간·이용 조건·휴장 여부는 미확인 상태입니다.</p>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-sources">
                  <h2 id="place-sources">정보 출처 및 확인일</h2>
                  {place.sources.length ? place.sources.map(source => <dl className="outpick-detailFacts" key={source.sourceRecordId}>
                    <div><dt>출처</dt><dd>{safeHttpUrl(source.url) ? <a href={safeHttpUrl(source.url)!} target="_blank" rel="noopener noreferrer">출처 안내 열기 ↗</a> : '출처 링크 미등록'}</dd></div>
                    <div><dt>확인 항목</dt><dd>{source.verifiedFields ?? '미등록'}</dd></div>
                    <div><dt>확인일</dt><dd>{source.verifiedAt.replace('T', ' ')}</dd></div>
                  </dl>) : <p>확인된 출처가 없습니다.</p>}
                  <p>{getPlacePhoto(place) ? '시설 사진의 출처와 이용조건은 사진 아래에서 확인할 수 있습니다.' : '사진이 없거나 불러오지 못하면 시설 사진이 아닌 안내용 일러스트를 표시합니다.'}</p>
                </section>
              </div>
              <aside className="outpick-visitInfo" aria-labelledby="visit-information">
                <h2 id="visit-information">방문 전 확인하세요</h2>
                <dl className="outpick-detailFacts">
                  <div><dt>상세 주소</dt><dd>{place.address ?? '미확인'}</dd></div>
                  <div><dt>운영 정보 상태</dt><dd>{place.operationStatus ?? '미확인'}</dd></div>
                  <div><dt>공식 홈페이지</dt><dd>{homepage ? <a href={homepage} target="_blank" rel="noopener noreferrer">공식 안내 열기 ↗</a> : '미등록'}</dd></div>
                </dl>
                {place.latitude !== null && place.longitude !== null && <a className="outpick-returnButton" target="_blank" rel="noopener noreferrer" href={`https://map.kakao.com/link/to/${encodeURIComponent(place.name ?? '장소')},${place.latitude},${place.longitude}`}>카카오맵 길찾기 ↗</a>}
                <p className="outpick-visitNote">방문 전 공식 안내를 확인하세요. [데모] 장소의 좌표와 주소는 실제 시설 위치가 아닙니다.</p>
                <Link href={returnUrl} scroll={false} className="outpick-returnButton">다른 장소 살펴보기</Link>
              </aside>
            </div>
            <PlaceReviews placeId={place.id} />
          </>
        )}
        <footer className="outpick-detailFooter">OUTPICK · 밖으로, 더 멀리</footer>
      </main>
    </div>
  );
}
