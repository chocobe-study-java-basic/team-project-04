-- 2026-11-16 TourAPI 소개정보와 공식 체험 안내의 차이를 기록한다.
-- 이 작업은 값을 검수 완료로 승인하거나 운영중/휴무 상태를 확정하지 않는다.
-- 당일 확인한 API 값과 일치하는 최초 수집 행에만 적용한다.
SET NAMES utf8mb4;
START TRANSACTION;
UPDATE place_operating_info
SET verification_status='NEEDS_REVIEW',
    review_note='수집된 평일 이용시간은 10:30~19:30이지만, 공식 체험 안내의 평일 예약 시간은 11:30~20:30으로 다릅니다. 같은 공식 페이지 하단의 운영시간도 본문과 다릅니다. API의 월요일 휴무 안내 역시 방문 전 확인이 필요합니다. 문의전화는 공식 안내와 일치합니다.',
    official_source_url='https://flystation.kr/usage/usage_020100.html',
    compared_at='2026-11-16 00:00:00'
WHERE source_content_id='2623831' AND verification_status='UNVERIFIED'
  AND verified_at IS NULL AND compared_at IS NULL
  AND operating_hours LIKE '%평일 10:30~19:30%'
  AND rest_days='매주 월요일' AND contact_phone='1855-3946';
SELECT ROW_COUNT() AS marked_for_review_this_run;
COMMIT;
