CREATE TABLE place_review (
    review_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    place_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    body VARCHAR(2000) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'PUBLIC',
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_review_place_status (place_id, status, created_at),
    CONSTRAINT fk_review_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    CONSTRAINT fk_review_author FOREIGN KEY (author_id) REFERENCES `user` (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
