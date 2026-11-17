UPDATE place_notice SET publish_status = 0 WHERE publish_status IS NULL;

ALTER TABLE place_notice
    MODIFY COLUMN publish_status TINYINT NOT NULL DEFAULT 0,
    ADD CONSTRAINT ck_place_notice_publish_status CHECK (publish_status IN (0, 1, 2));
