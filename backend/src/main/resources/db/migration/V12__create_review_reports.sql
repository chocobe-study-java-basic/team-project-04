CREATE TABLE review_report (
    review_report_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    review_id BIGINT NOT NULL,
    reporter_id BIGINT NULL,
    processor_id BIGINT NULL,
    reason TEXT NOT NULL,
    process_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    process_result_memo TEXT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_review_reporter UNIQUE (review_id, reporter_id),
    CONSTRAINT fk_report_review FOREIGN KEY (review_id) REFERENCES review (review_id) ON DELETE CASCADE,
    CONSTRAINT fk_report_reporter FOREIGN KEY (reporter_id) REFERENCES `user` (user_id) ON DELETE SET NULL,
    CONSTRAINT fk_report_processor FOREIGN KEY (processor_id) REFERENCES `user` (user_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
