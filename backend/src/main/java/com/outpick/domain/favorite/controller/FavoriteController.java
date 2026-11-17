package com.outpick.domain.favorite.controller;

import com.outpick.domain.favorite.service.FavoriteService;
import com.outpick.domain.place.dto.PlaceSummaryResponse;
import jakarta.validation.constraints.Positive;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/members/me/favorites")
@RequiredArgsConstructor
public class FavoriteController {
    private final FavoriteService favoriteService;

    @GetMapping
    public List<PlaceSummaryResponse> findMyFavorites(Authentication authentication) {
        return favoriteService.findPlaces((Long) authentication.getPrincipal());
    }

    @PutMapping("/{placeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void save(Authentication authentication,
                     @PathVariable("placeId") @Positive(message = "장소 ID는 1 이상이어야 합니다.") long placeId) {
        favoriteService.save((Long) authentication.getPrincipal(), placeId);
    }

    @DeleteMapping("/{placeId}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void remove(Authentication authentication,
                       @PathVariable("placeId") @Positive(message = "장소 ID는 1 이상이어야 합니다.") long placeId) {
        favoriteService.remove((Long) authentication.getPrincipal(), placeId);
    }
}
