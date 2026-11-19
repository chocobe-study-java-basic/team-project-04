package com.outpick.domain.review.service;

import com.outpick.domain.place.entity.PlacePublishStatus;
import com.outpick.domain.review.dto.ReviewPhotoResponse;
import com.outpick.domain.review.entity.PlaceReview;
import com.outpick.domain.review.exception.ReviewErrorCode;
import com.outpick.domain.review.repository.PlaceReviewRepository;
import com.outpick.domain.review.repository.ReviewPhotoStore;
import com.outpick.global.error.BusinessException;
import java.io.ByteArrayInputStream;
import java.io.IOException;
import javax.imageio.ImageIO;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReviewPhotoService {
    private static final long MAX_BYTES = 5L * 1024 * 1024;
    private final PlaceReviewRepository reviews;
    private final ReviewPhotoStore photos;
    private final JdbcTemplate jdbc;

    @Transactional
    public ReviewPhotoResponse upload(long reviewId, long memberId, MultipartFile file) {
        var review = authorReview(reviewId, memberId);
        jdbc.queryForObject("SELECT review_id FROM review WHERE review_id = ? FOR UPDATE", Long.class, review.getId());
        if (photos.countFor(reviewId) >= 3) {
            throw new BusinessException(ReviewErrorCode.PHOTO_LIMIT.getErrorCode());
        }
        if (file == null || file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new BusinessException(ReviewErrorCode.INVALID_PHOTO.getErrorCode());
        }
        try {
            byte[] bytes = file.getBytes();
            if (bytes.length == 0 || bytes.length > MAX_BYTES) throw invalidPhoto();
            try (var input = ImageIO.createImageInputStream(new ByteArrayInputStream(bytes))) {
                if (input == null) throw invalidPhoto();
                var readers = ImageIO.getImageReaders(input);
                if (!readers.hasNext()) throw invalidPhoto();
                var reader = readers.next();
                try {
                    reader.setInput(input);
                    String format = reader.getFormatName();
                    String contentType = switch (format.toLowerCase(java.util.Locale.ROOT)) {
                        case "jpeg", "jpg" -> "image/jpeg";
                        case "png" -> "image/png";
                        default -> throw invalidPhoto();
                    };
                    int width = reader.getWidth(0);
                    int height = reader.getHeight(0);
                    if (width < 1 || height < 1 || width > 6000 || height > 6000
                            || (long) width * height > 36_000_000) throw invalidPhoto();
                    reader.read(0);
                    return photos.save(reviewId, memberId, contentType, width, height, bytes);
                } finally {
                    reader.dispose();
                }
            }
        } catch (IOException | IllegalArgumentException exception) {
            throw invalidPhoto();
        }
    }

    public ReviewPhotoStore.PhotoBytes publicPhoto(long assetId) {
        return photos.publicPhoto(assetId);
    }

    @Transactional
    public void delete(long reviewId, long assetId, long memberId) {
        authorReview(reviewId, memberId);
        if (!photos.belongsTo(reviewId, assetId)) {
            throw new BusinessException(ReviewErrorCode.PHOTO_NOT_FOUND.getErrorCode());
        }
        photos.deleteAsset(assetId);
    }

    private PlaceReview authorReview(long reviewId, long memberId) {
        var review = reviews.findById(reviewId).orElseThrow(() ->
                new BusinessException(ReviewErrorCode.REVIEW_NOT_FOUND.getErrorCode()));
        if (review.getPublishStatus() != 1 || review.getPlace().getPublishStatus() != PlacePublishStatus.PUBLISHED) {
            throw new BusinessException(ReviewErrorCode.REVIEW_NOT_FOUND.getErrorCode());
        }
        if (!review.getAuthor().getId().equals(memberId)) {
            throw new BusinessException(ReviewErrorCode.REVIEW_FORBIDDEN.getErrorCode());
        }
        return review;
    }

    private BusinessException invalidPhoto() {
        return new BusinessException(ReviewErrorCode.INVALID_PHOTO.getErrorCode());
    }
}
