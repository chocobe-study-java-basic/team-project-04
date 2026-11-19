package com.outpick.domain.review.entity;

import com.outpick.domain.member.entity.Member;
import com.outpick.domain.place.entity.Place;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;

@Entity
@Table(name = "place_review")
@Getter
public class PlaceReview {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_id") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id") private Place place;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id") private Member author;
    @Column(nullable = false, length = 2000) private String body;
    @Column(nullable = false, length = 20) private String status = "PUBLIC";
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;
    @Column(name = "updated_at", nullable = false) private LocalDateTime updatedAt;

    protected PlaceReview() {}
    public PlaceReview(Place place, Member author, String body) {
        this.place = place;
        this.author = author;
        this.body = body;
    }
    @PrePersist void created() { createdAt = LocalDateTime.now(); updatedAt = createdAt; }
    @PreUpdate void updated() { updatedAt = LocalDateTime.now(); }
    public void changeBody(String body) { this.body = body; }
    public void hide() { this.status = "HIDDEN"; }
}
