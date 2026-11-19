package com.outpick.domain.review.dto;

public record ReviewPhotoResponse(long id, String url, int width, int height) {
    public static ReviewPhotoResponse of(long id, int width, int height) {
        return new ReviewPhotoResponse(id, "/api/v1/review-photos/" + id, width, height);
    }
}
