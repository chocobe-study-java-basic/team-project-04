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

@Entity
@Table(name = "region")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Region {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "region_id")
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @JoinColumn(name = "parent_region_id", nullable = true)
    private Region parent;

    @Column(name = "code", length = 20)
    private String code;

    @Column(name = "name", length = 50)
    private String name;

    @Builder
    public Region(Region parent, String code, String name) {
        this.parent = parent;
        this.code = code;
        this.name = name;
    }
}
