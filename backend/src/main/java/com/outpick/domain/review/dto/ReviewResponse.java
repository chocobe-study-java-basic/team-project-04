package com.outpick.domain.review.dto;

import com.outpick.domain.review.entity.PlaceReview;
import java.time.LocalDateTime;
import java.util.List;

public record ReviewResponse(long id, long placeId, long authorId, String authorNickname,
                             String body, LocalDateTime createdAt, LocalDateTime updatedAt,
                             List<ReviewPhotoResponse> photos) {
    public static ReviewResponse from(PlaceReview review, List<ReviewPhotoResponse> photos) {
        return new ReviewResponse(review.getId(), review.getPlace().getId(), review.getAuthor().getId(),
                review.getAuthor().getNickname(), review.getBody(), review.getCreatedAt(), review.getUpdatedAt(), photos);
    }
}
