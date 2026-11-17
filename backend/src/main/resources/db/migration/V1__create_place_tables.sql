-- ERD v3의 장소 탐색·상세 범위. 회원·후기·미디어 테이블은 각 담당 작업에서 추가한다.
CREATE TABLE region (
    region_id BIGINT NOT NULL AUTO_INCREMENT,
    parent_region_id BIGINT NULL,
    code VARCHAR(20) NULL,
    name VARCHAR(50) NULL,
    PRIMARY KEY (region_id),
    CONSTRAINT fk_region_parent FOREIGN KEY (parent_region_id) REFERENCES region (region_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activity_category (
    activity_category_id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(50) NULL,
    PRIMARY KEY (activity_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE activity_type (
    activity_type_id BIGINT NOT NULL AUTO_INCREMENT,
    activity_category_id BIGINT NOT NULL,
    name VARCHAR(50) NULL,
    PRIMARY KEY (activity_type_id),
    CONSTRAINT fk_activity_type_category FOREIGN KEY (activity_category_id)
        REFERENCES activity_category (activity_category_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE place (
    place_id BIGINT NOT NULL AUTO_INCREMENT,
    region_id BIGINT NOT NULL,
    name VARCHAR(50) NULL,
    name_alias VARCHAR(50) NULL,
    introduce TEXT NULL,
    address VARCHAR(100) NULL,
    latitude DECIMAL(10,7) NULL,
    longitude DECIMAL(10,7) NULL,
    homepage VARCHAR(100) NULL,
    publish_status TINYINT NULL,
    operation_status VARCHAR(20) NULL,
    version VARCHAR(20) NULL,
    reviewed_at DATETIME NULL,
    PRIMARY KEY (place_id),
    KEY ix_place_publish_region_name (publish_status, region_id, name, place_id),
    CONSTRAINT fk_place_region FOREIGN KEY (region_id) REFERENCES region (region_id),
    CONSTRAINT ck_place_latitude CHECK (latitude BETWEEN -90 AND 90),
    CONSTRAINT ck_place_longitude CHECK (longitude BETWEEN -180 AND 180)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE place_activity (
    place_activity_id BIGINT NOT NULL AUTO_INCREMENT,
    place_id BIGINT NOT NULL,
    activity_type_id BIGINT NOT NULL,
    environment_type VARCHAR(10) NULL,
    PRIMARY KEY (place_activity_id),
    CONSTRAINT uk_place_activity UNIQUE (place_id, activity_type_id),
    KEY ix_place_activity_type_environment (activity_type_id, environment_type, place_id),
    CONSTRAINT fk_place_activity_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    CONSTRAINT fk_place_activity_type FOREIGN KEY (activity_type_id) REFERENCES activity_type (activity_type_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE place_activity_season (
    activity_season_id BIGINT NOT NULL AUTO_INCREMENT,
    place_activity_id BIGINT NOT NULL,
    season VARCHAR(10) NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (activity_season_id),
    CONSTRAINT uk_place_activity_season UNIQUE (place_activity_id, season),
    CONSTRAINT fk_season_place_activity FOREIGN KEY (place_activity_id) REFERENCES place_activity (place_activity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE source_record (
    source_record_id BIGINT NOT NULL AUTO_INCREMENT,
    place_id BIGINT NOT NULL,
    type VARCHAR(50) NULL,
    origin_id VARCHAR(50) NULL,
    url VARCHAR(100) NULL,
    verified_fields VARCHAR(50) NULL,
    origin_updated_at DATETIME NULL,
    verified_at DATETIME NULL,
    verifier_id BIGINT NULL,
    usage_terms_memo TEXT NULL,
    PRIMARY KEY (source_record_id),
    CONSTRAINT uk_source_record_place UNIQUE (source_record_id, place_id),
    CONSTRAINT fk_source_record_place FOREIGN KEY (place_id) REFERENCES place (place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE place_notice (
    place_notice_id BIGINT NOT NULL AUTO_INCREMENT,
    place_id BIGINT NOT NULL,
    source_record_id BIGINT NOT NULL,
    title VARCHAR(50) NULL,
    content TEXT NULL,
    priority VARCHAR(10) NULL,
    valid_from DATETIME NULL,
    valid_until DATETIME NULL,
    publish_status TINYINT NULL,
    PRIMARY KEY (place_notice_id),
    KEY ix_place_notice_publish_validity (place_id, publish_status, valid_from, valid_until),
    CONSTRAINT fk_place_notice_place FOREIGN KEY (place_id) REFERENCES place (place_id),
    -- 다른 장소의 출처를 공지에 연결하지 못하도록 장소 ID도 함께 검증한다.
    CONSTRAINT fk_place_notice_source FOREIGN KEY (source_record_id, place_id)
        REFERENCES source_record (source_record_id, place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
