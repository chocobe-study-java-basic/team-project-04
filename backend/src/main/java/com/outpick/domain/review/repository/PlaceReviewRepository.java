package com.outpick.domain.review.repository;

import com.outpick.domain.review.entity.PlaceReview;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface PlaceReviewRepository extends JpaRepository<PlaceReview, Long> {
    @EntityGraph(attributePaths = "author")
    List<PlaceReview> findByPlaceIdAndStatusOrderByCreatedAtDescIdDesc(long placeId, String status);
}
