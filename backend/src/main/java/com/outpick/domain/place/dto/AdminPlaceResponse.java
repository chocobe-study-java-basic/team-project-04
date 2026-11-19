package com.outpick.domain.place.dto;

import com.outpick.domain.place.entity.Place;

public record AdminPlaceResponse(Long id, String name, String address, String status) {
    public static AdminPlaceResponse from(Place place) {
        return new AdminPlaceResponse(place.getId(), place.getName(), place.getAddress(),
                place.getPublishStatus().name());
    }
}
