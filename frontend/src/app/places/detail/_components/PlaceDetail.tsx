'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import PlaceArtwork from '@/domains/place/components/PlaceArtwork';
import CopyPlaceLinkButton from '@/domains/place/components/CopyPlaceLinkButton';
import { samplePlaces } from '@/domains/place/data/samplePlaces';
import { getListReturnUrl } from '@/domains/place/lib/placeNavigation';
import './PlaceDetail.css';

export default function PlaceDetail() {
  const params = useSearchParams();
  const ids = params.getAll('id');
  const id = ids.length === 1 && /^[1-9]\d*$/.test(ids[0]) ? Number(ids[0]) : NaN;
  const place = Number.isSafeInteger(id) ? samplePlaces.find(item => item.id === id) : undefined;
  const returnUrl = getListReturnUrl(params.get('returnTo'));

  return (
    <div className="outpick-detail">
      <header className="outpick-detailHeader">
        <Link className="outpick-detailBrand" href="/">OUTPICK</Link>
        <span>이번 주말, 밖에서 뭐 하지?</span>
      </header>
      <main className="outpick-detailMain">
        <Link className="outpick-backLink" href={returnUrl} scroll={false}>← 장소 목록으로 돌아가기</Link>
        {!place ? (
          <section className="outpick-detailEmpty">
            <p className="outpick-detailEyebrow">PLACE NOT FOUND</p>
            <h1>장소를 찾을 수 없어요</h1>
            <p>장소 주소를 확인하거나 목록에서 다른 장소를 찾아보세요.</p>
          </section>
        ) : (
          <>
            <p className="outpick-detailSample">샘플 장소 · 실제 시설 사진, 주소 및 운영 정보가 아닙니다.</p>
            <div className="outpick-detailHero">
              <div className="outpick-detailIntro">
                <p className="outpick-detailEyebrow">EXPLORE THE OUTSIDE</p>
                <p className="outpick-detailRegion">{place.region} · {place.area}</p>
                <h1>{place.name}</h1>
                <p>{place.description}</p>
                <div className="outpick-detailTags">{place.activities.map(activity => <span key={activity.name}>{activity.name}</span>)}</div>
                <div className="outpick-detailShare">
                  <CopyPlaceLinkButton label="장소 링크 복사" path={`/places/detail/?id=${place.id}`} />
                </div>
              </div>
              <PlaceArtwork artwork={place.artwork} />
            </div>

            <div className="outpick-detailColumns">
              <div>
                <section className="outpick-detailSection" aria-labelledby="place-introduction">
                  <h2 id="place-introduction">장소 소개</h2>
                  <p>{place.description}.</p>
                  <p>제공 종목과 시즌을 살펴보고 나에게 맞는 활동을 찾아보세요. 이 장소는 화면 확인을 위한 가상 데이터입니다.</p>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-activities">
                  <h2 id="place-activities">즐길 수 있는 활동</h2>
                  <ul className="outpick-activityList">{place.activities.map(activity => (
                    <li key={activity.name}>
                      <h3>{activity.name}</h3>
                      <p>{activity.environment} · {activity.seasons.join(' · ')}</p>
                    </li>
                  ))}</ul>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-notices">
                  <h2 id="place-notices">운영 안내 및 공지</h2>
                  <p>확인된 운영 정보와 공지가 없습니다.</p>
                  <p>운영시간·이용 조건·휴장 여부는 미확인 상태입니다.</p>
                </section>
                <section className="outpick-detailSection" aria-labelledby="place-sources">
                  <h2 id="place-sources">정보 출처 및 확인일</h2>
                  <dl className="outpick-detailFacts">
                    <div><dt>데이터 구분</dt><dd>화면 확인용 가상 데이터</dd></div>
                    <div><dt>공식 출처</dt><dd>미등록</dd></div>
                    <div><dt>확인일</dt><dd>미확인</dd></div>
                    <div><dt>이미지</dt><dd>시설 사진이 아닌 샘플 일러스트</dd></div>
                  </dl>
                </section>
              </div>
              <aside className="outpick-visitInfo" aria-labelledby="visit-information">
                <h2 id="visit-information">방문 전 확인하세요</h2>
                <dl className="outpick-detailFacts">
                  <div><dt>지역</dt><dd>{place.region} {place.area}</dd></div>
                  <div><dt>상세 주소</dt><dd>미확인</dd></div>
                  <div><dt>운영 상태</dt><dd>미확인</dd></div>
                  <div><dt>공식 홈페이지</dt><dd>미등록</dd></div>
                </dl>
                <p className="outpick-visitNote">주소·좌표와 공식 링크가 확인되면 길찾기와 공식 안내를 제공해요.</p>
                <Link href={returnUrl} scroll={false} className="outpick-returnButton">다른 장소 살펴보기</Link>
              </aside>
            </div>
          </>
        )}
        <footer className="outpick-detailFooter">OUTPICK · 밖으로, 더 멀리</footer>
      </main>
    </div>
  );
}
