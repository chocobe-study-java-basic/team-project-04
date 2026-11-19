package com.outpick.domain.place.dto;

import java.math.BigDecimal;

public record PlaceSummaryResponse(Long id, String name, String address, BigDecimal latitude, BigDecimal longitude,
                                   String representativeImage, String imageAttribution, String imageSourceUrl, String imageLicense) {
}
