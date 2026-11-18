-- 수집 출처 확인과 운영자의 검수를 구분한다. 기존 source_record 테이블/데이터는 변경하지 않는다.
CREATE TABLE tour_api_import (
    content_id VARCHAR(50) NOT NULL,
    place_id BIGINT NOT NULL,
    source_record_id BIGINT NOT NULL,
    collected_at DATETIME NOT NULL,
    PRIMARY KEY (content_id),
    CONSTRAINT uk_tour_api_import_source UNIQUE (source_record_id),
    CONSTRAINT fk_tour_api_import_source FOREIGN KEY (source_record_id, place_id)
        REFERENCES source_record (source_record_id, place_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- 외부 HTTP 호출은 이 잠금 밖에서 수행한다. 짧은 저장 트랜잭션만 직렬화한다.
CREATE TABLE tour_api_import_lock (
    lock_id TINYINT NOT NULL,
    PRIMARY KEY (lock_id),
    CONSTRAINT ck_tour_api_import_lock CHECK (lock_id = 1)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
INSERT INTO tour_api_import_lock (lock_id) VALUES (1);
