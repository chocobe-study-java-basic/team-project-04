-- 실제 TourAPI 장소와 공유하는 지역·종목은 보존한다.
-- demo 생성기의 이름/주소/상위 지역 마커가 모두 맞는 가상 장소만 비공개로 전환한다.
SET NAMES utf8mb4;
START TRANSACTION;
UPDATE place p
JOIN region r ON r.region_id=p.region_id
JOIN region parent ON parent.region_id=r.parent_region_id
SET p.publish_status=2
WHERE parent.code IN ('OUTPICK-DEMO-V1','OUTPICK-DEMO-GG')
  AND p.name LIKE '[데모] %' AND p.address LIKE '%(가상 주소)'
  AND p.publish_status<>2
  AND NOT EXISTS (SELECT 1 FROM tour_api_import i WHERE i.place_id=p.place_id);
SELECT ROW_COUNT() AS hidden_demo_places_this_run;
COMMIT;
