package com.outpick.domain.review.dto;

import com.outpick.domain.review.entity.ReviewReport;
import java.time.LocalDateTime;

public record ReviewReportResponse(long id, long reviewId, long placeId, String reviewBody,
                                   String reason, String status, LocalDateTime createdAt) {
    public static ReviewReportResponse from(ReviewReport report) {
        return new ReviewReportResponse(report.getId(), report.getReview().getId(),
                report.getReview().getPlace().getId(), report.getReview().getBody(),
                report.getReason(), report.getStatus(), report.getCreatedAt());
    }
}
