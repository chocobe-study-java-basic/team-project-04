ALTER TABLE favorite
    ADD COLUMN is_notified TINYINT(1) NOT NULL DEFAULT 0,
    ADD COLUMN notified_enabled_at DATETIME(6) NULL;
