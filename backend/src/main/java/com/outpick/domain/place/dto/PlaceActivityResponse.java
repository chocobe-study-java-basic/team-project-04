package com.outpick.domain.place.dto;

import java.util.List;

public record PlaceActivityResponse(Long placeActivityId, Long activityTypeId, String activityTypeName,
                                    String environmentType, List<String> seasons) {
    public PlaceActivityResponse {
        seasons = List.copyOf(seasons);
    }
}
