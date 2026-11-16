package com.outpick.domain.place.importer;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Entity
@Table(name = "tour_api_import")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TourApiImportRecord {
    @Id
    @Column(name = "content_id", length = 50)
    private String contentId;
    @Column(name = "place_id", nullable = false)
    private Long placeId;
    @Column(name = "source_record_id", nullable = false)
    private Long sourceRecordId;
    @Column(name = "collected_at", nullable = false, columnDefinition = "DATETIME")
    private LocalDateTime collectedAt;

    public TourApiImportRecord(String contentId, Long placeId, Long sourceRecordId, LocalDateTime collectedAt) {
        this.contentId = contentId;
        this.placeId = placeId;
        this.sourceRecordId = sourceRecordId;
        this.collectedAt = collectedAt;
    }
}
