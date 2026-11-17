-- 0=검수 전(DRAFT), 1=공개(PUBLISHED), 2=비공개(HIDDEN).
-- 기존 미정(NULL) 데이터는 공개하지 않고 검수 전으로 전환한다.
UPDATE place SET publish_status = 0 WHERE publish_status IS NULL;

ALTER TABLE place
    MODIFY COLUMN publish_status TINYINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_place_publish_status CHECK (publish_status IN (0, 1, 2));
