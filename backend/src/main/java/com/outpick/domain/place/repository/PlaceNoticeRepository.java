package com.outpick.domain.place.repository;

import com.outpick.domain.place.entity.PlaceNotice;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;

import java.util.Optional;

public interface PlaceNoticeRepository extends JpaRepository<PlaceNotice, Long> {
    @EntityGraph(attributePaths = "sourceRecord")
    Page<PlaceNotice> findAllByPlaceIdOrderByIdDesc(long placeId, Pageable pageable);

    /** 초안 수정 중 같은 공지에 대한 쓰기 요청을 직렬화합니다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<PlaceNotice> findByIdAndPlaceId(long id, long placeId);
}
