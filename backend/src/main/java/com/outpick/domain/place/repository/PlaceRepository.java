package com.outpick.domain.place.repository;

import com.outpick.domain.place.entity.Place;
import com.outpick.domain.place.entity.PlacePublishStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.domain.Pageable;
import java.util.List;

public interface PlaceRepository extends JpaRepository<Place, Long> {
    boolean existsByIdAndPublishStatus(long id, PlacePublishStatus publishStatus);
    long countByPublishStatus(PlacePublishStatus publishStatus);
    List<Place> findAllByOrderByIdDesc(Pageable pageable);
}
