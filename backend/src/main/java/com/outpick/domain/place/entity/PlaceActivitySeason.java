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

import java.time.LocalDateTime;
import java.util.Objects;

@Entity
@Table(name = "place_activity_season")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceActivitySeason {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_season_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_activity_id", nullable = false)
    private PlaceActivity placeActivity;

    @Column(name = "season", nullable = false, length = 10)
    private String season;

    @Column(name = "created_at", nullable = false, columnDefinition = "DATETIME", insertable = false, updatable = false)
    private LocalDateTime createdAt;

    @Builder
    public PlaceActivitySeason(PlaceActivity placeActivity, String season) {
        this.placeActivity = Objects.requireNonNull(placeActivity, "placeActivity");
        this.season = Objects.requireNonNull(season, "season");
    }
}
