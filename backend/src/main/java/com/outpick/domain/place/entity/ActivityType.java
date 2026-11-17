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
@Table(name = "activity_type")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActivityType {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_type_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "activity_category_id", nullable = false)
    private ActivityCategory category;

    @Column(name = "name", length = 50)
    private String name;

    @Builder
    public ActivityType(ActivityCategory category, String name) {
        this.category = Objects.requireNonNull(category, "category");
        this.name = name;
    }
}
