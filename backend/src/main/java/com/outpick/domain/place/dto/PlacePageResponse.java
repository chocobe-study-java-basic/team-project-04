package com.outpick.domain.place.dto;

import java.util.List;

public record PlacePageResponse(List<PlaceSummaryResponse> items, int page, int size, long totalElements) {
    public PlacePageResponse {
        items = List.copyOf(items);
    }
}
