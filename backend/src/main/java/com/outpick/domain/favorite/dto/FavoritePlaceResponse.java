package com.outpick.domain.favorite.dto;

import com.fasterxml.jackson.annotation.JsonUnwrapped;
import com.outpick.domain.place.dto.PlaceSummaryResponse;
import com.outpick.domain.place.entity.PlacePublishStatus;

public sealed interface FavoritePlaceResponse {
    record Published(@JsonUnwrapped PlaceSummaryResponse place, boolean isNotified,
                     PlacePublishStatus publishStatus) implements FavoritePlaceResponse {
    }

    record Unavailable(Long id, String name, PlacePublishStatus publishStatus) implements FavoritePlaceResponse {
    }
}
