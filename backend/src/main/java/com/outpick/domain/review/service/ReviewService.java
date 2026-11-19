package com.outpick.domain.review.service;

import com.outpick.domain.member.entity.MemberRole;
import com.outpick.domain.member.service.MemberService;
import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.place.exception.PlaceErrorCode;
import com.outpick.domain.place.repository.PlaceRepository;
import com.outpick.domain.review.dto.ReviewResponse;
import com.outpick.domain.review.dto.ReviewReportResponse;
import com.outpick.domain.review.entity.PlaceReview;
import com.outpick.domain.review.entity.ReviewReport;
import com.outpick.domain.review.exception.ReviewErrorCode;
import com.outpick.domain.review.repository.PlaceReviewRepository;
import com.outpick.domain.review.repository.ReviewReportRepository;
import com.outpick.domain.review.repository.ReviewPhotoStore;
import com.outpick.global.error.BusinessException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.hibernate.exception.ConstraintViolationException;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewService {
    private final PlaceReviewRepository reviews;
    private final ReviewReportRepository reports;
    private final ReviewPhotoStore photoStore;
    private final PlaceRepository places;
    private final MemberService members;

    public List<ReviewResponse> list(long placeId) {
        publishedPlace(placeId);
        var found = reviews.findByPlaceIdAndPublishStatusOrderByCreatedAtDescIdDesc(placeId, (byte) 1);
        var photos = photoStore.photosForReviews(found.stream().map(PlaceReview::getId).toList());
        return found.stream().map(review -> ReviewResponse.from(review,
                photos.getOrDefault(review.getId(), List.of()))).toList();
    }

    @Transactional
    public ReviewResponse create(long placeId, long memberId, String body) {
        var place = publishedPlace(placeId);
        var member = members.findActiveMember(memberId);
        return ReviewResponse.from(reviews.saveAndFlush(new PlaceReview(place, member, body.trim())), List.of());
    }

    @Transactional
    public ReviewResponse update(long reviewId, long memberId, String body) {
        var review = publicReview(reviewId);
        requireAuthor(review, memberId);
        review.changeBody(body.trim());
        reviews.flush();
        return ReviewResponse.from(review, photoStore.photosFor(reviewId));
    }

    @Transactional
    public void delete(long reviewId, long memberId) {
        var review = publicReview(reviewId);
        requireAuthor(review, memberId);
        photoStore.deleteAssetsForReview(reviewId);
        reviews.delete(review);
    }

    @Transactional
    public ReviewReportResponse report(long reviewId, long memberId, String reason) {
        var review = publicReview(reviewId);
        var member = members.findActiveMember(memberId);
        if (reports.existsByReviewIdAndReporterId(reviewId, memberId)) {
            throw new BusinessException(ReviewErrorCode.REPORT_ALREADY_EXISTS.getErrorCode());
        }
        try {
            return ReviewReportResponse.from(reports.saveAndFlush(new ReviewReport(review, member, reason.trim())));
        } catch (DataIntegrityViolationException exception) {
            if (exception.getCause() instanceof ConstraintViolationException violation
                    && violation.getErrorCode() == 1062
                    && violation.getConstraintName() != null
                    && (violation.getConstraintName().equals("uk_review_reporter")
                    || violation.getConstraintName().endsWith(".uk_review_reporter"))) {
                throw new BusinessException(ReviewErrorCode.REPORT_ALREADY_EXISTS.getErrorCode());
            }
            throw exception;
        }
    }

    public List<ReviewReportResponse> pendingReports(long adminId) {
        requireAdmin(adminId);
        return reports.findByStatusOrderByCreatedAtAscIdAsc("PENDING")
                .stream().map(ReviewReportResponse::from).toList();
    }

    @Transactional
    public void hide(long reviewId, long adminId) {
        var admin = requireAdmin(adminId);
        var review = publicReview(reviewId);
        review.hide();
        reports.findByReviewIdAndStatus(reviewId, "PENDING").forEach(report -> report.resolve("APPROVED", admin));
    }

    @Transactional
    public void dismiss(long reportId, long adminId) {
        var admin = requireAdmin(adminId);
        var report = reports.findById(reportId).orElseThrow(() ->
                new BusinessException(ReviewErrorCode.REPORT_NOT_FOUND.getErrorCode()));
        if (!"PENDING".equals(report.getStatus())) {
            throw new BusinessException(ReviewErrorCode.REPORT_NOT_FOUND.getErrorCode());
        }
        report.resolve("REJECTED", admin);
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
        if (review.getPublishStatus() != 1 || review.getPlace().getPublishStatus() != PlacePublishStatus.PUBLISHED) {
            throw new BusinessException(ReviewErrorCode.REVIEW_NOT_FOUND.getErrorCode());
        }
        return review;
    }

    private void requireAuthor(PlaceReview review, long memberId) {
        if (!review.getAuthor().getId().equals(memberId)) {
            throw new BusinessException(ReviewErrorCode.REVIEW_FORBIDDEN.getErrorCode());
        }
    }

    private com.outpick.domain.member.entity.Member requireAdmin(long memberId) {
        var member = members.findActiveMember(memberId);
        if (member.getRole() != MemberRole.ADMIN) {
            throw new BusinessException(ReviewErrorCode.ADMIN_REQUIRED.getErrorCode());
        }
        return member;
    }

}
