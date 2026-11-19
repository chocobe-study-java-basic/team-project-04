package com.outpick.domain.review.entity;

import com.outpick.domain.member.entity.Member;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;

@Entity
@Table(name = "review_report")
@Getter
public class ReviewReport {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "review_report_id") private Long id;
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "review_id") private PlaceReview review;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id") private Member reporter;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "processor_id") private Member processor;
    @Column(nullable = false, columnDefinition = "TEXT") private String reason;
    @Column(name = "process_status", nullable = false, length = 20) private String status = "PENDING";
    @Column(name = "created_at", nullable = false) private LocalDateTime createdAt;

    protected ReviewReport() {}
    public ReviewReport(PlaceReview review, Member reporter, String reason) {
        this.review = review;
        this.reporter = reporter;
        this.reason = reason;
    }
    @PrePersist void created() { createdAt = LocalDateTime.now(); }
    public void resolve(String resolution, Member processor) { status = resolution; this.processor = processor; }
}
