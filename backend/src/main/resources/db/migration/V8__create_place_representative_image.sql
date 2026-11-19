-- 장소별 검수된 대표 사진 한 장. 후기 미디어/업로드 모델과 분리한다.
CREATE TABLE place_representative_image (
    place_id BIGINT NOT NULL PRIMARY KEY,
    url VARCHAR(1000) NOT NULL,
    attribution VARCHAR(500) NOT NULL,
    source_url VARCHAR(1000) NOT NULL,
    license_type VARCHAR(10) NOT NULL,
    verified_at DATETIME NOT NULL,
    CONSTRAINT fk_representative_image_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    CONSTRAINT ck_representative_image_license CHECK (license_type IN ('Type1', 'Type3'))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
