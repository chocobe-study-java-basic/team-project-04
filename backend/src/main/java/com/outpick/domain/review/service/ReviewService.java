package com.outpick.domain.review.service;

import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.domain.review.dto.ReviewResponse;
import com.outpick.domain.review.entity.PlaceReview;
import com.outpick.domain.review.exception.ReviewErrorCode;
import com.outpick.domain.review.repository.PlaceReviewRepository;
import com.outpick.global.error.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {
    private final PlaceReviewRepository reviews;
    private final PlaceRepository places;
    private final MemberService members;

    public List<ReviewResponse> list(long placeId) {
        publishedPlace(placeId);
        return reviews.findByPlaceIdAndStatusOrderByCreatedAtDescIdDesc(placeId, "PUBLIC")
                .stream().map(ReviewResponse::from).toList();
    }

    @Transactional
    public ReviewResponse create(long placeId, long memberId, String body) {
        var place = publishedPlace(placeId);
        var member = members.findActiveMember(memberId);
        return ReviewResponse.from(reviews.saveAndFlush(new PlaceReview(place, member, body.trim())));
    }

    @Transactional
    public ReviewResponse update(long reviewId, long memberId, String body) {
        var review = publicReview(reviewId);
        requireAuthor(review, memberId);
        review.changeBody(body.trim());
        reviews.flush();
        return ReviewResponse.from(review);
    }

    @Transactional
    public void delete(long reviewId, long memberId) {
        var review = publicReview(reviewId);
        requireAuthor(review, memberId);
        reviews.delete(review);
    }

    private com.outpick.domain.place.entity.Place publishedPlace(long placeId) {
        var place = places.findById(placeId).orElseThrow(() ->
                new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode()));
        if (place.getPublishStatus() != PlacePublishStatus.PUBLISHED) {
            throw new BusinessException(PlaceErrorCode.PLACE_NOT_FOUND.getErrorCode());
        }
        return place;
    }

    private PlaceReview publicReview(long reviewId) {
        var review = reviews.findById(reviewId).orElseThrow(() ->
                new BusinessException(ReviewErrorCode.REVIEW_NOT_FOUND.getErrorCode()));
        if (!"PUBLIC".equals(review.getStatus()) || review.getPlace().getPublishStatus() != PlacePublishStatus.PUBLISHED) {
            throw new BusinessException(ReviewErrorCode.REVIEW_NOT_FOUND.getErrorCode());
        }
        return review;
    }

    private void requireAuthor(PlaceReview review, long memberId) {
        if (!review.getAuthor().getId().equals(memberId)) {
            throw new BusinessException(ReviewErrorCode.REVIEW_FORBIDDEN.getErrorCode());
        }
    }

}
