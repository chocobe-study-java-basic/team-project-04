package com.outpick.domain.review.repository;

import com.outpick.domain.review.entity.ReviewReport;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ReviewReportRepository extends JpaRepository<ReviewReport, Long> {
    boolean existsByReviewIdAndReporterId(long reviewId, long reporterId);
    @EntityGraph(attributePaths = {"review", "review.place"})
    List<ReviewReport> findByStatusOrderByCreatedAtAscIdAsc(String status);
    List<ReviewReport> findByReviewIdAndStatus(long reviewId, String status);
}
