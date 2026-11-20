-- 공식 시설 안내를 대조한 초기 5곳과 지도 검증용 서울 45곳을 공개한다.
-- 로컬 Make 또는 EC2 초기 데이터 스크립트에서 명시적으로 실행한다.
-- Flyway/서버 시작에 연결하지 않는다.
-- 원본 TourAPI 출처는 보존하고, 확인한 항목에만 OFFICIAL 출처를 추가한다.
-- 사진/운영시간/요금/시즌은 미확인. 좌표는 TourAPI 원본이며 공식 검증 항목에 포함하지 않는다.
SET NAMES utf8mb4;

-- 2026-11-16 대조한 공식 시설 안내를 반영하는 초기 5곳이다.
DROP TEMPORARY TABLE IF EXISTS initial_place_review;
CREATE TEMPORARY TABLE initial_place_review (
    content_id VARCHAR(50) PRIMARY KEY,
    expected_name VARCHAR(50) NOT NULL,
    expected_address VARCHAR(100) NOT NULL,
    expected_homepage VARCHAR(100) NOT NULL,
    reviewed_address VARCHAR(100) NOT NULL,
    reviewed_homepage VARCHAR(100) NOT NULL,
    introduction TEXT NOT NULL,
    source_url VARCHAR(100) NOT NULL,
    verified_fields VARCHAR(50) NOT NULL
);
INSERT INTO initial_place_review VALUES
('2678888', '시흥 웨이브파크', '경기도 시흥시 거북섬둘레길 42', 'https://www.wavepark.co.kr/main',
 '경기도 시흥시 거북섬둘레길 42', 'https://www.wavepark.co.kr/main',
 '경기도 시흥시에 있는 서핑 체험 시설입니다. 이용 가능한 프로그램과 운영 일정은 공식 안내에서 확인하세요.',
 'https://www.wavepark.co.kr/trafficguide', 'name,address,homepage'),
('646762', '곤지암리조트 스키장', '경기도 광주시 도척면 도척윗로 278', 'http://www.konjiamresort.co.kr',
 '경기도 광주시 도척면 도척윗로 278', 'https://www.konjiamresort.co.kr/ski/useInfo.dev',
 '경기도 광주시에 있는 스키·스노보드 시설입니다. 시즌 운영 일정과 이용 조건은 공식 스키장 안내에서 확인하세요.',
 'https://www.konjiamresort.co.kr/ski/useInfo.dev', 'name,address,homepage,activities'),
('2727468', '스카이라인 루지 부산', '부산광역시 기장군 기장읍 기장해안로 205', 'https://busan.skylineluge.kr/',
 '부산광역시 기장군 기장읍 기장해안로 205', 'https://busan.skylineluge.kr/',
 '부산 기장군에 있는 루지 체험 시설입니다. 탑승 조건과 운영 일정은 공식 안내에서 확인하세요.',
 'https://busan.skylineluge.kr/en/', 'name,homepage,activities'),
('2396259', '정동진 레일바이크', '강원특별자치도 강릉시 정동역길 17 정동진역', 'https://www.railtrip.co.kr',
 '강원특별자치도 강릉시 강동면 정동역길 17 정동진역', 'https://www.railtrip.co.kr/kr/product_view.php?client_no=9',
 '강릉 정동진역에서 이용하는 레일바이크 시설입니다. 운행 일정과 이용 조건은 공식 안내에서 확인하세요.',
 'https://www.railtrip.co.kr/kr/product_view.php?client_no=9', 'name,address,homepage,activities'),
('2623831', '플라이스테이션', '경기도 용인시 처인구 포곡읍 성산로 521', 'http://www.flystation.kr/main/main.html',
 '경기도 용인시 처인구 포곡읍 성산로 521', 'https://flystation.kr/usage/usage_020100.html',
 '경기도 용인시에 있는 실내 스카이다이빙 체험 시설입니다. 체험 과정과 이용 조건은 공식 안내에서 확인하세요.',
 'https://flystation.kr/usage/usage_020100.html', 'name,address,homepage,activities');

START TRANSACTION;
SELECT lock_id FROM tour_api_import_lock WHERE lock_id = 1 FOR UPDATE;
DROP TEMPORARY TABLE IF EXISTS initial_review_targets;
CREATE TEMPORARY TABLE initial_review_targets AS
SELECT p.place_id, r.* FROM initial_place_review r
JOIN tour_api_import i ON i.content_id = r.content_id
JOIN place p ON p.place_id = i.place_id
JOIN source_record s ON s.source_record_id = i.source_record_id AND s.place_id = p.place_id
WHERE p.publish_status = 0 AND p.reviewed_at IS NULL AND s.verified_at IS NULL
  AND s.type = 'TOUR_API' AND s.origin_id = r.content_id
  AND p.name = r.expected_name AND p.address = r.expected_address AND p.homepage = r.expected_homepage
  AND p.latitude BETWEEN 33 AND 39 AND p.longitude BETWEEN 124 AND 132
  AND NOT EXISTS (SELECT 1 FROM source_record other WHERE other.place_id = p.place_id AND other.verified_at IS NOT NULL);

INSERT INTO source_record (place_id, type, url, verified_fields, verified_at, usage_terms_memo)
SELECT place_id, 'OFFICIAL', source_url, verified_fields, '2026-11-16 00:00:00',
       '2026-11-16 AI 보조 대조. 확인 항목만 verified_fields에 기록. 소개는 확인한 시설 사실을 바탕으로 직접 작성. 사진·운영시간·요금·시즌·정밀 좌표 미검수. 팀 운영자 계정 승인 이력 아님.'
FROM initial_review_targets;

UPDATE place p JOIN initial_review_targets r ON r.place_id = p.place_id
SET p.address = r.reviewed_address, p.homepage = r.reviewed_homepage, p.introduce = r.introduction,
    p.reviewed_at = '2026-11-16 00:00:00', p.publish_status = 1;
SELECT COUNT(*) AS published_this_run FROM initial_review_targets;

-- 지도와 페이지네이션 검증용 TourAPI 초안은 게시 상태만 변경한다.
UPDATE place p
JOIN tour_api_import i ON i.place_id = p.place_id
JOIN source_record s ON s.source_record_id = i.source_record_id AND s.place_id = p.place_id
SET p.publish_status = 1
WHERE p.publish_status = 0
  AND s.type = 'TOUR_API' AND s.origin_id = i.content_id
  AND i.content_id IN (
    '131139', '1017568', '2743751', '131297', '3060929', '131727', '1093200', '2674989',
    '3074766', '2758179', '2773297', '3058205', '131318', '131313', '2783315', '1148818',
    '3080519', '775883', '1964922', '1964914', '1964932', '1964937', '2553819', '2647687',
    '131519', '4068707', '2773417', '2753381', '3060926', '767780', '2733973', '2406564',
    '131333', '1101088', '663785', '131455', '131138', '3060932', '131122', '586753',
    '990140', '131624', '131317', '131315', '4109623'
  );
SELECT ROW_COUNT() AS published_map_test_this_run;

COMMIT;
DROP TEMPORARY TABLE initial_review_targets;
DROP TEMPORARY TABLE initial_place_review;
