package com.outpick.domain.review.repository;

import com.outpick.domain.review.dto.ReviewPhotoResponse;
import com.outpick.domain.review.exception.ReviewErrorCode;
import com.outpick.global.error.BusinessException;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.jdbc.core.simple.SimpleJdbcInsert;
import org.springframework.stereotype.Repository;

@Repository
@RequiredArgsConstructor
public class ReviewPhotoStore {
    private final JdbcTemplate jdbc;
    private final NamedParameterJdbcTemplate namedJdbc;

    public List<ReviewPhotoResponse> photosFor(long reviewId) {
        return jdbc.query("""
                SELECT ma.media_asset_id, ri.width, ri.height
                FROM review_media rm
                JOIN media_asset ma ON ma.media_asset_id = rm.media_asset_id
                JOIN review_image ri ON ri.media_asset_id = ma.media_asset_id
                WHERE rm.review_id = ? ORDER BY rm.sort_order
                """, (rs, row) -> ReviewPhotoResponse.of(rs.getLong(1), rs.getInt(2), rs.getInt(3)), reviewId);
    }

    public Map<Long, List<ReviewPhotoResponse>> photosForReviews(List<Long> reviewIds) {
        if (reviewIds.isEmpty()) return Map.of();
        return namedJdbc.query("""
                SELECT rm.review_id, ma.media_asset_id, ri.width, ri.height
                FROM review_media rm
                JOIN media_asset ma ON ma.media_asset_id = rm.media_asset_id
                JOIN review_image ri ON ri.media_asset_id = ma.media_asset_id
                WHERE rm.review_id IN (:ids) ORDER BY rm.review_id, rm.sort_order
                """, new MapSqlParameterSource("ids", reviewIds), (rs, row) ->
                Map.entry(rs.getLong(1), ReviewPhotoResponse.of(rs.getLong(2), rs.getInt(3), rs.getInt(4))))
                .stream().collect(Collectors.groupingBy(Map.Entry::getKey,
                        Collectors.mapping(Map.Entry::getValue, Collectors.toList())));
    }

    public int countFor(long reviewId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM review_media WHERE review_id = ?", Integer.class, reviewId);
    }

    public ReviewPhotoResponse save(long reviewId, long uploaderId, String contentType,
                                    int width, int height, byte[] bytes) {
        int sortOrder = jdbc.queryForObject("SELECT COALESCE(MAX(sort_order), -1) + 1 FROM review_media WHERE review_id = ?",
                Integer.class, reviewId);
        long assetId = new SimpleJdbcInsert(jdbc).withTableName("media_asset")
                .usingGeneratedKeyColumns("media_asset_id")
                .executeAndReturnKey(Map.of("media_type", "review_image", "verification_status", "VERIFIED",
                        "uploaded_by", uploaderId, "storage_key", UUID.randomUUID().toString(),
                        "created_at", LocalDateTime.now())).longValue();
        jdbc.update("INSERT INTO review_image (media_asset_id, width, height, content_type) VALUES (?, ?, ?, ?)",
                assetId, width, height, contentType);
        jdbc.update("INSERT INTO review_image_data (media_asset_id, image_bytes) VALUES (?, ?)", assetId, bytes);
        jdbc.update("INSERT INTO review_media (media_asset_id, review_id, sort_order) VALUES (?, ?, ?)",
                assetId, reviewId, sortOrder);
        return ReviewPhotoResponse.of(assetId, width, height);
    }

    public PhotoBytes publicPhoto(long assetId) {
        return jdbc.query("""
                SELECT ri.content_type, rid.image_bytes
                FROM review_image ri
                JOIN review_image_data rid ON rid.media_asset_id = ri.media_asset_id
                JOIN review_media rm ON rm.media_asset_id = ri.media_asset_id
                JOIN review r ON r.review_id = rm.review_id
                JOIN place p ON p.place_id = r.place_id
                WHERE ri.media_asset_id = ? AND r.publish_status = 1 AND p.publish_status = 1
                """, rs -> {
                    if (!rs.next()) throw new BusinessException(ReviewErrorCode.PHOTO_NOT_FOUND.getErrorCode());
                    return new PhotoBytes(rs.getString(1), rs.getBytes(2));
                }, assetId);
    }

    public boolean belongsTo(long reviewId, long assetId) {
        return jdbc.queryForObject("SELECT COUNT(*) FROM review_media WHERE review_id = ? AND media_asset_id = ?",
                Integer.class, reviewId, assetId) > 0;
    }

    public void deleteAsset(long assetId) {
        jdbc.update("DELETE FROM media_asset WHERE media_asset_id = ?", assetId);
    }

    public void deleteAssetsForReview(long reviewId) {
        var ids = jdbc.queryForList("SELECT media_asset_id FROM review_media WHERE review_id = ?", Long.class, reviewId);
        ids.forEach(this::deleteAsset);
    }

    public record PhotoBytes(String contentType, byte[] bytes) {}
}
