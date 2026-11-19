CREATE TABLE review (
    review_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    place_id BIGINT NOT NULL,
    user_id BIGINT NOT NULL,
    content TEXT NOT NULL,
    visited_at DATE NULL,
    version INT NOT NULL DEFAULT 0,
    publish_status TINYINT NOT NULL DEFAULT 1,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    INDEX idx_review_place_status (place_id, publish_status, created_at),
    CONSTRAINT fk_review_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    CONSTRAINT fk_review_user FOREIGN KEY (user_id) REFERENCES `user` (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
