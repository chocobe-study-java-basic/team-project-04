package com.outpick.domain.place.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.AccessLevel;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Table(name = "activity_category")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ActivityCategory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "activity_category_id")
    private Long id;

    @Column(name = "name", length = 50)
    private String name;

    @Builder
    public ActivityCategory(String name) {
        this.name = name;
    }
}
