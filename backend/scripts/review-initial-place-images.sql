-- 2026-11-16 TourAPI 이미지 응답과 원본 파일을 대조한 대표 사진 4장.
-- 명시적 로컬 데이터 반영용. 일반 수집/서버 시작 시 자동 실행하지 않는다.
-- 곤지암은 확인한 응답에 사진이 없어 다른 시설의 사진으로 대체하지 않는다.
SET NAMES utf8mb4;
DROP TEMPORARY TABLE IF EXISTS initial_image_review;
CREATE TEMPORARY TABLE initial_image_review (
    content_id VARCHAR(50) PRIMARY KEY,
    url VARCHAR(1000) NOT NULL,
    attribution VARCHAR(500) NOT NULL,
    license_type VARCHAR(10) NOT NULL
);
INSERT INTO initial_image_review VALUES
('2678888','https://tong.visitkorea.or.kr/cms/resource/31/3493831_image2_1.JPG',
 '한국관광공사 TourAPI 제공 · 시흥 웨이브파크 대표 사진','Type3'),
('2727468','https://tong.visitkorea.or.kr/cms/resource/12/3495812_image2_1.jpg',
 '한국관광공사 TourAPI 제공 · 부산_스카이라인 루지 부산 (6)','Type1'),
('2396259','https://tong.visitkorea.or.kr/cms/resource/14/4136314_image2_1.jpg',
 '한국관광공사 TourAPI 제공 · 강원_강릉_정동진 레일바이크 (1).jpg','Type1'),
('2623831','https://tong.visitkorea.or.kr/cms/resource/00/4090100_image2_1.jpg',
 '한국관광공사 TourAPI 제공 · 경기_용인_플라이스테이션_체험_1.jpg','Type1');
START TRANSACTION;
SELECT lock_id FROM tour_api_import_lock WHERE lock_id=1 FOR UPDATE;
INSERT INTO place_representative_image (place_id,url,attribution,source_url,license_type,verified_at)
SELECT p.place_id,r.url,r.attribution,'https://www.data.go.kr/data/15101578/openapi.do',r.license_type,'2026-11-16 00:00:00'
FROM initial_image_review r
JOIN tour_api_import i ON i.content_id=r.content_id
JOIN place p ON p.place_id=i.place_id
LEFT JOIN place_representative_image existing ON existing.place_id=p.place_id
WHERE p.publish_status=1 AND existing.place_id IS NULL;
SELECT ROW_COUNT() AS images_added_this_run;
COMMIT;
DROP TEMPORARY TABLE initial_image_review;
