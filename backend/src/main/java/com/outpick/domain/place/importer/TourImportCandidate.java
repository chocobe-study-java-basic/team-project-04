package com.outpick.domain.place.importer;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record TourImportCandidate(TourImportTarget target, String name, String description, String address,
                                   BigDecimal latitude, BigDecimal longitude, String homepage,
                                   String regionCode, String regionName, String districtCode, String districtName,
                                   LocalDateTime originUpdatedAt, String imageCopyrightCode) {
}
