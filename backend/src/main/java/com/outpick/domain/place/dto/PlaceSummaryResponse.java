package com.outpick.domain.place.dto;

import java.math.BigDecimal;

public record PlaceSummaryResponse(Long id, String name, String address, BigDecimal latitude, BigDecimal longitude,
                                   String representativeImage, String imageAttribution, String imageSourceUrl, String imageLicense) {
    // 사진 정보를 조회하지 않는 기존 JPQL 생성자 프로젝션과 호환한다.
    public PlaceSummaryResponse(Long id, String name, String address, BigDecimal latitude, BigDecimal longitude) {
        this(id, name, address, latitude, longitude, null, null, null, null);
    }
}
