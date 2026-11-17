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

import java.util.Objects;

@Entity
@Table(name = "place_activity")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlaceActivity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "place_activity_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private Place place;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_type_id", nullable = false)
    private ActivityType activityType;

    @Column(name = "environment_type", length = 10)
    private String environmentType;

    @Builder
    public PlaceActivity(Place place, ActivityType activityType, String environmentType) {
        this.place = Objects.requireNonNull(place, "place");
        this.activityType = Objects.requireNonNull(activityType, "activityType");
        this.environmentType = environmentType;
    }
}
