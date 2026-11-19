package com.outpick.domain.review.controller;

import com.outpick.domain.member.security.MemberSessionPrincipal;
import com.outpick.domain.review.dto.ReviewRequest;
import com.outpick.domain.review.dto.ReviewResponse;
import com.outpick.domain.review.service.ReviewService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Positive;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
public class ReviewController {
    private final ReviewService reviews;

    @GetMapping("/places/{placeId}/reviews")
    public List<ReviewResponse> list(@PathVariable @Positive long placeId) {
        return reviews.list(placeId);
    }

    @PostMapping("/places/{placeId}/reviews")
    @ResponseStatus(HttpStatus.CREATED)
    public ReviewResponse create(@PathVariable @Positive long placeId,
                                 @Valid @RequestBody ReviewRequest request, Authentication authentication) {
        return reviews.create(placeId, memberId(authentication), request.body());
    }

    @PutMapping("/reviews/{reviewId}")
    public ReviewResponse update(@PathVariable @Positive long reviewId,
                                 @Valid @RequestBody ReviewRequest request, Authentication authentication) {
        return reviews.update(reviewId, memberId(authentication), request.body());
    }

    @DeleteMapping("/reviews/{reviewId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void delete(@PathVariable @Positive long reviewId, Authentication authentication) {
        reviews.delete(reviewId, memberId(authentication));
    }

    private long memberId(Authentication authentication) {
        return ((MemberSessionPrincipal) authentication.getPrincipal()).memberId();
    }
}
