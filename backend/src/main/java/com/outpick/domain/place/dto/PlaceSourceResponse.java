package com.outpick.domain.place.dto;

import java.time.LocalDateTime;

public record PlaceSourceResponse(Long sourceRecordId, String type, String url, String verifiedFields,
                                  LocalDateTime originUpdatedAt, LocalDateTime verifiedAt) {
}
