package com.outpick.domain.place.entity;

import jakarta.persistence.*;
import lombok.AccessLevel;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.net.URI;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "place_representative_image")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceRepresentativeImage {
    @Id @Column(name = "place_id")
    private Long placeId;
    @MapsId @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id")
    private Place place;
    @Column(nullable = false, length = 1000)
    private String url;
    @Column(nullable = false, length = 500)
    private String attribution;
    @Column(name = "source_url", nullable = false, length = 1000)
    private String sourceUrl;
    @Column(name = "license_type", nullable = false, length = 10)
    private String licenseType;
    @Column(name = "verified_at", nullable = false, columnDefinition = "DATETIME")
    private LocalDateTime verifiedAt;

    public PlaceRepresentativeImage(Place place, String url, String attribution, String sourceUrl,
                                    String licenseType, LocalDateTime verifiedAt) {
        this.place = Objects.requireNonNull(place, "place");
        if (!isTourImageUrl(url) || attribution == null || attribution.isBlank() || attribution.length() > 500
                || sourceUrl == null || sourceUrl.length() > 1000 || !isHttpsUrl(sourceUrl)
                || !("Type1".equals(licenseType) || "Type3".equals(licenseType)))
            throw new IllegalArgumentException("대표 사진의 URL·출처·이용조건을 확인해 주세요.");
        this.url = url;
        this.attribution = attribution;
        this.sourceUrl = sourceUrl;
        this.licenseType = licenseType;
        this.verifiedAt = Objects.requireNonNull(verifiedAt, "verifiedAt");
        place.attachRepresentativeImage(this);
    }

    private static boolean isTourImageUrl(String value) {
        try {
            var uri = URI.create(value);
            return value.length() <= 1000 && isHttpsUrl(value) && "tong.visitkorea.or.kr".equals(uri.getHost())
                    && uri.getRawQuery() == null && uri.getRawFragment() == null
                    && uri.getPath().matches("(?i)/cms/resource/[0-9]+/[a-z0-9_\\-]+\\.(jpg|jpeg|png|webp|gif)");
        } catch (RuntimeException exception) { return false; }
    }

    private static boolean isHttpsUrl(String value) {
        try {
            var uri = URI.create(value);
            return "https".equals(uri.getScheme()) && uri.getHost() != null && uri.getUserInfo() == null
                    && (uri.getPort() == -1 || uri.getPort() == 443);
        } catch (RuntimeException exception) { return false; }
    }
}
