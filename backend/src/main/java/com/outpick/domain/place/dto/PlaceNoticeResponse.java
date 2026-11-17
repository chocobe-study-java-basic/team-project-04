package com.outpick.domain.place.dto;

import java.time.LocalDateTime;

public record PlaceNoticeResponse(Long placeNoticeId, String title, String content, String priority,
                                  LocalDateTime validFrom, LocalDateTime validUntil, Long sourceRecordId) {
}
