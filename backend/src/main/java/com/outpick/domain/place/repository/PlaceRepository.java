package com.outpick.domain.place.repository;

import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlacePublishStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.domain.Pageable;
import java.util.List;
import java.util.Optional;

public interface PlaceRepository extends JpaRepository<Place, Long> {
    boolean existsByIdAndPublishStatus(long id, PlacePublishStatus publishStatus);
    long countByPublishStatus(PlacePublishStatus publishStatus);
    List<Place> findAllByOrderByIdDesc(Pageable pageable);

    /** 같은 장소의 작성 즉시 공개 요청을 순서대로 처리할 수 있도록 장소 행을 잠급니다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<Place> findLockedById(long id);
}
