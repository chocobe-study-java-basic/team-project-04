package com.outpick.domain.review.dto;

import com.outpick.domain.review.entity.PlaceReview;
import java.time.LocalDateTime;

public record ReviewResponse(long id, long placeId, long authorId, String authorNickname,
                             String body, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static ReviewResponse from(PlaceReview review) {
        return new ReviewResponse(review.getId(), review.getPlace().getId(), review.getAuthor().getId(),
                review.getAuthor().getNickname(), review.getBody(), review.getCreatedAt(), review.getUpdatedAt());
    }
}
