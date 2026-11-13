package com.outpick.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "place")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Place {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "place_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    @Column(name = "name", length = 50)
    private String name;

    @Column(name = "name_alias", length = 50)
    private String nameAlias;

    @Column(name = "introduce", columnDefinition = "TEXT")
    private String introduce;

    @Column(name = "address", length = 100)
    private String address;

    @Column(name = "latitude", precision = 10, scale = 7)
    private BigDecimal latitude;

    @Column(name = "longitude", precision = 10, scale = 7)
    private BigDecimal longitude;

    @Column(name = "homepage", length = 100)
    private String homepage;

    @Column(name = "publish_status")
    private Byte publishStatus;

    @Column(name = "operation_status", length = 20)
    private String operationStatus;

    @Column(name = "version", length = 20)
    private String version;

    @Column(name = "reviewed_at", columnDefinition = "DATETIME")
    private LocalDateTime reviewedAt;

    @Builder
    public Place(
            Region region,
            String name,
            String nameAlias,
            String introduce,
            String address,
            BigDecimal latitude,
            BigDecimal longitude,
            String homepage,
            Byte publishStatus,
            String operationStatus,
            String version,
            LocalDateTime reviewedAt) {
        this.region = Objects.requireNonNull(region, "region");
        this.name = name;
        this.nameAlias = nameAlias;
        this.introduce = introduce;
        this.address = address;
        this.latitude = latitude;
        this.longitude = longitude;
        this.homepage = homepage;
        this.publishStatus = publishStatus;
        this.operationStatus = operationStatus;
        this.version = version;
        this.reviewedAt = reviewedAt;
    }

    public void updateBasicInfo(String name, String introduce, String address) {
        this.name = name;
        this.introduce = introduce;
        this.address = address;
    }
}
