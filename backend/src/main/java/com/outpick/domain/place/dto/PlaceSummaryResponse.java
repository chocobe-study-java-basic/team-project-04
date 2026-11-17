package com.outpick.domain.place.dto;

import java.math.BigDecimal;

public record PlaceSummaryResponse(Long id, String name, String address, BigDecimal latitude, BigDecimal longitude) {
}
