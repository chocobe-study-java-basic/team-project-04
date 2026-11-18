-- 2026-11-16 공식 안내를 대조한 초기 종목별 필터. 로컬에서만 명시적으로 실행한다.
-- 기존 분류를 덮어쓰지 않는다. 시즌은 현재 영업 여부/예약 가능 여부가 아니다.
SET NAMES utf8mb4;
DROP TEMPORARY TABLE IF EXISTS initial_filter_review;
CREATE TEMPORARY TABLE initial_filter_review (
    content_id VARCHAR(50) NOT NULL,
    activity_name VARCHAR(50) NOT NULL,
    environment_type VARCHAR(10) NOT NULL,
    seasons JSON NOT NULL,
    environment_source VARCHAR(100) NOT NULL,
    season_source VARCHAR(100) NULL,
    evidence TEXT NOT NULL,
    PRIMARY KEY (content_id, activity_name)
);
INSERT INTO initial_filter_review VALUES
('2678888', '서핑', 'OUTDOOR', JSON_ARRAY('SPRING','SUMMER','AUTUMN'),
 'https://www.wavepark.co.kr/surf', 'https://www.wavepark.co.kr/operatinghours',
 '서프코브 시설 안내로 실외 분류. 공식 2026.04.25~10.31 일정의 월 범위를 봄·여름·가을로 분류. 2026 시즌 종료 공지도 확인. 다음 시즌 일정 확정/현재 영업을 의미하지 않음.'),
('646762', '스키', 'OUTDOOR', JSON_ARRAY('WINTER'),
 'https://m.konjiamresort.co.kr/ski/skiGuide.dev', 'https://m.konjiamresort.co.kr/ski/skiGuide.dev',
 '공식 겨울 스키장·설원·슬로프 안내로 실외/겨울 분류. 정확한 개장·폐장일은 미확인. 봄 운행 가능성은 임의로 추가하지 않음.'),
('646762', '스노보드', 'OUTDOOR', JSON_ARRAY('WINTER'),
 'https://m.konjiamresort.co.kr/ski/skiGuide.dev', 'https://m.konjiamresort.co.kr/ski/skiGuide.dev',
 '공식 스키/보드 시설·설원·슬로프 안내로 실외/겨울 분류. 리조트의 다른 여름 시설 시즌은 적용하지 않음.'),
('2727468', '루지', 'OUTDOOR', JSON_ARRAY('SPRING','SUMMER','AUTUMN','WINTER'),
 'https://busan.skylineluge.kr/en/', 'https://busan.skylineluge.kr/en/membership/',
 '공식 다운힐 트랙·스카이라이드 안내로 실외 분류. 연중 멤버십 및 매일 루지 이용 혜택을 근거로 사계절 분류. 악천후·임시 휴장 예외는 별도 확인.'),
('2396259', '레일바이크', 'OUTDOOR', JSON_ARRAY('SPRING','SUMMER','AUTUMN','WINTER'),
 'https://www.railtrip.co.kr/kr/product_view.php?client_no=9',
 'https://www.railtrip.co.kr/kr/product_view.php?client_no=9',
 '공식 바닷바람·동해바다 노선 안내로 실외 분류. 3~4월, 5~10월, 11~2월 운행표를 근거로 사계절 분류. 일별 실제 운행은 별도 확인.'),
('2623831', '실내 스카이다이빙', 'INDOOR', JSON_ARRAY(),
 'https://flystation.kr/intro/intro_030100.html', NULL,
 '공식 실내 스카이다이빙 안내로 실내 분류. 사계절/연중 운영을 명시한 근거는 확보하지 못했으므로 시즌 미확인 유지. 실내라는 이유로 사계절을 추정하지 않음.');

START TRANSACTION;
SELECT lock_id FROM tour_api_import_lock WHERE lock_id = 1 FOR UPDATE;
DROP TEMPORARY TABLE IF EXISTS initial_filter_targets;
CREATE TEMPORARY TABLE initial_filter_targets AS
SELECT a.place_activity_id, p.place_id, r.*
FROM initial_filter_review r
JOIN tour_api_import i ON i.content_id = r.content_id
JOIN place p ON p.place_id = i.place_id
JOIN place_activity a ON a.place_id = p.place_id
JOIN activity_type t ON t.activity_type_id = a.activity_type_id AND t.name = r.activity_name
WHERE p.publish_status = 1 AND a.environment_type IS NULL
  AND NOT EXISTS (SELECT 1 FROM place_activity_season s WHERE s.place_activity_id = a.place_activity_id)
  AND NOT EXISTS (SELECT 1 FROM source_record s WHERE s.place_id = p.place_id
                  AND s.type = 'OFFICIAL' AND s.origin_id = 'OUTPICK-FILTER-REVIEW-20261116');

UPDATE place_activity a JOIN initial_filter_targets r ON r.place_activity_id = a.place_activity_id
SET a.environment_type = r.environment_type;
INSERT INTO place_activity_season (place_activity_id, season)
SELECT r.place_activity_id, j.season FROM initial_filter_targets r
JOIN JSON_TABLE(r.seasons, '$[*]' COLUMNS (season VARCHAR(10) PATH '$')) j;

INSERT INTO source_record (place_id,type,origin_id,url,verified_fields,verified_at,usage_terms_memo)
SELECT DISTINCT place_id,'OFFICIAL','OUTPICK-FILTER-REVIEW-20261116',environment_source,
 'environmentType','2026-11-16 00:00:00',CONCAT(activity_name, ': ', evidence)
FROM initial_filter_targets;
INSERT INTO source_record (place_id,type,origin_id,url,verified_fields,verified_at,usage_terms_memo)
SELECT DISTINCT place_id,'OFFICIAL','OUTPICK-FILTER-REVIEW-20261116',season_source,
 'seasons','2026-11-16 00:00:00',CONCAT(activity_name, ': ', evidence)
FROM initial_filter_targets WHERE JSON_LENGTH(seasons) > 0;
SELECT COUNT(*) AS reviewed_activities_this_run FROM initial_filter_targets;
COMMIT;
DROP TEMPORARY TABLE initial_filter_targets;
DROP TEMPORARY TABLE initial_filter_review;
