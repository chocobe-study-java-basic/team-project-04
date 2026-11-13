package com.outpick.domain.place.dto;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;

import java.math.BigDecimal;
import java.util.List;

public record PlaceSearchRequest(
        @Size(max = 100) String query,
        @Positive Long regionId,
        @Size(max = 50) List<@NotNull @Positive Long> activityTypeIds,
        @Size(max = 10) String season,
        @Size(max = 10) String environmentType,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal south,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal west,
        @DecimalMin("-90") @DecimalMax("90") BigDecimal north,
        @DecimalMin("-180") @DecimalMax("180") BigDecimal east,
        @Schema(defaultValue = "0") @Min(0) @Max(1000000) Integer page,
        @Schema(defaultValue = "20") @Min(1) @Max(50) Integer size,
        @Schema(defaultValue = "name", allowableValues = {"name", "name-desc"})
        @Pattern(regexp = "name|name-desc", message = "정렬은 name 또는 name-desc여야 합니다.") String sort
) {
    public PlaceSearchRequest {
        query = trimmedOrNull(query);
        season = trimmedOrNull(season);
        environmentType = trimmedOrNull(environmentType);
        activityTypeIds = activityTypeIds == null ? List.of() : activityTypeIds.stream().toList();
        page = page == null ? 0 : page;
        size = size == null ? 20 : size;
        sort = sort == null ? "name" : sort;
    }

    @Schema(hidden = true)
    @AssertTrue(message = "지도 좌표는 south, west, north, east를 모두 입력하고 남서쪽이 북동쪽보다 작거나 같아야 합니다.")
    public boolean isBoundsValid() {
        if (south == null && west == null && north == null && east == null) return true;
        return south != null && west != null && north != null && east != null
                && south.compareTo(north) <= 0 && west.compareTo(east) <= 0;
    }

    private static String trimmedOrNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
