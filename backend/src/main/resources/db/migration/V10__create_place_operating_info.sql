-- 수집한 참고 안내를 검수된 장소 기본 정보/공지와 구분한다.
CREATE TABLE place_operating_info (
    place_id BIGINT NOT NULL PRIMARY KEY,
    source_content_id VARCHAR(50) NOT NULL UNIQUE,
    operating_hours TEXT NULL,
    rest_days TEXT NULL,
    contact_phone VARCHAR(100) NULL,
    source_url VARCHAR(1000) NOT NULL,
    collected_at DATETIME NOT NULL,
    verification_status VARCHAR(20) NOT NULL DEFAULT 'UNVERIFIED',
    verified_at DATETIME NULL,
    review_note TEXT NULL,
    official_source_url VARCHAR(1000) NULL,
    compared_at DATETIME NULL,
    CONSTRAINT fk_operating_info_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    CONSTRAINT fk_operating_info_import FOREIGN KEY (source_content_id) REFERENCES tour_api_import (content_id),
    CONSTRAINT ck_operating_info_status CHECK (verification_status IN ('UNVERIFIED','NEEDS_REVIEW','VERIFIED')),
    CONSTRAINT ck_operating_info_verified CHECK (
        (verification_status = 'VERIFIED' AND verified_at IS NOT NULL) OR
        (verification_status <> 'VERIFIED' AND verified_at IS NULL)
    )
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
