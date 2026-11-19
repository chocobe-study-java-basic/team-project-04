CREATE TABLE media_asset (
    media_asset_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    media_type VARCHAR(20) NOT NULL,
    verification_status VARCHAR(20) NOT NULL,
    uploaded_by BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_media_asset_storage_key UNIQUE (storage_key),
    CONSTRAINT fk_media_asset_uploader FOREIGN KEY (uploaded_by) REFERENCES `user` (user_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE review_image (
    media_asset_id BIGINT NOT NULL PRIMARY KEY,
    width INT NOT NULL,
    height INT NOT NULL,
    content_type VARCHAR(30) NOT NULL,
    CONSTRAINT fk_review_image_asset FOREIGN KEY (media_asset_id) REFERENCES media_asset (media_asset_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 초기 단일 서버에서 업로드와 삭제를 한 DB 트랜잭션으로 처리한다.
-- storage_key는 향후 외부 저장소로 이전할 때 사용하는 불변 식별자다.
CREATE TABLE review_image_data (
    media_asset_id BIGINT NOT NULL PRIMARY KEY,
    image_bytes LONGBLOB NOT NULL,
    CONSTRAINT fk_review_image_data_asset FOREIGN KEY (media_asset_id) REFERENCES media_asset (media_asset_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE review_media (
    review_media_id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    media_asset_id BIGINT NOT NULL,
    review_id BIGINT NOT NULL,
    sort_order INT NOT NULL,
    CONSTRAINT uk_review_media_asset UNIQUE (media_asset_id),
    CONSTRAINT uk_review_media_order UNIQUE (review_id, sort_order),
    CONSTRAINT fk_review_media_asset FOREIGN KEY (media_asset_id) REFERENCES media_asset (media_asset_id) ON DELETE CASCADE,
    CONSTRAINT fk_review_media_review FOREIGN KEY (review_id) REFERENCES review (review_id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
